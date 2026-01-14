# FigmaToCode 项目上下文

## 项目概述

FigmaToCode 是一个 Figma 插件，可将 Figma 设计转换为多种框架的代码：HTML、React (JSX)、Svelte、Styled Components、Tailwind CSS、Flutter 和 SwiftUI。

**GitHub:** https://github.com/bernaferrari/FigmaToCode  
**插件 ID:** 842128343887142055

## 技术栈

| 类别 | 技术 |
|------|------|
| 包管理器 | pnpm 9.x |
| 构建工具 | Turborepo + esbuild + Vite |
| 前端框架 | React 19 + TypeScript |
| 样式方案 | Tailwind CSS 4.0 |
| 调试 UI | Next.js 15 |
| 代码编辑器 | TypeScript 5.9 |

## Monorepo 结构

```
FigmaToCode/
├── apps/
│   ├── plugin/          # Figma 插件主应用
│   │   ├── plugin-src/  # 插件入口 (编译为 code.js)
│   │   └── ui-src/      # 插件 UI (编译为 index.html)
│   └── debug/           # 调试模式 (Next.js)
├── packages/
│   ├── backend/         # 核心转换逻辑
│   ├── plugin-ui/       # 共享 UI 组件
│   ├── eslint-config/   # ESLint 配置
│   └── tsconfig/        # TypeScript 配置
└── assets/              # 静态资源
```

## 常用命令

```bash
# 开发模式 (运行插件 + 调试 UI)
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

### 单独运行插件开发

```bash
cd apps/plugin
pnpm dev
```

### 单独运行调试 UI

```bash
cd apps/debug
pnpm dev
```

## 开发工作流

### 核心目录

| 目录 | 用途 |
|------|------|
| `packages/backend` | 核心业务逻辑：Figma API 读取、节点转换、代码生成 |
| `packages/plugin-ui` | 共享 UI 组件：代码面板、设置、颜色选择器等 |
| `apps/plugin` | 插件打包配置 |
| `apps/debug` | 调试 UI (Next.js) |

### 后端代码生成模块

位于 `packages/backend/src/`：

| 模块 | 用途 |
|------|------|
| `html/` | HTML/JSX/Svelte/Styled Components 代码生成 |
| `tailwind/` | Tailwind CSS 代码生成 |
| `flutter/` | Flutter 代码生成 |
| `swiftui/` | SwiftUI 代码生成 |
| `compose/` | Jetpack Compose 代码生成 |
| `altNodes/` | 中间表示层 (AltNode) 转换 |
| `common/` | 共享工具函数 |

### 插件工作原理

1. **Node 转换**: Figma 节点 → JSON 表示
2. **中间表示**: JSON → AltNode (可操作的虚拟表示)
3. **布局优化**: 检测 auto-layout、响应式约束
4. **代码生成**: 转换为目标框架代码

## 代码规范

### ESLint 配置

项目使用 `eslint-config-custom`，基于 `kentcdodds` 配置：

```javascript
// .eslintrc.js 关键规则
{
  "space-before-function-paren": ["error", {
    "anonymous": "never",
    "named": "never",
    "asyncArrow": "always"
  }],
  // 其他规则...
}
```

### 格式化

使用 Prettier，配置文件：`.prettierrc`

### 命令

```bash
# 检查代码
pnpm lint

# 自动格式化
pnpm format
```

## 调试

启动开发模式后：

- **插件模式**: 在 Figma 编辑器中运行插件
- **调试 UI**: 访问 http://localhost:3000 查看 UI 组件

### Figma 插件调试

1. 运行 `pnpm dev`
2. 在 Figma 中打开插件 → "Development" → "Import plugin from manifest..."
3. 选择 `manifest.json`

## 生成语言支持

| 语言 | 值 | 说明 |
|------|-----|------|
| HTML | `html` | 纯 HTML |
| React (JSX) | `html_jsx` | React JSX |
| Svelte | `html_svelte` | Svelte 组件 |
| Styled Components | `html_styled_components` | CSS-in-JS |
| Tailwind | `tailwind` | Tailwind CSS |
| Tailwind (JSX) | `tailwind_jsx` | Tailwind + JSX |
| Flutter | `flutter` | Flutter Widgets |
| SwiftUI | `swiftUI` | SwiftUI 视图 |

## 待实现功能

- Vectors (HTML/Tailwind 支持)
- Images (HTML/Tailwind 内联)
- Line/Star/Polygon 图形

## 相关链接

- [Figma 插件市场](https://www.figma.com/community/plugin/842128343887142055)
- [项目 Figma 文件](https://www.figma.com/file/8buWpm6Mpq4yK9MhbkcdJB/Figma-to-Code)
