I will translate the Figma plugin UI to Chinese by modifying the following files:

1.  **`packages/plugin-ui/src/PluginUI.tsx`**:
    - Translate "Preview" to "预览", "Code" to "代码", "About" to "关于".
    - Translate "No preview available" to "暂无预览".
    - Translate "About 页面暂未实现" to "About 页面暂未实现" (keep consistent or fully translate if needed).

2.  **`packages/plugin-ui/src/components/EmptyState.tsx`**:
    - Translate "未选择图层" to "未选择图层".
    - Translate instructions and steps ("Select", "Choose a layer", "View", "See the code", "Copy", "Use anywhere") to Chinese.

3.  **`packages/plugin-ui/src/codegenPreferenceOptions.ts`**:
    - Translate all setting labels (`label`) and descriptions (`description`) to Chinese (e.g., "Layer names" -> "图层名称", "Embed Images" -> "嵌入图片").
    - Translate "Mode" to "模式".

4.  **`packages/plugin-ui/src/components/CodePanel.tsx`**:
    - Translate "{selectedFramework} Options" to "{selectedFramework} 选项".
    - Translate "Styling Options" to "样式选项".
    - Translate "Show Less" / "Show More" to "收起" / "展开更多".
    - Translate the "Show more code..." tooltip/aria-label to Chinese.

5.  **`packages/plugin-ui/src/components/Preview.tsx`**:
    - Translate the background toggle tooltip "Switch to ... background" to "切换到...背景".

6.  **`packages/plugin-ui/src/components/TailwindSettings.tsx`**:
    - Translate "Advanced Settings" to "高级设置".
    - Translate labels and help texts for "Custom Class Prefix", "Base Font Size", "Rounding Threshold", "Base Font Family", "Font Family Custom Config".
    - Translate static help paragraphs.

7.  **`packages/plugin-ui/src/components/CustomPrefixInput.tsx`**:
    - Translate validation messages ("Input cannot contain spaces", etc.).
    - Translate UI states ("Preview", "Done", "Applied", "Press Enter...").

8.  **`packages/plugin-ui/src/components/WarningsPanel.tsx`**:
    - Translate "Warning(s)", "critical", "All", "Other".
    - Translate "Tip:", "Info", and the help message at the bottom.
    - Translate the suggestion helper functions.

I will perform these modifications sequentially.
