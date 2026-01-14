# Figma 转代码

<p align="center">
<a href="https://github.com/bernaferrari/FigmaToCode/actions/"><img src="https://github.com/bernaferrari/FigmaToCode/workflows/CI/badge.svg"/></a>
<a href="https://codecov.io/gh/bernaferrari/FigmaToCode"><img src="https://codecov.io/gh/bernaferrari/FigmaToCode/branch/master/graph/badge.svg" /></a>
<a href="http://twitter.com/bernaferrari">
<img src="https://img.shields.io/badge/Twitter-@bernaferrari-brightgreen.svg?style=flat" alt="Twitter"/></a>
</p><p align="center">
<a href="https://www.figma.com/community/plugin/842128343887142055"><img src="assets/badge.png" height="60"/></a>
</p>

将 Figma 设计转换为可用代码通常是一项挑战，往往需要耗时的手动工作。Figma to Code 简化了这一过程。该插件可以直接从你的设计中生成 `HTML`、`React (JSX)`、`Svelte`、`styled-components`、`Tailwind`、`Flutter` 和 `SwiftUI` 格式的响应式布局。欢迎随时提供反馈和想法。

![展示转换过程的动图](assets/lossy_gif.gif)

## 工作原理

该插件采用复杂的多步骤流程将你的 Figma 设计转换为干净、优化的代码：

1. **节点转换**：首先，插件将 Figma 的原生节点转换为 JSON 表示形式，保留所有必要属性的同时添加优化和父引用。

2. **中间表示**：然后将 JSON 节点转换为 `AltNodes` - 一种自定义虚拟表示形式，可以在不影响原始设计的情况下进行操作。

3. **布局优化**：插件分析并优化布局，检测自动布局、响应式约束和颜色变量等模式。

4. **代码生成**：最后，将优化后的结构转换为目标框架的代码，并针对每个框架的独特模式和最佳实践进行特殊处理。如果某个功能不被支持，插件会提供警告。

![转换工作流程](assets/workflow.png)

这种中间表示方法允许在生成任何代码之前进行复杂的转换和优化，从而生成更干净、更易于维护的输出。

## 复杂情况

将视觉设计转换为代码不可避免地会遇到复杂的边缘情况。以下是插件处理的一些挑战：

1. **复杂布局**：当使用混合定位（绝对定位 + 自动布局）时，插件必须智能地决定如何构造生成的代码。它检测父子关系和 z-index 顺序以生成最准确的表示。

2. **颜色变量**：插件检测并处理颜色变量，允许生成主题一致的输出。

3. **渐变和效果**：不同框架以独特的方式处理渐变和效果，需要专门的转换逻辑。

![转换工作流程](assets/examples.png)

**提示**：除了选择整个页面，你还可以选择单个项目。这对于调试和组件化都很有用。例如：你可以使用插件生成单个元素的代码，然后使用 for 循环复制它。

### 待办事项

- 矢量图（可以在 HTML 和 Tailwind 中启用）
- 图片（可以在 HTML 和 Tailwind 中内联启用）
- 线条/星形/多边形

## 如何构建项目

### 包管理器

该项目配置为使用 [pnpm](https://pnpm.io/)。要安装，请参阅 [pnpm 安装说明](https://pnpm.io/installation)。

### 单体仓库

该插件组织为单体仓库。包含以下几个包：

- `packages/backend` - 包含读取 Figma API 并转换节点的业务逻辑
- `packages/plugin-ui` - 包含插件的通用 UI
- `packages/eslint-config-custom` - ESLint 的配置文件
- `packages/tsconfig` - 项目中使用的 TSConfig 文件集合

- `apps/plugin` - 这是实际的插件，由 `backend` 和 `plugin-ui` 中的部分组装而成。在此文件夹中分为：
  - `plugin-src` - 从 `backend` 加载并编译为 `code.js`
  - `ui-src` - 加载通用 `plugin-ui` 并编译为 `index.html`
- `apps/debug` - 这是调试模式插件，是查看所有 UI 元素的更便捷方式。

### 开发工作流程

该项目使用 [Turborepo](https://turborepo.com/) 管理单体仓库，每个包使用 [esbuild](https://esbuild.github.io/) 编译以实现快速开发周期。进行更改时，只会重新编译修改的文件，从而提高开发过程的效率。

#### 运行项目

你有两种主要的开发选项：

1. **根目录开发模式**（包括调试 UI）：

   ```bash
   pnpm dev
   ```

   这将以开发模式运行插件，并启动 Next.js 服务器用于调试 UI。你可以在 `http://localhost:3000` 访问调试 UI。

2. **仅插件开发模式**：

   ```bash
   cd apps/plugin
   pnpm dev
   ```

   这仅关注插件，不包括 Next.js 调试 UI。当你专门对插件进行更改时使用此模式。

#### 更改位置

你的大部分开发工作将在以下目录中进行：

- `packages/backend` - 用于插件后端
- `packages/plugin-ui` - 用于插件 UI
- `apps/plugin/` - 组合后端和 UI 并由 Figma 调用的主要插件结果。

你很少需要直接修改 `apps/` 目录中的文件，因为它们主要包含构建配置。

#### 命令

`pnpm run ...`

- `dev` - 以开发模式运行应用。可以在 Figma 编辑器中运行。
- `build` - 构建生产版本
- `build:watch` - 构建并监视更改
- `lint` - 运行 ESLint
- `format` - 使用 prettier 格式化（警告：可能会编辑文件！）

#### 调试模式

运行 `dev` 任务时，你可以打开 `http://localhost:3000` 查看 UI 的调试版本。

<img width="600" alt="Screenshot 2024-12-13 at 16 26 43" src="https://github.com/user-attachments/assets/427fb066-70e1-47bd-8718-51f7f4d83e35" />

## 问题

本 README 和图标的 Figma 文件也是开放的，欢迎更改！[在此查看](https://www.figma.com/file/8buWpm6Mpq4yK9MhbkcdJB/Figma-to-Code)。

我在做决策时考虑的是如何让大多数人受益，但我可能（而且很可能会！）多次犯错。发现错误了吗？有改进想法吗？请随时 [添加问题](../../issues) 或发送电子邮件给我。也非常欢迎提交拉取请求。