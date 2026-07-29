import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".react-router/**",
      "build/**",
      "eslint.config.js",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
);
