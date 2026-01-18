# 修改图片上传时机为“点击复制时触发”

为了满足“点击复制代码时才上传图片，并显示 Loading”的需求，我们需要将代码生成流程拆分为“预览模式”和“复制模式”。

## 后端修改 (Backend)

1.  **`packages/backend/src/code.ts`**:
    *   修改 `run` 函数，增加 `options` 参数（包含 `isPreview` 和 `triggerType`）。
    *   默认的 `selectionchange` 事件触发时，调用 `run(..., { isPreview: true, triggerType: "selection" })`。
    *   新增监听消息 `copy-code-request`，触发时调用 `run(..., { isPreview: false, triggerType: "copy" })`。
    *   在发送给 UI 的消息中，透传 `triggerType` 字段，以便 UI 区分是预览更新还是复制结果。

2.  **`packages/backend/src/common/retrieveUI/convertToCode.ts`**:
    *   修改 `convertToCode` 函数签名，支持传入 `options` 并传递给 `tailwindMain`。

3.  **`packages/backend/src/tailwind/tailwindMain.ts`**:
    *   修改 `tailwindContainer` 和 `convertNode` 中的上传逻辑：
        *   **预览模式 (`isPreview: true`)**: 即使开启了自动上传，也**不执行上传**，直接使用 Base64 或占位符（保持现有预览逻辑）。
        *   **复制模式 (`isPreview: false`)**: 如果开启了自动上传，执行 `getOrUploadAsset` 上传逻辑。

4.  **`packages/types/src/types.ts`**:
    *   更新 `ConversionMessage` 类型，增加 `triggerType?: string` 字段。

## 前端修改 (UI)

1.  **`packages/plugin-ui/src/components/CopyButton.tsx`**:
    *   增加 `loading` 状态和 UI（加载转圈图标）。
    *   新增 `onCopyRequest` 属性（类型：`() => Promise<string>`）。
    *   点击逻辑改为：`setLoading(true)` -> `await onCopyRequest()` -> `copy(result)` -> `setLoading(false)` -> `setCopied(true)`。

2.  **`apps/plugin/ui-src/App.tsx`**:
    *   实现 `handleCopyCode` 方法：
        *   创建一个 Promise，将 `resolve` 函数存入 `useRef`。
        *   发送 `copy-code-request` 消息给后端。
        *   返回该 Promise。
    *   在 `onmessage` 处理中：
        *   如果收到 `type: "code"` 且 `triggerType === "copy"`，取出 `useRef` 中的 `resolve` 函数并执行，将代码传递回去。

3.  **组件透传**:
    *   将 `handleCopyCode` 通过 `PluginUI` -> `CodePanel` 一路透传给 `CopyButton`。

## 验证计划
1.  **预览测试**：选中图片节点，确认代码面板显示的是占位符/Base64，且控制台/网络面板无上传请求。
2.  **复制测试**：点击“复制”按钮，按钮应显示 Loading 状态。
3.  **上传验证**：Loading 结束后，剪贴板中的代码应包含 R2 的 URL（`https://r2-asset-worker...`）。
4.  **功能验证**：确认生成的 URL 可访问，且图片内容正确。
