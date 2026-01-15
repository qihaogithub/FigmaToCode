# 阶段5：图片资源自动上传到图床（Cloudflare Worker + R2，复制代码即可用）

## 概述

本阶段的核心目标是：**用户复制生成的代码时，图片资源也能“自动可用”**，无需用户手动下载图片并上传到自己的服务器。

实现方式：当 Tailwind 代码生成过程中检测到位图（Image fills）或矢量图（VECTOR / SVG）时，插件会导出对应资源，并调用你维护的 **Cloudflare Worker 上传接口**将资源写入 **R2**，然后在生成的代码中使用返回的 URL，替代当前的占位符与矩形降级。


## 前置条件

**必须先完成以下阶段**：
- 阶段1：删除 HTML、Flutter、SwiftUI、Compose 框架
- 阶段2：删除 Twig 功能
- 阶段3：删除 Email 功能（保留 About）
- 阶段4：UI 优化（Preview 和 Code 作为一级 Tab）

## 现状分析

### 位图处理现状

当前插件在导出 Tailwind 格式代码时，如果设计稿存在位图（Image fills），会提示 "Image fills are replaced with placeholders" 并使用占位符图片替代。

**相关代码位置：**
- `packages/backend/src/tailwind/tailwindMain.ts`（位图检测/警告/占位符逻辑）
- `packages/backend/src/common/images.ts`（图片导出与占位符）

### 矢量图处理现状

当前插件在导出 Tailwind 格式代码时，如果设计稿存在矢量图（VECTOR 节点），会提示 "Vector is not supported"，并被转换为简单的矩形。

**相关代码位置：**
- `packages/backend/src/tailwind/tailwindMain.ts`（VECTOR 警告与降级）
- `packages/backend/src/altNodes/altNodeUtils.ts`（导出 SVG 的能力，当前主要用于 `embedVectors`）

## 功能目标

1. **自动上传位图**：检测到位图 fill 时，导出 PNG（或 WebP/PNG，先以 PNG 为准），上传到 R2
2. **自动上传矢量图**：检测到 VECTOR 节点时，导出 SVG，上传到 R2
3. **生成可直接访问的 URL**：在生成的 Tailwind 代码中直接写入 `https://...` URL
4. **用户零配置**：插件默认内置 Worker 上传端点，不要求用户填写 Token
5. **缓存优化**：相同资源只上传一次（基于内容 hash），减少重复上传和等待时间
6. **错误处理与降级**：上传失败时：
   - 位图降级为占位符
   - 矢量图降级为矩形（可选：后续再做 inline svg）

## 技术方案（仅 Cloudflare Worker + R2）

### 1. 总体架构

- **插件侧（Figma 插件）**
  - 导出图片/矢量（bytes）
  - 计算内容 hash
  - 调用 Worker 上传接口获取 URL
  - 缓存 `hash -> url`
  - 生成代码时替换 `src` 或 `bg-[url(...)]`

- **Worker 侧（你部署）**
  - 校验请求（防滥用）
  - 写入 R2（key 基于 hash）
  - 返回公开可访问 URL

> 关键原则：
> - **R2 的密钥只存在 Worker 环境变量**，插件端不持有任何密钥。

### 2. 插件设置（建议最小化）

在 `PluginSettings` 中新增一个更通用的资源上传设置（名称可调整）：

```ts
interface AssetUploadSettings {
  enableAssetUpload: boolean; // 是否启用“自动上传资源并写入 URL”
  uploadEndpoint: string; // 你的 Worker URL（默认写死/内置）

  // 行为配置
  cacheTTLHours: number; // 默认 24
  maxConcurrentUploads: number; // 默认 3~5

  // 生成策略
  bitmapStrategy: "upload" | "placeholder";
  vectorStrategy: "upload" | "fallback_rect";
}
```

说明：
- `uploadEndpoint` 默认值由你内置在插件里；文档层面不要求“最终用户配置”。
- 后续如果你需要在不同环境（dev/prod）切换 endpoint，可以通过构建时注入或常量区分。

### 3. 上传流程（两阶段 pipeline）

> 计划修订：避免在 `tailwindContainer()` 这类同步函数里 `await` 上传。
> 推荐做“两阶段 pipeline”，降低对现有生成函数签名的侵入。

**阶段A：扫描与收集资源**
- 遍历待转换节点，收集资源引用：
  - 位图 fills（IMAGE）
  - 矢量节点（VECTOR）
- 导出 bytes（PNG / SVG）
- 计算 hash（建议使用 WebCrypto：`crypto.subtle.digest('SHA-256', bytes)`）

**阶段B：上传与映射**
- 对未命中缓存的 hash 进行并发上传（受 `maxConcurrentUploads` 限制）
- 得到 `hash -> url` 映射

**阶段C：生成代码**
- 在代码生成阶段读取映射：
  - 位图：替换 `<img src="...">` 或 `bg-[url(...)]`
  - 矢量：替换为 `<img src="...svg">`（或按你的 Tailwind 输出约定）

### 4. Cloudflare Worker API 约定（建议最终落地版）

#### 4.1 接口

- `POST /upload`

#### 4.2 请求

推荐使用 `application/octet-stream`，由 header 携带必要元数据：

- Headers：
  - `Content-Type: application/octet-stream`
  - `X-Asset-Ext: png | svg`
  - `X-Asset-Hash: <sha256-hex>`（可选：也可由 Worker 自己算）
  - `X-Asset-Content-Type: image/png | image/svg+xml`
  - `X-Upload-Secret: <shared-secret>`（用于简单校验，防滥用）

