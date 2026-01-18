# 阶段4：UI优化 - Preview 和 Code 作为一级 Tab 页面

## 概述

本文档详细说明了将 Figma to Code 插件的 UI 优化为以 Preview 和 Code 作为两个一级 Tab 页面的完整计划。这是整个重构计划的第四阶段，专注于 UI 体验优化。

## 前置条件

**必须先完成以下阶段**：

- 阶段1：删除 HTML、Flutter、SwiftUI、Compose 框架
- 阶段2：删除 Twig 功能
- 阶段3：删除 Email 功能（保留 About）

> 说明：阶段3的目标已修订为“仅删除 Email，保留 About”，因此本阶段仍可以在顶部保留 About Tab。

## 当前UI结构分析

### 当前布局

```
┌─────────────────────────────────────┐
│  [Tailwind]               │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Preview 组件           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      WarningsPanel          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      CodePanel              │   │
│  │  - 设置选项                 │   │
│  │  - 代码显示                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      ColorsPanel            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      GradientsPanel         │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 当前问题

1. Preview 和 Code 混在一起，用户需要滚动查看
2. Preview 作为最重要的功能，不够突出
3. 用户无法快速在 Preview 和 Code 之间切换

## 优化后的UI结构

### 新布局设计

```
┌─────────────────────────────────────┐
│     [Preview] [Code]               │
├─────────────────────────────────────┤
│                                     │
│  Preview Tab 内容：                  │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      Preview 组件           │   │
│  │      (实时预览)              │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Code Tab 内容：                     │
│  ┌─────────────────────────────┐   │
│  │      WarningsPanel          │   │
│  ├─────────────────────────────┤   │
│  │      CodePanel              │   │
│  │  - 设置选项                 │   │
│  │  - 代码显示                 │   │
│  ├─────────────────────────────┤   │
│  │      ColorsPanel            │   │
│  ├─────────────────────────────┤   │
│  │      GradientsPanel         │   │
│  └─────────────────────────────┘   │
│                                     │
│  About Tab 内容：                    │
│  ┌─────────────────────────────┐   │
│  │      About 组件             │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 优化目标

1. **Preview 和 Code 作为一级 Tab**：清晰的功能分区
2. **默认选中 Preview**：突出最重要的实时预览功能
3. **Preview 中仅展示实时预览**：简洁专注
4. **保留 About 功能**：保留关于页面信息

## 涉及的文件清单

### 需要修改的文件

1. `packages/plugin-ui/src/PluginUI.tsx` - 主 UI 组件（207行）
2. `packages/plugin-ui/src/components/CodePanel.tsx` - 代码面板组件（262行）

### 需要删除的文件

1. `packages/plugin-ui/src/components/FrameworkTabs.tsx` - 框架选项卡组件（可选）

## 详细修改步骤

### 第一步：修改 PluginUI.tsx 文件

**文件路径**: `packages/plugin-ui/src/PluginUI.tsx`

#### 1.1 修改状态管理

**位置**: 第 55-56 行

**原代码**:

```typescript
const [showAbout, setShowAbout] = useState(false);
```

**修改为**:

```typescript
const [activeTab, setActiveTab] = useState<"preview" | "code" | "about">(
  "preview",
);
```

**说明**: 使用单一状态管理三个 Tab 的切换，默认为 "preview"。

#### 1.2 删除 FrameworkTabsProps 类型定义

**位置**: 第 38-46 行

**操作**: 完全删除此类型定义

**原因**: 框架选项卡将移到 CodePanel 内部，不再需要在 PluginUI 中定义。

#### 1.3 删除 FrameworkTabs 组件

**位置**: 第 48-73 行

**操作**: 完全删除此组件

**原因**: 框架选项卡将移到 CodePanel 内部。

#### 1.4 删除 frameworks 常量

**位置**: 第 35 行

```typescript
// 删除这一行：
const frameworks: Framework[] = ["Tailwind"];
```

**原因**: 框架选项卡将移到 CodePanel 内部，不再需要在 PluginUI 中定义。

#### 1.5 重构顶部 Tab 区域

**位置**: 第 89-135 行

**原代码**:

```typescript
<div className="p-2 dark:bg-card">
  <div className="flex gap-1 bg-muted dark:bg-card rounded-lg p-1">
    <FrameworkTabs
      frameworks={frameworks}
      selectedFramework={props.selectedFramework}
      setSelectedFramework={props.setSelectedFramework}
      showAbout={showAbout}
      setShowAbout={setShowAbout}
    />
    <button
      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
        showAbout
          ? "bg-primary text-primary-foreground shadow-xs"
          : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
      }`}
      onClick={() => {
        setShowAbout(!showAbout);
      }}
      aria-label="About"
    >
      <InfoIcon size={16} />
    </button>
  </div>
</div>
```

**修改为**:

```typescript
<div className="p-2 dark:bg-card">
  <div className="flex gap-1 bg-muted dark:bg-card rounded-lg p-1">
    <button
      className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
        activeTab === "preview"
          ? "bg-primary text-primary-foreground shadow-xs"
          : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
      }`}
      onClick={() => setActiveTab("preview")}
    >
      Preview
    </button>
    <button
      className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
        activeTab === "code"
          ? "bg-primary text-primary-foreground shadow-xs"
          : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
      }`}
      onClick={() => setActiveTab("code")}
    >
      Code
    </button>
    <button
      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
        activeTab === "about"
          ? "bg-primary text-primary-foreground shadow-xs"
          : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
      }`}
      onClick={() => setActiveTab("about")}
      aria-label="About"
    >
      <InfoIcon size={16} />
    </button>
  </div>
</div>
```

**说明**:

- 创建三个 Tab 按钮：Preview、Code、About
- Preview 和 Code 按钮使用 `flex-1` 平分空间
- About 按钮使用固定宽度 `w-8`
- 默认选中 Preview（通过 useState 初始值控制）

#### 1.6 重构主内容区域

**位置**: 第 137-206 行

**原代码**:

```typescript
<div className="flex flex-col h-full overflow-y-auto">
  {showAbout ? (
    <About
      useOldPluginVersion={props.settings?.useOldPluginVersion2025}
      onPreferenceChanged={props.onPreferenceChanged}
    />
  ) : (
    <div className="flex flex-col items-center px-4 py-2 gap-2 dark:bg-transparent">
      {isEmpty === false && props.htmlPreview && (
        <Preview
          htmlPreview={props.htmlPreview}
          expanded={previewExpanded}
          setExpanded={setPreviewExpanded}
          viewMode={previewViewMode}
          setViewMode={setPreviewViewMode}
          bgColor={previewBgColor}
          setBgColor={setPreviewBgColor}
        />
      )}

      {warnings.length > 0 && <WarningsPanel warnings={warnings} />}

      <CodePanel
        code={props.code}
        selectedFramework={props.selectedFramework}
        preferenceOptions={preferenceOptions}
        selectPreferenceOptions={selectPreferenceOptions}
        settings={props.settings}
        onPreferenceChanged={props.onPreferenceChanged}
      />

      {props.colors.length > 0 && (
        <ColorsPanel
          colors={props.colors}
          onColorClick={(value) => {
            copy(value);
          }}
        />
      )}

      {props.gradients.length > 0 && (
        <GradientsPanel
          gradients={props.gradients}
          onColorClick={(value) => {
            copy(value);
          }}
        />
      )}
    </div>
  )}
</div>
```

**修改为**:

```typescript
<div className="flex flex-col h-full overflow-y-auto">
  {activeTab === "preview" ? (
    <div className="flex flex-col items-center justify-center px-4 py-2 gap-2 dark:bg-transparent h-full">
      {isEmpty === false && props.htmlPreview ? (
        <Preview
          htmlPreview={props.htmlPreview}
          expanded={previewExpanded}
          setExpanded={setPreviewExpanded}
          viewMode={previewViewMode}
          setViewMode={setPreviewViewMode}
          bgColor={previewBgColor}
          setBgColor={setPreviewBgColor}
        />
      ) : (
        <div className="text-center text-muted-foreground">
          <p>No preview available</p>
        </div>
      )}
    </div>
  ) : activeTab === "code" ? (
    <div className="flex flex-col items-center px-4 py-2 gap-2 dark:bg-transparent">
      {warnings.length > 0 && <WarningsPanel warnings={warnings} />}

      <CodePanel
        code={props.code}
        selectedFramework={props.selectedFramework}
        setSelectedFramework={props.setSelectedFramework}
        preferenceOptions={preferenceOptions}
        selectPreferenceOptions={selectPreferenceOptions}
        settings={props.settings}
        onPreferenceChanged={props.onPreferenceChanged}
      />

      {props.colors.length > 0 && (
        <ColorsPanel
          colors={props.colors}
          onColorClick={(value) => {
            copy(value);
          }}
        />
      )}

      {props.gradients.length > 0 && (
        <GradientsPanel
          gradients={props.gradients}
          onColorClick={(value) => {
            copy(value);
          }}
        />
      )}
    </div>
  ) : (
    <About
      useOldPluginVersion={props.settings?.useOldPluginVersion2025}
      onPreferenceChanged={props.onPreferenceChanged}
    />
  )}
</div>
```

