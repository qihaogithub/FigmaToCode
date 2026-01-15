# 阶段3：删除 Email 功能（保留 About）

## 概述

本阶段的目标是从 Figma to Code 插件中**删除 Email 宣传入口与页面**，以简化 UI。

**注意（计划修订）**：About（感叹号图标）功能在本仓库后续阶段（阶段4：Preview/Code 一级 Tab）仍会保留，因此本阶段**不删除 About**，仅删除 Email。

## 前置条件

**必须先完成阶段1（删除框架功能）和阶段2（删除Twig功能）**，确保插件只支持 Tailwind 框架，然后再进行 UI 简化。

## 功能说明

### Email 功能
- **位置**: UI 顶部的 "Email" 按钮
- **功能**: 显示 Kopi AI 项目的宣传页面
- **组件**: `EmailPanel.tsx`

### About 功能（感叹号图标）
- **位置**: UI 顶部的感叹号图标按钮（InfoIcon）
- **功能**: 显示关于插件的信息、隐私政策、联系方式等
- **组件**: `About.tsx`

## 涉及的文件清单

### 需要删除的文件
1. `packages/plugin-ui/src/components/EmailPanel.tsx` - Email 页面组件（210行）

### 需要修改的文件
1. `packages/plugin-ui/src/PluginUI.tsx` - 主 UI 组件（207行）

## 详细修改步骤

### 第一步：删除 EmailPanel.tsx 文件

**文件路径**: `packages/plugin-ui/src/components/EmailPanel.tsx`

**操作**: 完全删除此文件

**原因**: 此文件专门用于显示 Kopi AI 的宣传页面，与插件核心功能无关。

```bash
rm packages/plugin-ui/src/components/EmailPanel.tsx
```

---

### 第二步：修改 PluginUI.tsx 文件

**文件路径**: `packages/plugin-ui/src/PluginUI.tsx`

#### 2.1 删除 EmailPanel 导入

**位置**: 第 7 行

```typescript
// 删除这一行：
import EmailPanel from "./components/EmailPanel";
```

#### 2.2 删除 showEmail 相关状态

**位置**: 第 56 行

```typescript
// 删除这一行：
const [showEmail, setShowEmail] = useState(false);
```

#### 2.3 修改 FrameworkTabsProps 类型定义

**位置**: 第 38-46 行

**原代码**:
```typescript
type FrameworkTabsProps = {
  frameworks: Framework[];
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  showAbout: boolean;
  showEmail: boolean;
  setShowAbout: (show: boolean) => void;
  setShowEmail: (show: boolean) => void;
};
```

**修改为**:
```typescript
type FrameworkTabsProps = {
  frameworks: Framework[];
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  showAbout: boolean;
  setShowAbout: (show: boolean) => void;
};
```

#### 2.4 修改 FrameworkTabs 组件

**位置**: 第 48-73 行

**原代码**:
```typescript
const FrameworkTabs = ({
  frameworks,
  selectedFramework,
  setSelectedFramework,
  showAbout,
  showEmail,
  setShowAbout,
  setShowEmail,
}: FrameworkTabsProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-1 grow">
      {frameworks.map((tab) => (
        <button
          key={`tab ${tab}`}
          className={`w-full h-8 flex items-center justify-center text-sm rounded-md transition-colors font-medium ${
            selectedFramework === tab && !showAbout && !showEmail
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
          }`}
          onClick={() => {
            setSelectedFramework(tab as Framework);
            setShowAbout(false);
            setShowEmail(false);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
```

**修改为**:
```typescript
const FrameworkTabs = ({
  frameworks,
  selectedFramework,
  setSelectedFramework,
  showAbout,
  setShowAbout,
}: FrameworkTabsProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-1 grow">
      {frameworks.map((tab) => (
        <button
          key={`tab ${tab}`}
          className={`w-full h-8 flex items-center justify-center text-sm rounded-md transition-colors font-medium ${
            selectedFramework === tab && !showAbout
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
          }`}
          onClick={() => {
            setSelectedFramework(tab as Framework);
            setShowAbout(false);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
```

