import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**", "api/**", "**/*.ts"] },
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  js.configs.recommended,
  { rules: { "no-empty": ["error", { allowEmptyCatch: true }] } },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // JSX identifiers count as used; without eslint-plugin-react this rule
      // can't see them, so ignore capitalised names instead.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", args: "none", caughtErrors: "none" }],
    },
  },
  {
    files: ["*.{js,cjs,mjs}", "src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.node } },
  },
];
