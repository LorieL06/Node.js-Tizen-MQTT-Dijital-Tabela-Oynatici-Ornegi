import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    exclude: ["dist/**", "dist-tv/**", "node_modules/**"],
  },
});
