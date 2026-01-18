# Figma 插件(PRD)

| 项目名称     | Design Spec Live Preview (DSLP) - Figma Plugin               |
| :----------- | :----------------------------------------------------------- |
| **文档版本** | v1.0                                                         |
| **归属项目** | [AI_Demo 生成系统](./01-AI_Demo生成系统.md)                  |
| **最后更新** | 2026-01-18                                                   |
| **核心功能** | 智能标记 + 资源预处理 + DSLP 代码导出                        |

---

## 1. 产品定位

**Visual Configurator**：作为 AI Demo 生成系统的数据清洗与编译器入口。
负责将 Figma 设计稿转化为符合 DSLP (Design Spec Live Protocol) 协议的 React 代码，供 AI 工作台进一步处理。

## 2. 核心功能

### 2.1 智能标记 (Tagging)
- **侧边栏面板**：提供交互式面板，选中图层即可一键应用 `#list`、`#slot` 等 DSLP 标记。
- **AI 指令注入**：点击 **[ 添加 AI 指令 ]**，生成一个隐藏的 `#prompt` 文本层，允许用户输入"这是一个轮播图..."等自然语言描述，指导 AI 后续生成逻辑。
- **健康度检查**：实时检测选中的图层结构：
  - 是否存在未解组的 Group（建议转换为 Frame 以获得更好的 Flex 布局支持）。
  - 命名是否符合 DSLP 规范，是否存在冲突。

### 2.2 图层预处理
- **一键 Flatten**：对于装饰性复杂、无需代码还原的图层组，提供一键栅格化功能，自动将其合并并重命名为 `#static`。
- **资源自动上传**：
  - 遍历所有 `#static` 图层和默认占位图。
  - 自动导出图片并上传至 OSS，获取 CDN URL。
  - 替换节点数据中的本地引用，确保导出的代码包含可访问的远程图片地址。

### 2.3 Code 导出
- **核心引擎**：调用内置的 Modified FigmaToCode 引擎。
- **输出产物**：生成携带 `data-figma-id` 的 React 初版代码 (Raw Code)。
- **交互方式**：支持一键复制 (Copy to Clipboard) 或导出文件。

## 3. 技术实施关键点

### 3.1 FigmaToCode 引擎改造

原版 FigmaToCode 引擎通常直接输出 HTML/Tailwind，我们需要改造其 Pipeline 以适配 DSLP 协议：

1.  **拦截器 (Interceptor)**：
    - 在生成 AST (抽象语法树) 阶段，拦截命名匹配 `/#slot:(.*)/` 的节点。
2.  **解析器 (Parser)**：
    - 解析 Tag 中的类型（img/text/video）和 ID。
3.  **替换器 (Replacer)**：
    - 将该节点替换为对应的 SDK 组件 (如 `<SdkImage />`, `<SdkText />`)。
    - 注入 `id` 和 `data-figma-id` 属性，用于后续的双向定位。
4.  **属性保留 (Prop Preservation)**：
    - 将 Figma 的 Width/Height/Fill/CornerRadius 等样式转换为 Props 传递给 SDK 组件，作为默认样式。

## 4. 交付物清单

1.  **Figma 插件安装包** (`.wgt` / 商店链接)
2.  **插件使用说明书**
3.  **测试报告** (包含 Figma 复杂布局还原度测试)
