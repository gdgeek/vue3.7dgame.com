import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ["vue", "@vueuse/core", "pinia", "vue-router", "vue-i18n"],
      dts: false,
      vueTemplate: true,
    }),
  ],
  define: {
    __APP_INFO__: JSON.stringify({
      pkg: {
        name: "test-app",
        version: "0.0.0-test",
      },
      buildTimestamp: 0,
    }),
  },
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
    setupFiles: ["./test/setup.ts"],
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
        // build/tool configs
        "node_modules",
        "dist",
        "**/*.d.ts",
        "test/**",
        "vite.config.ts",
        "vitest.config.ts",
        "**/*.spec.ts",
        "**/*.test.ts",
        ".storybook/**",
        ".eslintrc.cjs",
        ".prettierrc.cjs",
        ".stylelintrc.cjs",
        "commitlint.config.cjs",
        "postcss.config.cjs",
        "stylelint.config.cjs",
        "lighthouserc.config.ts",
        "server.cjs",
        "uno.config.ts",
        "scripts/**",
        "mock/**",
        // 静态资源 & 公共 JS 库（无业务逻辑）
        "public/**",
        "src/assets/**",
        // i18n 翻译文件（纯数据对象，无可测试逻辑）
        "src/lang/**",
        // 主题样式配置（纯数据）
        "src/styles/**",
        // 应用入口（无独立可测试逻辑）
        "src/main.ts",
        "src/App.vue",
        "src/environment.ts",
        // 复杂 3D 编辑器视图（依赖 WebGL / Three.js，jsdom 无法渲染）
        "src/views/meta/ScenePlayer.vue",
        "src/views/meta/script.vue",
        "src/views/verse/ScenePlayer.vue",
        "src/views/verse/script.vue",
        "src/views/verse/composables/useModelLoader.ts",
        "src/views/meta-verse/index.vue",
        "src/views/meta-verse/public.vue",
        "src/views/meta-verse/composables/**",
        "src/views/audio/**",
      ],
      // 覆盖率阈值（当前组件层实际覆盖约33%；阈值随组件测试补充逐步提升）
      thresholds: {
        lines: 32,
      },
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
