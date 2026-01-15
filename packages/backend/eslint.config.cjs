const js = require("@eslint/js");
const typescriptParser = require("@typescript-eslint/parser");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        // 运行时全局
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        document: "readonly",
        atob: "readonly",

        // Figma plugin typings 的全局变量/类型（backend 里会直接用到）
        figma: "readonly",

        BaseNode: "readonly",
        SceneNode: "readonly",
        NodeType: "readonly",
        ChildrenMixin: "readonly",
        ExportMixin: "readonly",
        MinimalFillsMixin: "readonly",
        StyledTextSegment: "readonly",

        // 常用 figma typings
        ExportSettings: "readonly",
        ExportSettingsSVGString: "readonly",
        ExportSettingsImage: "readonly",
        DropShadowEffect: "readonly",
        InnerShadowEffect: "readonly",
        Effect: "readonly",
        DimensionAndPositionMixin: "readonly",
        InferredAutoLayoutResult: "readonly",
        LineHeight: "readonly",
        LetterSpacing: "readonly",
        MinimalBlendMixin: "readonly",
        SceneNodeMixin: "readonly",
        LayoutMixin: "readonly",
        GeometryMixin: "readonly",
        BlendMixin: "readonly",
        ColorStop: "readonly",
        SolidPaint: "readonly",
        Paint: "readonly",
        ImagePaint: "readonly",
        RGB: "readonly",
        RGBA: "readonly",
        FontName: "readonly",
        PluginAPI: "readonly",
        GroupNode: "readonly",
        TextNode: "readonly",
        FrameNode: "readonly",
        InstanceNode: "readonly",
        ComponentNode: "readonly",
        ComponentSetNode: "readonly",
        LineNode: "readonly",
        SectionNode: "readonly",
        RectangleNode: "readonly",
        TextCase: "readonly",
        TextDecoration: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      "valid-jsdoc": "off",
      "max-len": "off",
      "no-negated-condition": "off",
      complexity: "off",
      "default-case": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "space-before-function-paren": [
        "error",
        {
          anonymous: "never",
          named: "never",
          asyncArrow: "always",
        },
      ],
      "import/no-import-module-exports": "off",

      // backend 也会依赖 figma typings 的全局类型；避免误报
      "no-undef": "off",

      // 该仓库大量使用 figma typings 全局类型与部分未使用参数，避免在重构阶段被 lint 阻塞
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-fallthrough": "off",
      "no-case-declarations": "off",

      // 兼容仓库既有格式
      "space-before-function-paren": "off",
    },
  },
  js.configs.recommended,
  {
    rules: {
      // 确保 recommended 不覆盖上面针对本仓库的放宽配置
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-fallthrough": "off",
      "no-case-declarations": "off",
    },
  },
];

