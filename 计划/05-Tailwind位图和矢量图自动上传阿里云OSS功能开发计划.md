# 阶段5：Tailwind 位图和矢量图自动上传阿里云 OSS 功能

## 概述

本计划旨在实现一个新功能：当检测到 Tailwind 格式代码中的位图或矢量图时，自动将图片导出并上传到阿里云 OSS，在生成的代码中使用 OSS 链接，而不是占位符或简单的矩形。

## 前置条件

**必须先完成以下阶段**：
- 阶段1：删除 HTML、Flutter、SwiftUI、Compose 框架
- 阶段2：删除 Twig 功能
- 阶段3：删除 Email 和 About 功能
- 阶段4：UI 优化（Preview 和 Code 作为一级 Tab）

## 现状分析

### 位图处理现状

当前 FigmaToCode 插件在导出 Tailwind 格式代码时，如果设计稿存在位图（Image fills），会提示 "Image fills are replaced with placeholders" 并使用占位符图片替代。

**相关代码位置：**
- `packages/backend/src/tailwind/tailwindMain.ts:283` - 位图检测和占位符生成
- `packages/backend/src/common/images.ts` - 图片导出和占位符生成

### 矢量图处理现状

当前 FigmaToCode 插件在导出 Tailwind 格式代码时，如果设计稿存在矢量图（VECTOR 节点），会提示 "Vector is not supported"，并被转换为简单的矩形。

**相关代码位置：**
- `packages/backend/src/tailwind/tailwindMain.ts:74-76` - 矢量图检测和警告
- `packages/backend/src/altNodes/iconDetection.ts` - 图标识别逻辑
- `packages/backend/src/altNodes/altNodeUtils.ts:64` - SVG 导出功能（仅用于 `embedVectors` 选项）

**矢量图导出能力：**
虽然插件已经具备导出 SVG 的能力（通过 `exportAsyncProxy` 的 `SVG_STRING` 格式），但该功能目前仅在 `embedVectors` 选项启用且节点可展平（`canBeFlattened`）时才使用。对于 VECTOR 节点，如果未启用 `embedVectors` 或节点不可展平，则会被忽略并转换为矩形。

## 功能目标

1. **自动上传位图**：检测到 Figma 设计中的位图填充时，自动将图片导出并上传到阿里云 OSS
2. **自动上传矢量图**：检测到 Figma 设计中的 VECTOR 节点时，自动将矢量图导出为 SVG 并上传到阿里云 OSS
3. **使用 OSS 链接**：在生成的 Tailwind 代码中，使用 OSS 的 URL 作为图片源，而不是占位符
4. **配置灵活**：允许用户在插件设置中配置阿里云 OSS 的访问凭证和存储参数
5. **缓存优化**：避免重复上传相同的图片，提高性能
6. **错误处理**：提供友好的错误提示和降级方案

## 技术方案

### 1. 阿里云 OSS 集成

#### 1.1 依赖包选择

使用阿里云官方 OSS SDK：
- `ali-oss` - 阿里云 OSS Node.js SDK

#### 1.2 OSS 配置参数

需要在插件设置中新增以下配置项：

```typescript
interface OSSSettings {
  // 基础配置
  enableOSSUpload: boolean;           // 是否启用 OSS 上传功能
  ossRegion: string;                  // OSS 区域，如 'oss-cn-hangzhou'
  ossAccessKeyId: string;             // AccessKey ID
  ossAccessKeySecret: string;         // AccessKey Secret
  ossBucket: string;                  // 存储桶名称
  ossEndpoint?: string;               // 自定义 Endpoint（可选）

  // 存储配置
  ossBasePath: string;                // 存储基础路径，如 'figma-images/'
  ossVectorPath: string;              // 矢量图存储路径，如 'figma-vectors/'
  ossFileNamePrefix?: string;         // 文件名前缀（可选）

  // 上传配置
  ossCompressionQuality: number;      // 位图压缩质量 0-1
  ossMaxFileSize: number;             // 最大文件大小（MB）
  ossAllowedFormats: string[];        // 允许的图片格式

  // 矢量图配置
  ossOptimizeSVG: boolean;            // 是否优化 SVG（移除注释、压缩路径等）
  ossInlineSmallSVG: boolean;         // 是否内联小型 SVG（小于指定尺寸）
  ossInlineThreshold: number;         // 内联阈值（字节）
}
```