**修改说明**:
- 移除了 `showEmail` 和 `setShowEmail` 参数
- 移除了条件判断中的 `&& !showEmail`
- 移除了 `setShowEmail(false)` 调用

#### 2.5 删除 Email 按钮

**位置**: 第 105-119 行

**原代码**:
```typescript
<button
  className={`px-3 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
    showEmail
      ? "bg-primary text-primary-foreground shadow-xs"
      : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
  }`}
  onClick={() => {
    setShowEmail(!showEmail);
    setShowAbout(false);
  }}
>
  Email
</button>
```

**操作**: 完全删除此按钮代码块

#### 2.6 修改 About 按钮的 onClick 处理

**位置**: 第 120-133 行

**原代码**:
```typescript
<button
  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
    showAbout
      ? "bg-primary text-primary-foreground shadow-xs"
      : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
  }`}
  onClick={() => {
    setShowAbout(!showAbout);
    setShowEmail(false);
  }}
  aria-label="About"
>
  <InfoIcon size={16} />
</button>
```

**修改为**:
```typescript
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
```

**修改说明**: 移除了 `setShowEmail(false)` 调用

#### 2.7 修改 FrameworkTabs 组件调用

**位置**: 第 97-104 行

**原代码**:
```typescript
<FrameworkTabs
  frameworks={frameworks}
  selectedFramework={props.selectedFramework}
  setSelectedFramework={props.setSelectedFramework}
  showAbout={showAbout}
  showEmail={showEmail}
  setShowAbout={setShowAbout}
  setShowEmail={setShowEmail}
/>
```

**修改为**:
```typescript
<FrameworkTabs
  frameworks={frameworks}
  selectedFramework={props.selectedFramework}
  setSelectedFramework={props.setSelectedFramework}
  showAbout={showAbout}
  setShowAbout={setShowAbout}
