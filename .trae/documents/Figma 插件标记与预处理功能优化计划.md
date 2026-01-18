# Figma 插件标记与预处理功能优化计划

根据您的需求，我们将对 Figma 插件的 **标记面板 (Tagging Panel)** 和 **后端逻辑** 进行深度优化，重点解决“标记回显与编辑”、“AI 指令隐形化”以及“无损切图标记”三个核心问题。

## 1. 核心变更点

### 1.1 标记识别与回显 (双向同步)
*   **现状**：UI 仅支持单向写入标记，无法读取当前选中图层的已有标记。
*   **改进**：
    *   **后端监听**：在 `code.ts` 中监听 `selectionchange` 事件。
    *   **解析逻辑**：选中图层时，自动解析其名称（如 `#slot:img:banner`），提取类型、ID、状态。
    *   **前端回显**：将解析结果发送给 UI，自动填充到输入框中，允许用户直接修改 ID 或类型并重新应用。

### 1.2 AI 指令层优化 (隐形与编辑)
*   **现状**：`#prompt` 层是可见的，且只能在 Figma 画布中编辑。
*   **改进**：
    *   **默认隐藏**：新建 `#prompt` 图层时，自动设置 `visible = false`，不干扰视觉稿。
    *   **面板编辑**：选中父级 Frame 时，插件自动查找子级中的 `#prompt` 内容并显示在 `Textarea` 中。用户在插件中修改文字，自动同步更新隐藏的图层内容。

### 1.3 "设为切图" (无损标记)
*   **现状**：使用 `figma.flatten()` 破坏性地合并图层。
*   **改进**：
    *   **仅标记**：按钮改为“设为切图 (#static)”，仅将图层重命名为 `#static`，**保留原有图层结构**。
    *   **导出逻辑**：代码生成引擎（已在上一轮实现）会拦截 `#static` 标记，自动将该节点（及其所有子节点）导出为单张图片，不再生成内部代码。

## 2. 执行步骤

### Phase 1: 后端逻辑改造 (`code.ts`)
1.  **增强 Selection Listener**：
    *   当 `selectionchange` 触发时，发送 `update-selection-tags` 消息。
    *   消息载荷包含：`currentTag` (解析后的标记), `aiInstruction` (查找子节点 `#prompt` 的内容), `isStatic` (是否包含 `#static`)。
2.  **修改 Command Handlers**：
    *   `add-ai-instruction`: 创建文本节点后立即设为 `visible = false`。
    *   `update-ai-instruction`: 新增处理器，用于更新隐藏的 `#prompt` 图层内容。
    *   `toggle-static`: 替代 `flatten-layer`，仅执行重命名操作。

### Phase 2: 前端 UI 升级 (`TaggingPanel.tsx`)
1.  **状态管理**：新增 `useEffect` 监听后端发来的 `update-selection-tags` 消息，更新本地 state。
2.  **AI 指令区重构**：
    *   将按钮改为多行文本输入框 (`Textarea`)。
    *   增加“保存指令”或实时保存逻辑。
3.  **切图功能重构**：
    *   将“一键 Flatten” 按钮文案改为 “设为切图 (#static)”。
    *   改为 Toggle 样式（如果已标记则显示高亮/取消状态）。

### Phase 3: 验证
1.  **回显测试**：选中已标记 `#slot:img:test` 的图层，确认面板下拉框和输入框自动更新。
2.  **AI 指令测试**：添加指令后确认图层不可见；在面板修改指令后确认导出的代码（JSX 注释）同步更新。
3.  **切图测试**：对一个 Group 标记 `#static`，确认图层结构未变；导出代码时确认为 `<img src="..." />`。