#### 1.3 OSS 上传流程

**位图上传流程：**
```
1. 检测到位图填充（type === "IMAGE"）
   ↓
2. 导出图片为二进制数据（使用 Figma API，格式：PNG/JPG/WEBP）
   ↓
3. 生成唯一文件名（基于图片内容的 Hash）
   ↓
4. 检查缓存（内存缓存 + 本地存储）
   ↓
5. 如果缓存命中，直接使用缓存 URL
   ↓
6. 如果缓存未命中，上传到 OSS
   ↓
7. 获取 OSS URL 并更新缓存
   ↓
8. 在代码中使用 OSS URL（<img> 标签或 background-image）
```

**矢量图上传流程：**
```
1. 检测到 VECTOR 节点（node.type === "VECTOR"）
   ↓
2. 检查是否启用 OSS 上传功能
   ↓
3. 导出矢量图为 SVG 字符串（使用 Figma API，format: "SVG_STRING"）
   ↓
4. 将 SVG 字符串转换为 Uint8Array
   ↓
5. 生成唯一文件名（基于 SVG 内容的 Hash）
   ↓
6. 检查缓存（内存缓存 + 本地存储）
   ↓
7. 如果缓存命中，直接使用缓存 URL
   ↓
8. 如果缓存未命中，上传到 OSS
   ↓
9. 获取 OSS URL 并更新缓存
   ↓
10. 在代码中使用 OSS URL（<img> 标签）
```

### 2. 图片处理优化

#### 2.1 位图导出

使用现有的 `exportNodeAsBase64PNG` 函数逻辑，但修改为返回二进制数据而非 Base64：

```typescript
export const exportNodeAsImageBytes = async <T extends ExportableNode>(
  node: AltNode<T>,
  excludeChildren: boolean,
  format: "PNG" | "JPG" | "WEBP" = "PNG",
): Promise<Uint8Array> => {
  // 使用 exportAsyncProxy 导出图片
  const exportSettings: ExportSettingsImage = {
    format: format,
    constraint: { type: "SCALE", value: 1 },
  };
  return await exportAsyncProxy<Uint8Array>(node, exportSettings);
};
```

#### 2.2 矢量图导出

导出矢量图为 SVG 格式：

```typescript
export const exportNodeAsSVG = async <T extends SceneNode>(
  node: AltNode<T>,
): Promise<Uint8Array> => {
  // 使用 exportAsyncProxy 导出 SVG 字符串
  const svgString = await exportAsyncProxy<string>(node, {
    format: "SVG_STRING",
  });

  // 将 SVG 字符串转换为 Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(svgString);
};
```

#### 2.3 图片哈希计算

使用图片内容的 Hash 作为唯一标识，避免重复上传：

```typescript
import { createHash } from 'crypto';

export const calculateImageHash = (bytes: Uint8Array): string => {
  const hash = createHash('sha256');
  hash.update(bytes);
  return hash.digest('hex');
};
```

#### 2.4 图片压缩

在上传前进行图片压缩以节省存储空间和带宽（仅对位图有效，SVG 无需压缩）：

```typescript
export const compressImage = async (
  bytes: Uint8Array,
  quality: number,
  format: "JPEG" | "WEBP",
): Promise<Uint8Array> => {
  // 使用 sharp 或 canvas 进行压缩
  // SVG 格式不进行压缩
};
```

### 3. 缓存机制

#### 3.1 内存缓存

使用 Map 存储最近上传的图片信息：

```typescript
interface ImageCacheEntry {
  url: string;
  timestamp: number;
  size: number;
}

const imageCache = new Map<string, ImageCacheEntry>();
```

#### 3.2 本地存储缓存

使用 Figma 的客户端存储 API 持久化缓存：

```typescript
// 保存缓存
await figma.clientStorage.setAsync('imageUploadCache', cacheData);

// 读取缓存
const cachedData = await figma.clientStorage.getAsync('imageUploadCache');
```

