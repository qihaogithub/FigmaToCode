I will modify `packages/backend/src/html/htmlMain.ts` to fix the preview issues.

1.  **Update `generateHTMLPreview`**:
    *   Change the `isPreview` argument in the `htmlMain` call to be always `true`. This ensures that the preview generation logic (like exporting images) is active regardless of the number of selected nodes.

2.  **Modify `convertNode` in `htmlMain.ts`**:
    *   Add an interceptor for nodes named `#static` (similar to how it's done in `tailwindMain.ts`).
    *   If a node is marked `#static`, it will be exported as an image (Base64 for preview).
    *   This ensures that layers marked with `#static` are rendered as images in the preview instead of being processed as standard HTML containers.

3.  **Update `htmlContainer` in `htmlMain.ts`**:
    *   Modify the condition for embedding images.
    *   Currently, it checks `settings.embedImages` and `framework === "HTML"`.
    *   I will add a check for `isPreviewGlobal`. If `isPreviewGlobal` is true, it should also export the node as a Base64 image.
    *   This fixes the issue where regular image layers appear as placeholders in the preview.

4.  **Add necessary imports**:
    *   Import `exportNodeAsBytes` and `getOrUploadAsset` (if implementing full parity for asset upload) or just rely on `exportNodeAsBase64PNG` for the preview fix. I will aim for full parity to support code generation scenarios as well.

This approach directly addresses both user requirements: handling `#static` tags and ensuring images display correctly in the preview.