- Body：bytes

> 如果你更偏向 form-data 也可以，但 octet-stream 更简单。

#### 4.3 响应

```json
{ "url": "https://<your-domain>/<key>", "hash": "<sha256>" }
```

#### 4.4 Worker 内部关键逻辑

- 校验：
  - 检查 `X-Upload-Secret` 是否匹配
  - 限制文件大小（例如 10MB）
  - 限制 content-type（只允许 png/svg）
- 存储：
  - R2 key 形如：`figma/<sha256>.<ext>`
  - 如果已存在则直接返回同一 URL（幂等）
- 返回：
  - 返回 public URL（可使用自定义域名 + Worker 路由，或 Worker 代理读取）

### 5. 缓存策略

- **内存缓存**：Map<hash, { url, timestamp }>
- **持久化缓存**：`figma.clientStorage` 保存 hash->url + timestamp
- **TTL**：默认 24h

说明：
- TTL 的意义：如果你未来启用了清理策略或 URL 变动，可自动重新上传/刷新。

### 6. 错误处理与降级

- 上传失败时必须：
  - 添加 Warning："资源上传失败，已降级为占位符/矩形"
  - 位图：使用现有占位符逻辑
  - 矢量：降级为矩形（保持当前行为），避免阻断整个导出

## 需要修改的文件清单（计划修订）

> 本清单只描述“需要改哪些文件”，不包含实现细节。

### 类型定义
- [ ] `packages/types/src/types.ts`：新增 `AssetUploadSettings` 并合入 `PluginSettings`

### 后端/插件代码（导出与上传）
- [ ] `packages/backend/src/common/images.ts`：
  - 新增：导出 bytes 的通用方法（位图）
  - 新增：计算 hash（WebCrypto）
  - 新增：调用 `uploadEndpoint` 的上传函数（fetch）
  - 新增：缓存读写（clientStorage）
- [ ] `packages/backend/src/altNodes/altNodeUtils.ts` 或相关位置：补齐 SVG 导出 bytes 的入口（如需要）
- [ ] `packages/backend/src/tailwind/tailwindMain.ts`：
  - 扫描/收集资源
  - 生成阶段替换 URL（或通过上游传递映射）

### UI（可选）
- [ ] `packages/plugin-ui/src/codegenPreferenceOptions.ts`：添加开关（例如“自动上传资源”）
- [ ] `packages/plugin-ui/src/components/...`：如需要展示 endpoint/状态/清理缓存按钮

### Cloudflare Worker（仓库外）
- [ ] 新建 Worker：实现 `/upload`，并绑定 R2

## 风险评估（计划修订）

### 高风险

1. **上传服务被滥用**（任何人都能调用你的 Worker 上传垃圾文件）
   - 缓解：
     - 必须校验 `X-Upload-Secret`
     - Worker 侧限流（IP/UA）
     - 限制文件大小、类型

2. **Figma 导出 API 速率限制/导出耗时**
   - 缓解：
     - 并发数控制（`maxConcurrentUploads`）
     - 先收集再上传，避免生成过程阻塞过久

### 中风险

1. **R2 成本不可控**（大量用户生成大量资源）
   - 缓解：
     - key 去重（hash）
     - Worker 侧可加最大存储/清理策略（后续）

2. **URL 可用性**
   - 缓解：
     - 使用自定义域名
     - Worker 侧统一输出 URL

### 低风险

1. **缓存失效导致重复上传**
   - 缓解：
     - R2 写入幂等（key=hash）
     - clientStorage TTL

## 实施步骤（可执行版）

### 第一阶段：准备 Cloudflare Worker + R2（0.5 天）

- [ ] 创建 R2 bucket（例如 `figma-assets`）
- [ ] 创建 Worker，并绑定 R2
- [ ] 配置 Worker 环境变量：
  - `UPLOAD_SECRET`
  - （可选）`PUBLIC_BASE_URL`（自定义域名或 Worker 路由前缀）
- [ ] 暴露接口：`POST /upload`

### 第二阶段：插件侧新增“资源上传能力”（1-2 天）

- [ ] 增加 `AssetUploadSettings`（types）
- [ ] 实现资源扫描、导出 bytes（PNG/SVG）
- [ ] hash 计算（WebCrypto）
- [ ] upload + 缓存（clientStorage）
- [ ] 生成代码时写入 URL

### 第三阶段：UI 入口（可选，0.5 天）

- [ ] 增加一个开关：启用/关闭“自动上传资源”
- [ ] 增加清理缓存入口（可选）

### 第四阶段：验证（0.5-1 天）

- [ ] 位图：image fill 的节点导出后 `<img src="...">` 或背景图 URL 正确
- [ ] 矢量：VECTOR 节点导出后 URL 正确，失败时降级矩形且不崩
- [ ] 缓存命中：重复导出不重复上传

## 预期效果

**位图：**
```html
<!-- 之前 -->
<img src="https://placehold.co/200x200" class="..." />

<!-- 之后 -->
<img src="https://your-domain/figma/<sha256>.png" class="..." />
```

**矢量图：**
```html
<!-- 之前：VECTOR 降级为矩形 -->
<div class="..." style="width: 24px; height: 24px;"></div>

<!-- 之后 -->
<img src="https://your-domain/figma/<sha256>.svg" class="..." />
```

---

**文档版本**: 1.1
**创建日期**: 2026-01-14
**最后更新**: 2026-01-15
