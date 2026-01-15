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
        // Figma plugin typings 提供的全局类型，避免触发 no-undef
        BaseNode: "readonly",
        SceneNode: "readonly",
        ChildrenMixin: "readonly",
        ExportMixin: "readonly",
        MinimalFillsMixin: "readonly",
        StyledTextSegment: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      // 沿用原来的规则
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

      // types 包里会直接引用 figma typings 的全局类型；保留规则但不再报未定义
      "no-undef": "off",
    },
  },
  js.configs.recommended,
];

