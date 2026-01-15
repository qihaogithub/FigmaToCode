# 阶段2：删除Twig功能

## 概述

本计划将删除 Tailwind 框架中的 Twig 导出格式支持，仅保留 HTML 和 React (JSX) 两种导出格式。

## 前置条件

**必须先完成阶段1（删除 HTML、Flutter、SwiftUI、Compose 框架）**，因为本阶段只针对 Tailwind 框架进行优化。

## 功能说明

当前 Tailwind 框架支持三种导出格式：
- HTML
- React (JSX)
- Twig

本计划将删除 Twig 支持，仅保留 HTML 和 React (JSX)。

## 涉及的文件

### 需要修改的文件（5个）

1. `packages/types/src/types.ts` - 类型定义
2. `packages/plugin-ui/src/codegenPreferenceOptions.ts` - UI 配置选项
3. `packages/backend/src/tailwind/tailwindMain.ts` - Tailwind 核心实现
4. `packages/backend/src/tailwind/tailwindDefaultBuilder.ts` - Tailwind 默认构建器
5. `packages/backend/src/common/commonFormatAttributes.ts` - 公共工具函数

## 详细修改步骤

### 步骤 1：修改类型定义

**文件**: `packages/types/src/types.ts`

**重要说明（计划修订）**：阶段1完成后，类型层将只保留 Tailwind，`HTMLSettings` 将被删除，因此此处示例不应再出现 `extends HTMLSettings`。

**修改内容**:
```typescript
// 修改前（阶段1结束态）
export interface TailwindSettings {
  tailwindGenerationMode: "html" | "jsx" | "twig";
  // ... 其他属性
}

// 修改后
export interface TailwindSettings {
  tailwindGenerationMode: "html" | "jsx";
  // ... 其他属性
}
```

**影响范围**:
- 类型检查
- TypeScript 编译
- 所有使用该类型的代码
- 历史配置兼容（见下文“向后兼容性/迁移逻辑”）

---

### 步骤 2：修改 UI 配置选项

**文件**: `packages/plugin-ui/src/codegenPreferenceOptions.ts`

**修改内容**:
```typescript
// 修改前
{
  itemType: "select",
  propertyName: "tailwindGenerationMode",
  label: "Mode",
  options: [
    { label: "HTML", value: "html" },
    { label: "React (JSX)", value: "jsx" },
    { label: "Twig", value: "twig" },
  ],
  includedLanguages: ["Tailwind"],
}

// 修改后
{
  itemType: "select",
  propertyName: "tailwindGenerationMode",
  label: "Mode",
  options: [
    { label: "HTML", value: "html" },
    { label: "React (JSX)", value: "jsx" },
  ],
  includedLanguages: ["Tailwind"],
}
```

**影响范围**:
- 用户界面显示
- 用户选择行为
- 配置持久化

---

### 步骤 3：修改 Tailwind 主文件

**文件**: `packages/backend/src/tailwind/tailwindMain.ts`

**需要删除的内容**:

#### 3.1 删除 `tailwindFrame()` 函数中的 Twig 检查逻辑

**位置**: 第 175-177 行

```typescript
// 删除这部分代码
if (node.type === "INSTANCE" && isTwigComponentNode(node)) {
  return tailwindTwigComponentInstance(node, settings);
}
```

#### 3.2 删除 `tailwindTwigComponentInstance()` 函数

**位置**: 第 202-230 行

```typescript
// 完整删除此函数
const tailwindTwigComponentInstance = async (
  node: InstanceNode,
  settings: TailwindSettings,
): Promise<string> => {
  // ... 函数体
};
```

#### 3.3 删除 `isTwigComponentNode()` 函数

**位置**: 第 232-233 行

```typescript
// 完整删除此函数
const isTwigComponentNode = (node: SceneNode): boolean => {
  return localTailwindSettings.tailwindGenerationMode === "twig" && node.type === "INSTANCE" && !extractComponentName(node).startsWith("HTML:") && !isTwigContentNode(node);
}
```

#### 3.4 删除 `isTwigContentNode()` 函数

**位置**: 第 236-237 行

```typescript
// 完整删除此函数
const isTwigContentNode = (node: SceneNode): boolean => {
  return node.type === "INSTANCE" && node.name.startsWith("TwigContent")
}
```

#### 3.5 删除 `extractComponentName()` 函数

**位置**: 第 240-247 行

```typescript
// 完整删除此函数
const extractComponentName = (node: InstanceNode): string => {
  if (node.mainComponent) {
    return node.mainComponent.name;
  }
  return node.name;
};
```

**注意**:
- `extractComponentName()` 函数仅被 Twig 相关代码使用，可以安全删除
- 删除后需要确保 `tailwindFrame()` 函数逻辑正确

---

### 步骤 4：修改 Tailwind 默认构建器

**文件**: `packages/backend/src/tailwind/tailwindDefaultBuilder.ts`

**需要修改的内容**:

#### 4.1 删除导入

**位置**: 第 30 行

```typescript
// 修改前
import { formatTwigAttribute, formatDataAttribute } from "../common/commonFormatAttributes";

// 修改后
import { formatDataAttribute } from "../common/commonFormatAttributes";
```

#### 4.2 删除 `isTwigComponent` getter

**位置**: 第 61-62 行

```typescript
// 完整删除此 getter
get isTwigComponent() {
  return this.settings.tailwindGenerationMode === "twig" && this.node.type === "INSTANCE"
}
```

#### 4.3 修改 `build()` 方法中的组件属性处理逻辑

**位置**: 第 284 行附近

