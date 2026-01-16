import { LocalCodegenPreferenceOptions, SelectPreferenceOptions } from "types";

export const preferenceOptions: LocalCodegenPreferenceOptions[] = [
  {
    itemType: "individual_select",
    propertyName: "useTailwind4",
    label: "Tailwind 4",
    description: "启用 Tailwind CSS 4.0 的特性和语法。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "showLayerNames",
    label: "图层名称",
    description: "在类名中包含 Figma 图层名称。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "roundTailwindValues",
    label: "取整数值",
    description:
      "将像素值取整为最接近的 Tailwind 尺寸（15% 误差范围内）。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "roundTailwindColors",
    label: "取整颜色",
    description: "将 Figma 颜色值取整为最接近的 Tailwind 颜色。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "useColorVariables",
    label: "颜色变量",
    description:
      "使用 Figma 变量作为颜色导出代码。例如：使用 'bg-background' 而不是 'bg-white'。",
    isDefault: true,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "embedImages",
    label: "嵌入图片",
    description:
      "将 Figma 图片转换为 Base64 并嵌入代码中。这可能会很慢。如果图片过多，可能会导致 Figma 卡顿。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
  {
    itemType: "individual_select",
    propertyName: "embedVectors",
    label: "嵌入矢量图",
    description:
      "启用此选项将矢量形状转换为 SVG 并嵌入设计中。这可能是一个缓慢的操作。如果不选中，形状将被转换为矩形。",
    isDefault: false,
    includedLanguages: ["Tailwind"],
  },
];

export const selectPreferenceOptions: SelectPreferenceOptions[] = [
  {
    itemType: "select",
    propertyName: "tailwindGenerationMode",
    label: "模式",
    options: [
      { label: "HTML", value: "html" },
      { label: "React (JSX)", value: "jsx" },
    ],
    includedLanguages: ["Tailwind"],
  },
];