/>
```

#### 2.8 修改条件渲染逻辑

**位置**: 第 137-139 行

**原代码**:
```typescript
{showAbout ? (
  <About
    useOldPluginVersion={props.settings?.useOldPluginVersion2025}
    onPreferenceChanged={props.onPreferenceChanged}
  />
) : showEmail ? (
  <EmailPanel />
) : (
```

**修改为**:
```typescript
{showAbout ? (
  <About
    useOldPluginVersion={props.settings?.useOldPluginVersion2025}
    onPreferenceChanged={props.onPreferenceChanged}
  />
) : (
```

**修改说明**: 移除了 `showEmail` 的条件判断和 `EmailPanel` 组件的渲染

#### 2.9 检查 InfoIcon 导入

**位置**: 第 22 行

**检查**: InfoIcon 是否还在其他地方使用。如果只在 About 按钮中使用，可以删除此导入。

```typescript
// 如果 InfoIcon 只在 About 按钮中使用，删除这一行：
import { InfoIcon, MailIcon } from "lucide-react";
// 改为：
import { MailIcon } from "lucide-react";
```

**注意**: 需要检查 MailIcon 是否还在使用，如果没有使用，也可以一并删除。

---

## 实施步骤

### 步骤 1：备份当前代码

```bash
git checkout -b feature/remove-email-about
```

### 步骤 2：删除 EmailPanel.tsx 文件

```bash
rm packages/plugin-ui/src/components/EmailPanel.tsx
```

### 步骤 3：修改 PluginUI.tsx 文件

按照上述详细步骤逐个修改

### 步骤 4：编译和测试

```bash
# 编译所有包
pnpm build

# 运行 lint 检查
pnpm lint

# 运行类型检查
pnpm typecheck
```

### 步骤 5：功能验证

1. 启动开发服务器：`pnpm dev`
2. 在 Figma 中打开插件
3. 验证以下功能：
   - [ ] 顶部只显示 1 个框架选项卡（Tailwind）和 1 个感叹号图标
   - [ ] 不再显示 "Email" 按钮
   - [ ] 点击框架选项卡可以正常切换
   - [ ] 点击感叹号图标可以正常显示 About 页面
   - [ ] 代码生成功能正常工作
   - [ ] 预览功能正常工作
   - [ ] 颜色和渐变提取功能正常工作

### 步骤 6：提交代码

```bash
git add .
git commit -m "Remove Email and About functionality"
```

---

## 删除后的预期效果

### UI 变化

1. 顶部选项卡区域将只显示：
   - 1 个框架选项卡：Tailwind
   - 1 个感叹号图标按钮（About）

2. 不再显示 "Email" 按钮

3. 点击框架选项卡时，只会切换到对应的代码生成视图

4. 点击感叹号图标时，仍然显示 About 页面

### 功能变化

1. 用户无法再访问 Kopi AI 的宣传页面
2. 其他核心功能（代码生成、预览、颜色提取等）完全不受影响

---

## 风险评估

### 低风险

- 删除 Email 功能：这是独立的宣传页面，与核心功能无关联
- 修改 UI 布局：只是移除一个按钮，不影响其他功能

### 需要注意的点

1. 确保删除后 UI 布局仍然美观
2. 确保没有其他地方引用了 EmailPanel 组件
3. 确保删除后所有状态管理逻辑正确

---

## 回滚计划

如果删除后出现问题，可以通过以下步骤回滚：

1. 从 Git 恢复已删除的 `EmailPanel.tsx` 文件
2. 恢复 `PluginUI.tsx` 文件到修改前的版本
3. 重新编译和测试

```bash
git checkout HEAD -- packages/plugin-ui/src/components/EmailPanel.tsx
git checkout HEAD -- packages/plugin-ui/src/PluginUI.tsx
```

---

## 时间估算

- 删除 EmailPanel.tsx 文件：1 分钟
- 修改 PluginUI.tsx 文件：10-15 分钟
- 编译和测试：5-10 分钟
- **总计：约 20-30 分钟**

---

## 注意事项

1. 在开始修改前，建议先创建一个 Git 分支
2. 每完成一个修改步骤后，建议进行一次编译检查
3. 删除前确保没有其他文件引用了 EmailPanel 组件
4. 修改完成后，务必进行全面的功能测试

---

## 完成标准

- [ ] EmailPanel.tsx 文件已删除
- [ ] PluginUI.tsx 文件已修改
- [ ] 编译无错误
- [ ] Lint 检查通过
- [ ] 类型检查通过
- [ ] UI 显示正确，无 Email 按钮
- [ ] About 功能正常工作
- - 代码生成功能正常工作

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

const frameworks: Framework[] = ["Tailwind"];

type FrameworkTabsProps = {
  frameworks: Framework[];
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  showAbout: boolean;
  setShowAbout: (show: boolean) => void;
};

const FrameworkTabs = ({
  frameworks,
  selectedFramework,
  setSelectedFramework,
  showAbout,
  setShowAbout,
}: FrameworkTabsProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-1 grow">
      {frameworks.map((tab) => (
        <button
          key={`tab ${tab}`}
          className={`w-full h-8 flex items-center justify-center text-sm rounded-md transition-colors font-medium ${
            selectedFramework === tab && !showAbout
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
          }`}
          onClick={() => {
            setSelectedFramework(tab as Framework);
            setShowAbout(false);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export const PluginUI = (props: PluginUIProps) => {
  const [showAbout, setShowAbout] = useState(false);

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
      <div
        style={{
          height: 1,
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      ></div>
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
    </div>
  );
};
```

---

## 后续步骤

完成本阶段后，可以继续执行：
- 阶段4：UI优化（Preview和Code作为一级Tab）
- 阶段5：Tailwind位图和矢量图上传OSS功能

---

**文档版本**: 1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14