```typescript
// 修改前
if ("componentProperties" in this.node && this.node.componentProperties) {
  Object.entries(this.node.componentProperties)
    ?.map((prop) => {
      if (prop[1].type === "VARIANT" || prop[1].type === "BOOLEAN" || (this.isTwigComponent && prop[1].type === "TEXT")) {
        const cleanName = prop[0]
          .split("#")[0]
          .replace(/\s+/g, "-")
          .toLowerCase();

        return this.isTwigComponent
          ? formatTwigAttribute(cleanName, String(prop[1].value))
          : formatDataAttribute(cleanName, String(prop[1].value));
      }
      return "";
    })
    .filter(Boolean)
    .sort()
    .forEach((d) => this.data.push(d));
}

// 修改后
if ("componentProperties" in this.node && this.node.componentProperties) {
  Object.entries(this.node.componentProperties)
    ?.map((prop) => {
      if (prop[1].type === "VARIANT" || prop[1].type === "BOOLEAN") {
        const cleanName = prop[0]
          .split("#")[0]
          .replace(/\s+/g, "-")
          .toLowerCase();

        return formatDataAttribute(cleanName, String(prop[1].value));
      }
      return "";
    })
    .filter(Boolean)
    .sort()
    .forEach((d) => this.data.push(d));
}
```

---

### 步骤 5：修改公共工具函数

**文件**: `packages/backend/src/common/commonFormatAttributes.ts`

**需要删除的内容**:

```typescript
// 完整删除此函数
export const formatTwigAttribute = (label: string, value?: string) =>
  ['.', '_'].includes(label.charAt(0)) ? '' : (` ${lowercaseFirstLetter(label).replace(" ", "-")}${value === undefined ? `` : `="${value}"`}`);
```

**影响范围**:
- 仅被 TailwindDefaultBuilder 使用
- 删除后无其他引用

---

## 实施步骤

### 步骤 1：备份当前代码

```bash
git checkout -b feature/remove-twig
```

### 步骤 2：修改类型定义

1. 修改 `packages/types/src/types.ts`
2. 运行 TypeScript 编译检查

```bash
cd packages/types
pnpm build
```

### 步骤 3：修改 UI 配置

1. 修改 `packages/plugin-ui/src/codegenPreferenceOptions.ts`
2. 验证 UI 显示正确

### 步骤 4：修改后端实现

1. 修改 `packages/backend/src/tailwind/tailwindMain.ts`
2. 修改 `packages/backend/src/tailwind/tailwindDefaultBuilder.ts`
3. 修改 `packages/backend/src/common/commonFormatAttributes.ts`

### 步骤 5：编译和测试

```bash
# 编译所有包
pnpm build

# 运行测试
pnpm test

# 运行 lint 检查
pnpm lint
```

### 步骤 6：功能验证

1. 测试 HTML 导出功能
2. 测试 React (JSX) 导出功能
3. 确认 Twig 选项不再显示
4. 确认现有配置兼容性

### 步骤 7：清理和优化

1. 删除未使用的代码
2. 更新相关文档
3. 提交代码

```bash
git add .
git commit -m "Remove Twig support from Tailwind framework"
```

---

## 风险评估

### 高风险项

- **类型定义变更**: 可能导致编译错误
  - 缓解措施: 逐步修改，每次修改后进行编译检查

### 中风险项

- **组件属性处理逻辑变更**: 可能影响现有组件实例的导出
  - 缓解措施: 充分测试各种组件实例场景

### 低风险项

- **UI 选项删除**: 仅影响用户界面
  - 缓解措施: 确认 UI 显示正确

---

## 测试计划

### 单元测试

- 测试类型定义变更
- 测试 UI 配置选项
- 测试 Tailwind 导出逻辑

### 集成测试

- 测试完整的导出流程
- 测试 HTML 导出
- 测试 React (JSX) 导出

### 回归测试

- 确保现有功能不受影响
- 确认其他框架导出正常（如果还有其他框架）

---

## 注意事项

1. **向后兼容性**:
   - 现有用户的配置中如果选择了 Twig，需要降级到 HTML 或 JSX
   - 建议在代码中添加迁移逻辑

2. **代码清理**:
   - 删除所有 Twig 相关的注释
   - 更新相关文档

3. **测试覆盖**:
   - 确保所有修改的代码都有测试覆盖
   - 特别关注边界情况

---

## 完成标准

- [ ] 所有 Twig 相关代码已删除
- [ ] HTML 导出功能正常工作
- [ ] React (JSX) 导出功能正常工作
- [ ] TypeScript 编译无错误
- [ ] 所有测试通过
- [ ] Lint 检查通过
- [ ] UI 显示正确，无 Twig 选项
- [ ] 文档已更新

---

## 时间估算

| 任务 | 预计时间 |
|------|----------|
| 备份当前代码 | 5 分钟 |
| 修改类型定义 | 15 分钟 |
| 修改 UI 配置 | 10 分钟 |
| 修改后端实现 | 30 分钟 |
| 编译和测试 | 20 分钟 |
| 功能验证 | 20 分钟 |
| 清理和优化 | 15 分钟 |
| **总计** | **约 2 小时** |

---

## 后续步骤

完成本阶段后，可以继续执行：
- 阶段3：删除Email和About功能
- 阶段4：UI优化（Preview和Code作为一级Tab）
- 阶段5：Tailwind位图和矢量图上传OSS功能

---

## 后续优化建议

1. 考虑添加配置迁移逻辑，自动将 Twig 配置转换为 HTML
2. 更新 README 和用户文档
3. 考虑添加版本迁移说明

---

**文档版本**: 1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14