**说明**:

- Preview Tab：只显示 Preview 组件，居中显示
- Code Tab：显示 WarningsPanel、CodePanel、ColorsPanel、GradientsPanel
- About Tab：显示 About 组件

---

### 第二步：修改 CodePanel.tsx 文件

**文件路径**: `packages/plugin-ui/src/components/CodePanel.tsx`

#### 2.1 修改 CodePanelProps 接口

**位置**: 第 15-26 行

**原代码**:

```typescript
interface CodePanelProps {
  code: string;
  selectedFramework: Framework;
  settings: PluginSettings | null;
  preferenceOptions: LocalCodegenPreferenceOptions[];
  selectPreferenceOptions: SelectPreferenceOptions[];
  onPreferenceChanged: (
    key: keyof PluginSettings,
    value: boolean | string | number,
  ) => void;
}
```

**修改为**:

```typescript
interface CodePanelProps {
  code: string;
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  settings: PluginSettings | null;
  preferenceOptions: LocalCodegenPreferenceOptions[];
  selectPreferenceOptions: SelectPreferenceOptions[];
  onPreferenceChanged: (
    key: keyof PluginSettings,
    value: boolean | string | number,
  ) => void;
}
```

**说明**: 添加 `setSelectedFramework` 属性，用于在 CodePanel 内部切换框架。

#### 2.2 在 CodePanel 顶部添加框架选项卡

**位置**: 第 68 行之前（在 return 语句之后）

**原代码**:

```typescript
return (
  <div className="w-full flex flex-col gap-2 mt-2">
    <div className="flex items-center justify-between w-full">
      <p className="text-lg font-medium text-center dark:text-white rounded-lg">
        Code
      </p>
      {!isCodeEmpty && (
        <CopyButton
          value={prefixedCode}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
        />
      )}
    </div>
```

**修改为**:

```typescript
const frameworks: Framework[] = ["Tailwind"];

return (
  <div className="w-full flex flex-col gap-2 mt-2">
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-1 bg-muted dark:bg-card rounded-lg p-1 flex-1">
        {frameworks.map((framework) => (
          <button
            key={framework}
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              selectedFramework === framework
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setSelectedFramework(framework)}
          >
            {framework}
          </button>
        ))}
      </div>
      {!isCodeEmpty && (
        <CopyButton
          value={prefixedCode}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
        />
      )}
    </div>
```

**说明**:

- 在 CodePanel 顶部添加框架选项卡
- 使用与顶部 Tab 相同的样式
- 框架选项卡占据大部分空间（flex-1）
- Copy 按钮保持固定宽度

#### 2.3 删除 "Code" 标题

**位置**: 第 72 行

```typescript
// 删除这一行：
<p className="text-lg font-medium text-center dark:text-white rounded-lg">
  Code
</p>
```

**原因**: 框架选项卡已经足够清晰，不需要额外的 "Code" 标题。

---

### 第三步：删除 FrameworkTabs.tsx 文件（可选）

**文件路径**: `packages/plugin-ui/src/components/FrameworkTabs.tsx`

**操作**: 完全删除此文件

**原因**: FrameworkTabs 组件将不再使用，因为框架选项卡已移到 CodePanel 内部。

**注意**: 需要检查是否有其他地方使用了此组件。

```bash
rm packages/plugin-ui/src/components/FrameworkTabs.tsx
```

---

## 实施步骤

### 步骤 1：备份当前代码

```bash
git checkout -b feature/ui-optimization-preview-code-tabs
```

### 步骤 2：修改 PluginUI.tsx 文件

按照上述详细步骤逐个修改

### 步骤 3：修改 CodePanel.tsx 文件

按照上述详细步骤逐个修改

### 步骤 4：删除 FrameworkTabs.tsx 文件（可选）

```bash
rm packages/plugin-ui/src/components/FrameworkTabs.tsx
```

### 步骤 5：编译和测试

```bash
# 编译所有包
pnpm build

# 运行 lint 检查
pnpm lint

# 运行类型检查
pnpm typecheck
```

