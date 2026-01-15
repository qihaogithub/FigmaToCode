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
        // 浏览器/运行时全局变量
        window: "readonly",
        document: "readonly",
        parent: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",

        // 兼容 figma typings（有些场景会用到）
        figma: "readonly",

        // React 17+ 新 JSX Transform 下，部分文件可能未显式引入 React
        React: "readonly",
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

      // 该仓库代码风格不要求对未使用的参数/变量做逐一清理
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  js.configs.recommended,
  {
    rules: {
      // 确保推荐规则不要覆盖上面针对本仓库的放宽配置
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

