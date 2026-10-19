import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "dist-ssr/**", "design/**", "Design/**", ".claude/**", "node_modules/**", "api/**", "**/*.ts"] },
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
  // Route changes run as View Transitions through the motion layer's wrappers.
  {
    files: ["src/**/*.{js,jsx}"],
    ignores: ["src/motion/**", "src/main.jsx", "src/entry-server.jsx"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "react-router-dom", importNames: ["Link", "useNavigate"], message: "Import Link and useNavigate from src/motion (route changes run as View Transitions)." }],
      }],
    },
  },
  {
    files: ["*.{js,cjs,mjs}", "scripts/**/*.{js,mjs}", "src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.node } },
  },
  // Playwright specs run in Node but pass callbacks into the page.
  {
    files: ["e2e/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
