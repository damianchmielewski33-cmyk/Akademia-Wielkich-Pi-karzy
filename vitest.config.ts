import path from "path";
import { defineConfig } from "vitest/config";

const root = path.resolve(process.cwd());

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