#### 3.3 缓存策略

- **TTL（生存时间）**：24 小时后自动失效
- **LRU（最近最少使用）**：最多缓存 1000 张图片
- **大小限制**：总缓存大小不超过 50MB

### 4. UI 配置界面

#### 4.1 新增配置面板

在插件 UI 中添加 OSS 配置面板：

**文件位置**: `packages/plugin-ui/src/components/OSSSettings.tsx`

```typescript
interface OSSSettingsPanelProps {
  settings: PluginSettings;
  onSettingsChange: (settings: PluginSettings) => void;
}

export const OSSSettingsPanel: React.FC<OSSSettingsPanelProps> = ({
  settings,
  onSettingsChange,
}) => {
  // OSS 配置表单
  // - 启用/禁用开关
  // - 区域选择器
  // - AccessKey 输入框（密码显示）
  // - Bucket 输入框
  // - 基础路径输入框
  // - 压缩质量滑块
  // - 测试连接按钮
  // - 缓存管理按钮
};
```

#### 4.2 配置选项定义

**文件位置**: `packages/plugin-ui/src/codegenPreferenceOptions.ts`

```typescript
{
  itemType: "individual_select",
  propertyName: "enableOSSUpload",
  label: "启用 OSS 上传",
  description: "自动上传位图和矢量图到阿里云 OSS 并使用链接",
  isDefault: false,
  includedLanguages: ["Tailwind"],
}
```

**注意**：当启用 OSS 上传后，原有的 `embedVectors` 选项将自动失效，因为所有矢量图都会通过 OSS 上传而非嵌入为 SVG 代码。

### 5. 错误处理与降级

#### 5.1 错误类型

```typescript
enum OSSErrorType {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",    // 凭证无效
  BUCKET_NOT_FOUND = "BUCKET_NOT_FOUND",           // 存储桶不存在
  PERMISSION_DENIED = "PERMISSION_DENIED",         // 权限不足
  NETWORK_ERROR = "NETWORK_ERROR",                 // 网络错误
  FILE_TOO_LARGE = "FILE_TOO_LARGE",               // 文件过大
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",       // 不支持的格式
  SVG_EXPORT_FAILED = "SVG_EXPORT_FAILED",         // SVG 导出失败
  UNKNOWN = "UNKNOWN"                              // 未知错误
}
```

#### 5.2 降级策略

当 OSS 上传失败时，采用以下降级方案：

**位图降级策略：**
1. **首次失败**：显示警告提示 "OSS 上传失败，使用占位符图片"
2. **连续失败 3 次**：自动降级为 Base64 嵌入模式
3. **连续失败 5 次**：自动降级为占位符模式，并禁用 OSS 上传功能
4. **用户手动重试**：提供 "重试上传" 按钮

**矢量图降级策略：**
1. **首次失败**：显示警告提示 "OSS 上传失败，矢量图转换为矩形"
2. **连续失败 3 次**：自动降级为嵌入 SVG 模式（如果 `embedVectors` 为 true）
3. **连续失败 5 次**：自动降级为矩形模式，并禁用 OSS 上传功能
4. **用户手动重试**：提供 "重试上传" 按钮

#### 5.3 显示警告

在代码生成过程中，如果 OSS 上传失败，添加警告：

```typescript
// 位图上传失败
uploadToOSS(bytes, filename)
  .catch((error) => {
    addWarning(`OSS 上传失败: ${error.message}，使用占位符图片`);
    return getPlaceholderImage(width, height);
  });

// 矢量图上传失败
uploadVectorToOSS(node)
  .catch((error) => {
    addWarning(`OSS 上传失败: ${error.message}，矢量图转换为矩形`);
    // 返回矩形容器的代码
    return tailwindContainer(
      { ...node, type: "RECTANGLE" } as any,
      "",
      "",
      settings,
    );
  });
```

## 实施步骤

### 第一阶段：准备工作（1-2 天）

#### 1.1 环境准备

```bash
# 安装依赖包
pnpm add ali-oss
pnpm add -D @types/crypto-js
```

