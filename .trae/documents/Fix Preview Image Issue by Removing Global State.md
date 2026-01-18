I will modify `packages/backend/src/html/htmlMain.ts` to fix the race condition/scoping issue with `isPreviewGlobal` by passing `isPreview` explicitly through the settings object.

1.  **Refactor Internal Functions**:
    *   Define a type `ExtendedHTMLSettings = HTMLSettings & { isPreview?: boolean }`.
    *   Update `htmlWidgetGenerator`, `convertNode`, `htmlGroup`, `htmlFrame`, `htmlSection`, `htmlText`, `htmlLine`, `htmlWrapSVG`, and `htmlContainer` to accept `ExtendedHTMLSettings` instead of `HTMLSettings`.

2.  **Update `htmlMain`**:
    *   In `htmlMain`, construct an `extendedSettings` object: `{ ...settings, isPreview }`.
    *   Pass this `extendedSettings` to `htmlWidgetGenerator`.

3.  **Update `generateHTMLPreview`**:
    *   Ensure it calls `htmlMain` with `isPreview: true` (already done, but good to verify).

4.  **Remove Global State**:
    *   Remove `export let isPreviewGlobal = false;`.
    *   Replace all usages of `isPreviewGlobal` with `settings.isPreview`.

5.  **Verify Logic**:
    *   In `convertNode` (for `#static`), check `settings.isPreview`.
    *   In `htmlContainer`, check `settings.isPreview` for image embedding.

This ensures that the preview generation context is correctly propagated down the call stack, regardless of concurrent executions or module state.