### 步骤 6：功能验证

1. 启动开发服务器：`pnpm dev`
2. 在 Figma 中打开插件
3. 验证以下功能：
   - [ ] 顶部显示 Preview、Code、About 三个 Tab
   - [ ] 默认选中 Preview Tab
   - [ ] Preview Tab 只显示实时预览
   - [ ] 点击 Code Tab 可以切换到代码视图
   - [ ] Code Tab 顶部显示框架选项卡
   - [ ] 框架选项卡可以正常切换
   - [ ] Code Tab 显示所有代码相关内容
   - [ ] 点击 About Tab 可以切换到关于页面
   - [ ] Preview 组件的所有功能正常（展开/收起、视图模式、背景色切换）
   - [ ] 代码生成功能正常工作
   - [ ] 颜色和渐变提取功能正常工作
   - [ ] 设置选项可以正常修改

### 步骤 7：提交代码

```bash
git add .
git commit -m "UI optimization: Preview and Code as top-level tabs"
```

---

## 优化后的预期效果

### UI 变化

1. **顶部 Tab 区域**：
   - 只显示三个 Tab：Preview、Code、About（图标）
   - Preview 和 Code 平分空间，About 使用图标按钮
   - 默认选中 Preview

2. **Preview Tab**：
   - 只显示 Preview 组件（实时预览）
   - 预览居中显示
   - 如果没有预览内容，显示提示信息

3. **Code Tab**：
   - 顶部显示框架选项卡：Tailwind
   - 显示 WarningsPanel（如果有警告）
   - 显示 CodePanel（设置选项和代码）
   - 显示 ColorsPanel（如果有颜色）
   - 显示 GradientsPanel（如果有渐变）

4. **About Tab**：
   - 显示 About 组件内容
   - 包含插件信息、隐私政策等

### 功能变化

1. 用户可以快速在 Preview 和 Code 之间切换
2. Preview 功能更加突出和专注
3. 框架切换只在 Code Tab 中显示，不影响 Preview

---

## 风险评估

### 低风险

- UI 重构：只是调整布局，不改变核心功能
- 移动框架选项卡：只是位置变化，功能不变

### 中等风险

- 状态管理重构：需要确保 Tab 切换逻辑正确
- 组件 props 传递：需要确保 CodePanel 接收到正确的 props

### 需要注意的点

1. 确保 Tab 切换时状态正确保存
2. 确保 CodePanel 中的框架切换正确触发父组件的更新
3. 确保 Preview 组件的所有功能正常工作
4. 确保没有其他地方引用了已删除的组件

---

## 回滚计划

如果修改后出现问题，可以通过以下步骤回滚：

1. 从 Git 恢复已删除的文件：
   - `FrameworkTabs.tsx`（如果删除）

2. 恢复以下文件到修改前的版本：
   - `PluginUI.tsx`
   - `CodePanel.tsx`

3. 重新编译和测试

```bash
git checkout HEAD -- packages/plugin-ui/src/PluginUI.tsx
git checkout HEAD -- packages/plugin-ui/src/CodePanel.tsx
git checkout HEAD -- packages/plugin-ui/src/components/FrameworkTabs.tsx
```

---

## 时间估算

- 修改 PluginUI.tsx 文件：20-30 分钟
- 修改 CodePanel.tsx 文件：10-15 分钟
- 删除 FrameworkTabs.tsx 文件（可选）：1 分钟
- 编译和测试：10-15 分钟
- **总计：约 40-60 分钟**

---

## 注意事项

1. 在开始修改前，建议先创建一个 Git 分支
2. 每完成一个修改步骤后，建议进行一次编译检查
3. 删除前确保没有其他地方引用了相关组件
4. 修改完成后，务必进行全面的功能测试
5. 注意保持代码风格一致性
6. 确保所有 props 的类型定义正确

---

## 完成标准

- [ ] PluginUI.tsx 文件已修改
- [ ] CodePanel.tsx 文件已修改
- [ ] FrameworkTabs.tsx 文件已删除（可选）
- [ ] 编译无错误
- [ ] Lint 检查通过
- [ ] 类型检查通过
- [ ] 顶部显示 Preview、Code、About 三个 Tab
- [ ] 默认选中 Preview Tab
- [ ] Preview Tab 只显示实时预览
- [ ] Code Tab 显示所有代码相关内容
- [ ] Tab 切换功能正常
- [ ] 所有核心功能正常工作

---