- [ ] 安装依赖包 `ali-oss`
- [ ] 安装图片处理库 `sharp`（用于压缩）
- [ ] 配置开发环境的 OSS 测试账号

#### 1.2 类型定义

- [ ] 在 `packages/types/src/types.ts` 中添加 `OSSSettings` 接口
- [ ] 在 `PluginSettings` 中集成 `OSSSettings`
- [ ] 添加错误类型定义

#### 1.3 创建测试用例

- [ ] 准备测试用的 Figma 设计稿（包含各种类型的位图）
- [ ] 准备测试用的 OSS 存储桶

### 第二阶段：核心功能开发（3-5 天）

#### 2.1 OSS 客户端封装

**文件位置**: `packages/backend/src/common/ossClient.ts`

- [ ] 实现 `OSSClient` 类
- [ ] 实现初始化方法
- [ ] 实现上传方法 `uploadImage()`（支持位图和矢量图）
- [ ] 实现 URL 获取方法 `getImageUrl()`
- [ ] 实现连接测试方法 `testConnection()`

#### 2.2 图片处理模块

**文件位置**: `packages/backend/src/common/ossImageHandler.ts`

- [ ] 实现 `exportNodeAsImageBytes()` 方法（位图导出）
- [ ] 实现 `exportNodeAsSVG()` 方法（矢量图导出）
- [ ] 实现 `calculateImageHash()` 方法
- [ ] 实现 `compressImage()` 方法
- [ ] 实现 `generateFileName()` 方法

#### 2.3 缓存管理模块

**文件位置**: `packages/backend/src/common/ossCacheManager.ts`

- [ ] 实现 `ImageCacheManager` 类
- [ ] 实现内存缓存（Map）
- [ ] 实现持久化缓存（Figma clientStorage）
- [ ] 实现缓存清理策略（TTL + LRU）
- [ ] 实现缓存统计功能

#### 2.4 修改 Tailwind 代码生成

**文件位置**: `packages/backend/src/tailwind/tailwindMain.ts`

- [ ] 在 `tailwindContainer()` 函数中检测位图填充
- [ ] 在 `convertNode()` 函数中处理 VECTOR 节点
- [ ] 调用 OSS 上传逻辑替换占位符
- [ ] 实现矢量图上传逻辑
- [ ] 更新错误处理逻辑
- [ ] 添加上传进度提示

### 第三阶段：UI 开发（2-3 天）

#### 3.1 OSS 配置面板

**文件位置**: `packages/plugin-ui/src/components/OSSSettings.tsx`

- [ ] 创建配置面板组件
- [ ] 实现表单输入（AccessKey、Bucket 等）
- [ ] 实现测试连接功能
- [ ] 实现表单验证
- [ ] 实现保存配置功能

#### 3.2 集成到主 UI

**文件位置**: `packages/plugin-ui/src/PluginUI.tsx`

- [ ] 在设置区域添加 OSS 配置入口
- [ ] 添加 OSS 配置选项到 `codegenPreferenceOptions.ts`
- [ ] 实现配置状态管理
- [ ] 添加配置提示和帮助文档链接

#### 3.3 缓存管理界面

**文件位置**: `packages/plugin-ui/src/components/OSSCachePanel.tsx`

- [ ] 显示缓存统计信息（数量、大小）
- [ ] 实现清除缓存功能
- [ ] 显示缓存列表（可选）

### 第四阶段：测试与优化（2-3 天）

#### 4.1 单元测试

- [ ] 测试 OSS 客户端上传功能（位图和矢量图）
- [ ] 测试图片哈希计算
- [ ] 测试图片压缩功能
- [ ] 测试 SVG 导出功能
- [ ] 测试缓存读写功能
- [ ] 测试错误处理逻辑

#### 4.2 集成测试

- [ ] 测试完整的上传流程（位图）
- [ ] 测试完整的上传流程（矢量图）
- [ ] 测试缓存命中场景
- [ ] 测试网络异常场景
- [ ] 测试大文件上传
- [ ] 测试并发上传
- [ ] 测试混合场景（位图 + 矢量图）

