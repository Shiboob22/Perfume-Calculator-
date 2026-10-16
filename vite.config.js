import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

// Error reports carry the build they came from (the Vercel commit, short).
process.env.VITE_RELEASE ??= (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);

// The home page's scroll scene (the `compounding` flag). A build with the flag
// on prerenders it, so it is part of the page; a build without it keeps the
// scene out of the first script and loads it only if a device switches it on.
const scene = (file) => fileURLToPath(new URL(`./src/site/compounding/${file}`, import.meta.url));

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@compounding-scene": scene(loadEnv(mode, process.cwd(), "VITE_").VITE_FLAG_COMPOUNDING === "1" || process.env.VITE_FLAG_COMPOUNDING === "1" ? "entry.on.jsx" : "entry.off.jsx"),
    },
  },
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
}));