## 附录：完整修改后的 PluginUI.tsx 代码

```typescript
import copy from "copy-to-clipboard";
import Preview from "./components/Preview";
import GradientsPanel from "./components/GradientsPanel";
import ColorsPanel from "./components/ColorsPanel";
import CodePanel from "./components/CodePanel";
import About from "./components/About";
import WarningsPanel from "./components/WarningsPanel";
import {
  Framework,
  HTMLPreview,
  LinearGradientConversion,
  PluginSettings,
  SolidColorConversion,
  Warning,
} from "types";
import {
  preferenceOptions,
  selectPreferenceOptions,
} from "./codegenPreferenceOptions";
import Loading from "./components/Loading";
import { useState } from "react";
import { InfoIcon } from "lucide-react";
import React from "react";

type PluginUIProps = {
  code: string;
  htmlPreview: HTMLPreview;
  warnings: Warning[];
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  settings: PluginSettings | null;
  onPreferenceChanged: (
    key: keyof PluginSettings,
    value: boolean | string | number,
  ) => void;
  colors: SolidColorConversion[];
  gradients: LinearGradientConversion[];
  isLoading: boolean;
};

export const PluginUI = (props: PluginUIProps) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "about">("preview");

  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<
    "desktop" | "mobile" | "precision"
  >("precision");
  const [previewBgColor, setPreviewBgColor] = useState<"white" | "black">(
    "white",
  );

  if (props.isLoading) return <Loading />;

  const isEmpty = props.code === "";
  const warnings = props.warnings ?? [];

  return (
    <div className="flex flex-col h-full dark:text-white">
      <div className="p-2 dark:bg-card">
        <div className="flex gap-1 bg-muted dark:bg-card rounded-lg p-1">
          <button
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
          <button
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              activeTab === "code"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              activeTab === "about"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("about")}
            aria-label="About"
          >
            <InfoIcon size={16} />
          </button>
        </div>
      </div>
      <div
        style={{
          height: 1,
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      ></div>
      <div className="flex flex-col h-full overflow-y-auto">
        {activeTab === "preview" ? (
          <div className="flex flex-col items-center justify-center px-4 py-2 gap-2 dark:bg-transparent h-full">
            {isEmpty === false && props.htmlPreview ? (
              <Preview
                htmlPreview={props.htmlPreview}
                expanded={previewExpanded}
                setExpanded={setPreviewExpanded}
                viewMode={previewViewMode}
                setViewMode={setPreviewViewMode}
                bgColor={previewBgColor}
                setBgColor={setPreviewBgColor}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No preview available</p>
              </div>
            )}
          </div>
        ) : activeTab === "code" ? (
          <div className="flex flex-col items-center px-4 py-2 gap-2 dark:bg-transparent">
            {warnings.length > 0 && <WarningsPanel warnings={warnings} />}

            <CodePanel
              code={props.code}
              selectedFramework={props.selectedFramework}
              setSelectedFramework={props.setSelectedFramework}
              preferenceOptions={preferenceOptions}
              selectPreferenceOptions={selectPreferenceOptions}
              settings={props.settings}
              onPreferenceChanged={props.onPreferenceChanged}
            />

            {props.colors.length > 0 && (
              <ColorsPanel
                colors={props.colors}
                onColorClick={(value) => {
                  copy(value);
                }}
              />
            )}

            {props.gradients.length > 0 && (
              <GradientsPanel
                gradients={props.gradients}
                onColorClick={(value) => {
                  copy(value);
                }}
              />
            )}
          </div>
        ) : (
          <About
            useOldPluginVersion={props.settings?.useOldPluginVersion2025}
            onPreferenceChanged={props.onPreferenceChanged}
          />
        )}
      </div>
    </div>
  );
};
```

---

## 后续步骤

完成本阶段后，可以继续执行：

- 阶段5：Tailwind位图和矢量图上传OSS功能

---

## 后续优化建议

1. **响应式设计**：考虑在不同屏幕尺寸下的布局优化
2. **Tab 切换动画**：添加平滑的 Tab 切换动画效果
3. **键盘快捷键**：支持使用快捷键切换 Tab（如 Ctrl+1/2/3）
4. **记住用户偏好**：记住用户最后选择的 Tab，下次打开时自动选中
5. **Preview 增强**：考虑在 Preview 中添加更多交互功能（如缩放、平移等）
6. **代码高亮优化**：优化代码高亮显示，提升可读性

---

**文档版本**: 1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14