#### 4.3 真实环境测试

- [ ] 在 Figma 中测试真实设计稿
- [ ] 测试不同格式的位图（PNG、JPG、WEBP）
- [ ] 测试不同复杂度的矢量图
- [ ] 测试不同尺寸的图片
- [ ] 测试批量上传场景
- [ ] 测试缓存持久化
- [ ] 测试矢量图导出的 SVG 质量

### 第五阶段：文档与发布（1-2 天）

#### 5.1 用户文档

- [ ] 编写功能使用说明
- [ ] 编写配置指南
- [ ] 编写常见问题 FAQ
- [ ] 添加示例截图

#### 5.2 开发文档

- [ ] 更新 API 文档
- [ ] 编写架构说明
- [ ] 添加代码注释

#### 5.3 发布准备

- [ ] 更新 README
- [ ] 更新 CHANGELOG
- [ ] 准备发布说明

## 详细设计

### 1. 文件结构

```
packages/backend/src/
├── common/
│   ├── ossClient.ts           # OSS 客户端封装
│   ├── ossImageHandler.ts     # 图片处理
│   ├── ossCacheManager.ts     # 缓存管理
│   └── images.ts              # 修改：添加 OSS 相关函数
└── tailwind/
    └── tailwindMain.ts        # 修改：集成 OSS 上传

packages/plugin-ui/src/
├── components/
│   ├── OSSSettings.tsx        # OSS 配置面板
│   └── OSSCachePanel.tsx      # 缓存管理面板
├── codegenPreferenceOptions.ts # 修改：添加 OSS 配置选项
└── PluginUI.tsx               # 修改：集成 OSS 配置

packages/types/src/
└── types.ts                   # 修改：添加 OSSSettings 类型
```

### 2. 核心代码示例

#### 2.1 OSS 客户端初始化

**文件位置**: `packages/backend/src/common/ossClient.ts`

```typescript
import OSS from 'ali-oss';

export class OSSClient {
  settings: OSSSettings;
  client: OSS;

  constructor(settings: OSSSettings) {
    this.settings = settings;
    this.client = new OSS({
      region: settings.ossRegion,
      accessKeyId: settings.ossAccessKeyId,
      accessKeySecret: settings.ossAccessKeySecret,
      bucket: settings.ossBucket,
      endpoint: settings.ossEndpoint,
    });
  }

  async uploadImage(
    name: string,
    bytes: Uint8Array,
    options?: { contentType?: string }
  ): Promise<string> {
    const result = await this.client.put(name, bytes, {
      headers: {
        'Content-Type': options?.contentType || 'image/png',
      },
    });
    return result.url;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.getBucketInfo();
      return true;
    } catch (error) {
      console.error('OSS 连接测试失败:', error);
      return false;
    }
  }
}
```

#### 2.2 图片上传主流程

**文件位置**: `packages/backend/src/common/images.ts`

