import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{js,jsx,ts}", "api/**/*.test.ts"],
    environment: "node",
    // The calculation core must stay fully tested: every line and branch.
    coverage: {
      provider: "v8",
      include: ["src/lib/calc/**"],
      exclude: ["**/*.test.*", "src/lib/calc/types.ts", "src/lib/calc/index.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
