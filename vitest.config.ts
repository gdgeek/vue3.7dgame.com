import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    // 测试环境
    environment: "jsdom",
    // 全局变量（无需每次导入 describe, it, expect 等）
    globals: true,
    // 包含的测试文件
    include: ["test/**/*.{test,spec}.{js,ts}", "src/**/*.{test,spec}.{js,ts}"],
    // 排除的文件
    exclude: ["node_modules", "dist"],
    // 覆盖率配置
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules",
        "dist",
        "**/*.d.ts",
        "test/**",
        "vite.config.ts",
        "vitest.config.ts",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
      // 覆盖率阈值（可选，逐步启用）
      // thresholds: {
      //   lines: 50,
      //   functions: 50,
      //   branches: 50,
      //   statements: 50,
      // },
    },
    // 测试超时时间
    testTimeout: 10000,
    // 设置快照测试目录
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
  },
});