```typescript
import { OSSClient } from './ossClient';
import { OSSCacheManager } from './ossCacheManager';

let ossClient: OSSClient | null = null;
let cacheManager: OSSCacheManager | null = null;

export const initializeOSS = (settings: PluginSettings) => {
  if (settings.enableOSSUpload) {
    ossClient = new OSSClient(settings);
    cacheManager = new OSSCacheManager();
  }
};

// 上传位图到 OSS
export const uploadImageToOSS = async (
  node: AltNode<ExportableNode>,
  settings: PluginSettings
): Promise<string> => {
  if (!settings.enableOSSUpload || !ossClient || !cacheManager) {
    return getPlaceholderImage(node.width, node.height);
  }

  try {
    // 导出图片
    const bytes = await exportNodeAsImageBytes(node, false, 'PNG');

    // 计算哈希
    const hash = calculateImageHash(bytes);

    // 检查缓存
    const cached = cacheManager.get(hash);
    if (cached) {
      return cached.url;
    }

    // 生成文件名
    const filename = generateFileName(hash, 'png');

    // 压缩图片（可选）
    const compressedBytes = await compressImage(
      bytes,
      settings.ossCompressionQuality,
      'PNG'
    );

    // 上传到 OSS
    const url = await ossClient.uploadImage(filename, compressedBytes, {
      contentType: 'image/png',
    });

    // 更新缓存
    cacheManager.set(hash, { url, timestamp: Date.now(), size: bytes.length });

    return url;
  } catch (error) {
    addWarning(`OSS 上传失败: ${error.message}，使用占位符图片`);
    return getPlaceholderImage(node.width, node.height);
  }
};

// 上传矢量图到 OSS
export const uploadVectorToOSS = async (
  node: VectorNode,
  settings: PluginSettings
): Promise<string> => {
  if (!settings.enableOSSUpload || !ossClient || !cacheManager) {
    throw new Error('OSS 未启用或未初始化');
  }

  try {
    // 导出 SVG
    const bytes = await exportNodeAsSVG(node as AltNode<VectorNode>);

    // 计算哈希
    const hash = calculateImageHash(bytes);

    // 检查缓存
    const cached = cacheManager.get(hash);
    if (cached) {
      return cached.url;
    }

    // 生成文件名
    const filename = generateFileName(hash, 'svg');

    // 上传到 OSS（SVG 不需要压缩）
    const url = await ossClient.uploadImage(filename, bytes, {
      contentType: 'image/svg+xml',
    });

    // 更新缓存
    cacheManager.set(hash, { url, timestamp: Date.now(), size: bytes.length });

    return url;
  } catch (error) {
    addWarning(`OSS 上传失败: ${error.message}`);
    throw error;
  }
};
```

#### 2.3 修改 Tailwind 代码生成

**文件位置**: `packages/backend/src/tailwind/tailwindMain.ts`

```typescript
import { uploadImageToOSS, uploadVectorToOSS, initializeOSS } from '../common/images';

export const tailwindMain = async (
  sceneNode: Array<SceneNode>,
  settings: PluginSettings,
): Promise<string> => {
  // 初始化 OSS
  initializeOSS(settings);

  localTailwindSettings = settings;
  previousExecutionCache = [];

  let result = await tailwindWidgetGenerator(sceneNode, settings);

  if (result.startsWith("\n")) {
    result = result.slice(1);
  }

  return result;
};

const convertNode =
  (settings: TailwindSettings) =>
  async (node: SceneNode): Promise<string> => {
    // 处理矢量图（优先级高于 embedVectors）
    if (node.type === "VECTOR" && settings.enableOSSUpload) {
      try {
        const svgURL = await uploadVectorToOSS(node as VectorNode, settings);
        // 使用 img 标签引用 OSS 上的 SVG
        return `\n<img src="${svgURL}" class="${stringToClassName(node.name)}" />`;
      } catch (error) {
        // 上传失败，降级为矩形
        addWarning(`Vector upload failed: ${error.message}`);
        return tailwindContainer(
          { ...node, type: "RECTANGLE" } as any,
          "",
          "",
          settings,
        );
      }
    }

    // 原有的 embedVectors 逻辑（仅在 OSS 未启用时生效）
    if (settings.embedVectors && !settings.enableOSSUpload && (node as any).canBeFlattened) {
      const altNode = await renderAndAttachSVG(node);
      if (altNode.svg) {
        return tailwindWrapSVG(altNode, settings);
      }
    }

    switch (node.type) {
      case "RECTANGLE":
      case "ELLIPSE":
        return tailwindContainer(node, "", "", settings);
      case "GROUP":
        return tailwindGroup(node, settings);
      case "FRAME":
      case "COMPONENT":
      case "INSTANCE":
      case "COMPONENT_SET":
        return tailwindFrame(node, settings);
      case "TEXT":
        return tailwindText(node, settings);
      case "LINE":
        return tailwindLine(node, settings);
      case "SECTION":
        return tailwindSection(node, settings);
      case "VECTOR":
        // 如果 OSS 未启用，提示不支持
        if (!settings.enableOSSUpload) {
          addWarning("Vector is not supported");
        }
        return tailwindContainer(
          { ...node, type: "RECTANGLE" } as any,
          "",
          "",
          settings,
        );
      default:
        addWarning(`${node.type} node is not supported`);
    }
    return "";
  };

export const tailwindContainer = (
  node: SceneNode & MinimalFillsMixin,
  children: string,
  additionalAttr: string,
  settings: TailwindSettings,
): string => {
  // ... 省略前面的代码

  const topFill = retrieveTopFill(node.fills);

  if (topFill?.type === "IMAGE") {
    if (settings.enableOSSUpload) {
      // 使用 OSS 上传
      const imageURL = await uploadImageToOSS(node as AltNode<ExportableNode>, settings);
      addWarning("Image uploaded to OSS");

      if (!("children" in node) || node.children.length === 0) {
        tag = "img";
        src = ` src="${imageURL}"`;
      } else {
        builder.addAttributes(`bg-[url(${imageURL})]`);
      }
    } else {
      // 使用占位符
      addWarning("Image fills are replaced with placeholders");
      const imageURL = getPlaceholderImage(node.width, node.height);

      if (!("children" in node) || node.children.length === 0) {
        tag = "img";
        src = ` src="${imageURL}"`;
      } else {
        builder.addAttributes(`bg-[url(${imageURL})]`);
      }
    }
  }

  // ... 省略后面的代码
};
```

### 3. 配置界面示例

**文件位置**: `packages/plugin-ui/src/components/OSSSettings.tsx`

```typescript
import React, { useState } from 'react';
import { PluginSettings } from 'types';

interface OSSSettingsPanelProps {
  settings: PluginSettings;
  onSettingsChange: (settings: PluginSettings) => void;
}

export const OSSSettingsPanel: React.FC<OSSSettingsPanelProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // 调用测试连接的 API
      const result = await testOSSConnection(settings);
      setTestResult(result.success ? '连接成功！' : `连接失败: ${result.error}`);
    } catch (error) {
      setTestResult(`连接失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="oss-settings-panel">
      <h3>阿里云 OSS 配置</h3>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={settings.enableOSSUpload}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                enableOSSUpload: e.target.checked,
              })
            }
          />
          启用 OSS 上传
        </label>
      </div>

      {settings.enableOSSUpload && (
        <>
          <div className="form-group">
            <label>区域</label>
            <select
              value={settings.ossRegion}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossRegion: e.target.value,
                })
              }
            >
              <option value="oss-cn-hangzhou">杭州</option>
              <option value="oss-cn-shanghai">上海</option>
              <option value="oss-cn-beijing">北京</option>
              <option value="oss-cn-shenzhen">深圳</option>
            </select>
          </div>

          <div className="form-group">
            <label>AccessKey ID</label>
            <input
              type="text"
              value={settings.ossAccessKeyId}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossAccessKeyId: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>AccessKey Secret</label>
            <input
              type="password"
              value={settings.ossAccessKeySecret}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossAccessKeySecret: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>存储桶名称</label>
            <input
              type="text"
              value={settings.ossBucket}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossBucket: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>存储基础路径</label>
            <input
              type="text"
              value={settings.ossBasePath}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossBasePath: e.target.value,
                })
              }
              placeholder="figma-images/"
            />
          </div>

          <div className="form-group">
            <label>压缩质量: {settings.ossCompressionQuality}</label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={settings.ossCompressionQuality}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  ossCompressionQuality: parseFloat(e.target.value),
                })
              }
            />
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>

          {testResult && (
            <div className={`test-result ${testResult.includes('成功') ? 'success' : 'error'}`}>
              {testResult}
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

## 需要修改的文件清单

### 类型定义
- [ ] `packages/types/src/types.ts` - 添加 `OSSSettings` 接口和相关类型

### 后端代码
- [ ] `packages/backend/src/common/ossClient.ts` - 新建：OSS 客户端封装
- [ ] `packages/backend/src/common/ossImageHandler.ts` - 新建：图片处理模块
- [ ] `packages/backend/src/common/ossCacheManager.ts` - 新建：缓存管理模块
- [ ] `packages/backend/src/common/images.ts` - 修改：添加 OSS 上传相关函数
- [ ] `packages/backend/src/tailwind/tailwindMain.ts` - 修改：集成 OSS 上传逻辑
- [ ] `packages/backend/src/index.ts` - 修改：导出 OSS 相关函数

### UI 代码
- [ ] `packages/plugin-ui/src/components/OSSSettings.tsx` - 新建：OSS 配置面板
- [ ] `packages/plugin-ui/src/components/OSSCachePanel.tsx` - 新建：缓存管理面板
- [ ] `packages/plugin-ui/src/codegenPreferenceOptions.ts` - 修改：添加 OSS 配置选项
- [ ] `packages/plugin-ui/src/PluginUI.tsx` - 修改：集成 OSS 配置入口
- [ ] `packages/plugin-ui/src/index.tsx` - 修改：导出新组件

### 配置文件
- [ ] `package.json` - 添加 `ali-oss` 和 `sharp` 依赖

### 文档
- [ ] `docs/oss-upload-guide.md` - 新建：用户使用指南
- [ ] `README.md` - 修改：添加 OSS 功能说明

## 风险评估

### 高风险

1. **Figma API 限制**
   - 风险：大量图片导出可能触发 Figma API 速率限制
   - 缓解：实现队列机制，添加延迟，显示上传进度

2. **AccessKey 泄露**
   - 风险：AccessKey 存储在插件中可能被泄露
   - 缓解：使用 STS 临时凭证，加密存储，提供安全警告

### 中风险

1. **网络不稳定**
   - 风险：上传过程中网络中断导致失败
   - 缓解：实现重试机制，支持断点续传

2. **存储成本**
   - 风险：用户可能产生意外的 OSS 存储费用
   - 缓解：显示存储用量提示，提供删除功能

### 低风险

1. **缓存失效**
   - 风险：缓存数据可能过期或损坏
   - 缓解：实现缓存验证和自动清理机制

2. **兼容性问题**
   - 风险：不同版本的 Figma API 可能有差异
   - 缓解：使用稳定的 API 接口，添加版本检测

## 预期结果

开发完成后，用户将能够：

1. 在插件设置中配置阿里云 OSS 参数
2. 导出 Tailwind 代码时，位图自动上传到 OSS
3. 导出 Tailwind 代码时，矢量图自动导出为 SVG 并上传到 OSS
4. 生成的代码中使用 OSS 链接，而非占位符或简单的矩形
5. 通过缓存机制提高重复导出的性能
6. 在上传失败时获得友好的错误提示和降级方案
7. 当启用 OSS 上传时，原有的 `embedVectors` 选项将自动失效

**具体效果示例：**

**位图：**
```html
<!-- 之前 -->
<img src="https://placehold.co/200x200" class="..." />

<!-- 现在 -->
<img src="https://your-bucket.oss-cn-hangzhou.aliyuncs.com/figma-images/abc123def456.png" class="..." />
```

**矢量图：**
```html
<!-- 之前 -->
<div class="..." style="width: 24px; height: 24px;"></div> <!-- 矩形替代 -->

<!-- 现在 -->
<img src="https://your-bucket.oss-cn-hangzhou.aliyuncs.com/figma-vectors/xyz789uvw012.svg" class="icon-24" />
```

## 后续优化方向

1. 支持更多云存储服务（AWS S3、腾讯云 COS 等）
2. 支持图片格式转换（自动转换为 WebP）
3. 支持 CDN 加速配置
4. 实现图片水印功能
5. 支持批量上传进度显示
6. 添加图片预览功能
7. 支持矢量图优化（SVG 压缩、路径简化）
8. 支持 SVG 内联模式（可选，用于小型图标）
9. 支持图片元数据提取（尺寸、格式等）
10. 实现图片批量删除功能

## 时间估算

| 阶段 | 预计时间 |
|------|----------|
| 第一阶段：准备工作 | 1-2 天 |
| 第二阶段：核心功能开发 | 3-5 天 |
| 第三阶段：UI 开发 | 2-3 天 |
| 第四阶段：测试与优化 | 2-3 天 |
| 第五阶段：文档与发布 | 1-2 天 |
| **总计** | **9-15 天** |

---

**文档版本**: 1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14