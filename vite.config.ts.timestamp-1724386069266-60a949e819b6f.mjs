// vite.config.ts
import vue from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/@vitejs+plugin-vue@5.0.5_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2__vue@3.4.27_typescript@5.5.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/@vitejs+plugin-vue-jsx@3.1.0_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2__vue@3.4.27_typescript@5.5.3_/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import { loadEnv, defineConfig } from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2/node_modules/vite/dist/node/index.js";
import AutoImport from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unplugin-auto-import@0.17.8_@vueuse+core@10.11.0_vue@3.4.27_typescript@5.5.3___rollup@4.18.1/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unplugin-vue-components@0.26.0_@babel+parser@7.24.8_rollup@4.18.1_vue@3.4.27_typescript@5.5.3_/node_modules/unplugin-vue-components/dist/vite.js";
import { ElementPlusResolver } from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unplugin-vue-components@0.26.0_@babel+parser@7.24.8_rollup@4.18.1_vue@3.4.27_typescript@5.5.3_/node_modules/unplugin-vue-components/dist/resolvers.js";
import Icons from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unplugin-icons@0.18.5_@vue+compiler-sfc@3.4.37_vue-template-es2015-compiler@1.9.1/node_modules/unplugin-icons/dist/vite.js";
import IconsResolver from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unplugin-icons@0.18.5_@vue+compiler-sfc@3.4.37_vue-template-es2015-compiler@1.9.1/node_modules/unplugin-icons/dist/resolver.js";
import { createSvgIconsPlugin } from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-svg-icons@2.0.1_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2_/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import mockDevServerPlugin from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-mock-dev-server@1.5.1_rollup@4.18.1_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2_/node_modules/vite-plugin-mock-dev-server/dist/index.js";
import UnoCSS from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/unocss@0.58.9_postcss@8.4.39_rollup@4.18.1_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_terser@5.31.2_/node_modules/unocss/dist/vite.mjs";
import { resolve } from "path";

// package.json
var name = "\u82F9\u679CAR\u5143\u6C14\u9879\u76EE";
var version = "2.11.3";
var dependencies = {
  "@casl/ability": "^6.7.1",
  "@casl/vue": "^2.2.2",
  "@element-plus/icons-vue": "^2.3.1",
  "@fortawesome/fontawesome-svg-core": "^6.6.0",
  "@fortawesome/free-solid-svg-icons": "^6.6.0",
  "@fortawesome/vue-fontawesome": "^3.0.8",
  "@types/dompurify": "^3.0.5",
  "@types/three": "^0.167.1",
  "@vueuse/core": "^10.11.0",
  "animate.css": "^4.1.1",
  axios: "^1.7.2",
  color: "^4.2.3",
  "cos-js-sdk-v5": "^1.8.3",
  dompurify: "^3.1.6",
  "element-china-area-data": "^6.1.0",
  "element-plus": "^2.7.7",
  "element-resize-detector": "^1.2.4",
  "highlight.js": "^11.10.0",
  moment: "^2.30.1",
  nprogress: "^0.2.0",
  path: "^0.12.7",
  "path-browserify": "^1.0.1",
  "path-to-regexp": "^6.2.2",
  pinia: "^2.1.7",
  "qrcode.vue": "^3.4.1",
  querystringify: "^2.2.0",
  rete: "^2.0.3",
  "rete-area-plugin": "^2.0.4",
  "rete-auto-arrange-plugin": "^2.0.1",
  "rete-connection-plugin": "^2.0.3",
  "rete-context-menu-plugin": "^2.0.3",
  "rete-engine": "^2.0.1",
  "rete-vue-render-plugin": "^0.5.2",
  "spark-md5": "^3.0.2",
  three: "^0.167.0",
  uuid: "^10.0.0",
  vue: "^3.4.27",
  "vue-cropper": "^1.1.4",
  "vue-hljs": "^3.0.1",
  "vue-i18n": "9.9.1",
  "vue-iframes": "^0.0.21",
  "vue-router": "^4.3.3",
  "vue-waterfall-plugin": "3.3.1",
  "vue-waterfall-plugin-next": "2.4.3",
  "vue3-editor": "^0.1.1"
};
var devDependencies = {
  "@commitlint/cli": "^18.6.1",
  "@commitlint/config-conventional": "^18.6.3",
  "@iconify-json/ep": "^1.1.15",
  "@types/color": "^3.0.6",
  "@types/element-resize-detector": "^1.1.6",
  "@types/node": "^20.14.2",
  "@types/nprogress": "^0.2.3",
  "@types/path-browserify": "^1.0.2",
  "@types/querystringify": "^2.0.2",
  "@types/spark-md5": "^3.0.4",
  "@types/uuid": "^10.0.0",
  "@typescript-eslint/eslint-plugin": "^7.13.0",
  "@typescript-eslint/parser": "^7.13.0",
  "@vitejs/plugin-vue": "^5.0.5",
  "@vitejs/plugin-vue-jsx": "^3.1.0",
  autoprefixer: "^10.4.19",
  commitizen: "^4.3.0",
  "cz-git": "^1.9.3",
  eslint: "^8.57.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-import": "^2.29.1",
  "eslint-plugin-prettier": "^5.1.3",
  "eslint-plugin-vue": "^9.26.0",
  "fast-glob": "^3.3.2",
  husky: "^9.0.11",
  "lint-staged": "^15.2.7",
  postcss: "^8.4.38",
  "postcss-html": "^1.7.0",
  "postcss-scss": "^4.0.9",
  prettier: "^3.3.2",
  sass: "^1.77.5",
  stylelint: "^16.6.1",
  "stylelint-config-html": "^1.1.0",
  "stylelint-config-recess-order": "^4.6.0",
  "stylelint-config-recommended-scss": "^14.0.0",
  "stylelint-config-recommended-vue": "^1.5.0",
  "stylelint-config-standard": "^36.0.0",
  terser: "^5.31.1",
  typescript: "^5.4.5",
  unocss: "^0.58.9",
  "unplugin-auto-import": "^0.17.6",
  "unplugin-icons": "^0.18.5",
  "unplugin-vue-components": "^0.26.0",
  vite: "^5.2.13",
  "vite-plugin-mock-dev-server": "^1.5.0",
  "vite-plugin-svg-icons": "^2.0.1",
  "vite-plugin-vue-devtools": "^7.2.1",
  "vue-tsc": "^2.0.21"
};
var engines = {
  node: ">=18.0.0"
};

// vite.config.ts
import VueDevTools from "file:///C:/Users/94991/Desktop/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-vue-devtools@7.3.6_rollup@4.18.1_vite@5.3.3_@types+node@20.14.10_sass@1.77.8_ters_s5sulipipefqp2hnh2pybdsye4/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
var __vite_injected_original_dirname = "C:\\Users\\94991\\Desktop\\\u65B0\u5EFA\u6587\u4EF6\u5939\\vue3.7dgame.com";
var __APP_INFO__ = {
  pkg: { name, version, engines, dependencies, devDependencies },
  buildTimestamp: Date.now()
};
var pathSrc = resolve(__vite_injected_original_dirname, "src");
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    resolve: {
      alias: {
        "@": pathSrc
      }
    },
    css: {
      // CSS 预处理器
      preprocessorOptions: {
        // 定义全局 SCSS 变量
        scss: {
          javascriptEnabled: true,
          additionalData: `
            @use "@/styles/variables.scss" as *;
          `
        }
      }
    },
    server: {
      // 允许IP访问
      host: "0.0.0.0",
      // 应用端口 (默认:3000)
      port: Number(env.VITE_APP_PORT),
      // 运行是否自动打开浏览器
      open: true,
      proxy: {
        /** 代理前缀为 /dev-api 的请求  */
        [env.VITE_APP_BASE_API]: {
          changeOrigin: true,
          // 接口地址
          target: env.VITE_APP_API_URL,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API), "")
        }
      }
    },
    plugins: [
      vue(),
      // jsx、tsx语法支持
      vueJsx(),
      // MOCK 服务
      env.VITE_MOCK_DEV_SERVER === "true" ? mockDevServerPlugin() : null,
      UnoCSS({
        hmrTopLevelAwait: false
      }),
      // 自动导入参考： https://github.com/sxzz/element-plus-best-practices/blob/main/vite.config.ts
      AutoImport({
        // 自动导入 Vue 相关函数，如：ref, reactive, toRef 等
        imports: ["vue", "@vueuse/core", "pinia", "vue-router", "vue-i18n"],
        resolvers: [
          // 自动导入 Element Plus 相关函数，如：ElMessage, ElMessageBox... (带样式)
          ElementPlusResolver(),
          // 自动导入图标组件
          IconsResolver({})
        ],
        eslintrc: {
          // 是否自动生成 eslint 规则，建议生成之后设置 false
          enabled: false,
          // 指定自动导入函数 eslint 规则的文件
          filepath: "./.eslintrc-auto-import.json",
          globalsPropValue: true
        },
        // 是否在 vue 模板中自动导入
        vueTemplate: true,
        // 指定自动导入函数TS类型声明文件路径 (false:关闭自动生成)
        dts: false
        // dts: "src/typings/auto-imports.d.ts",
      }),
      Components({
        resolvers: [
          // 自动导入 Element Plus 组件
          ElementPlusResolver(),
          // 自动注册图标组件
          IconsResolver({
            // element-plus图标库，其他图标库 https://icon-sets.iconify.design/
            enabledCollections: ["ep"]
          })
        ],
        // 指定自定义组件位置(默认:src/components)
        dirs: ["src/components", "src/**/components"],
        // 指定自动导入组件TS类型声明文件路径 (false:关闭自动生成)
        dts: false
        // dts: "src/typings/components.d.ts",
      }),
      Icons({
        compiler: "vue3",
        // 自动安装图标库
        autoInstall: true
      }),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [resolve(pathSrc, "assets/icons")],
        // 指定symbolId格式
        symbolId: "icon-[dir]-[name]"
      }),
      VueDevTools({
        openInEditorHost: `http://localhost:${env.VITE_APP_PORT}`
      })
    ],
    // 预加载项目必需的组件
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "pinia",
        "axios",
        "@vueuse/core",
        "path-to-regexp",
        "vue-i18n",
        "path-browserify",
        "element-plus/es/components/form/style/css",
        "element-plus/es/components/form-item/style/css",
        "element-plus/es/components/button/style/css",
        "element-plus/es/components/input/style/css",
        "element-plus/es/components/input-number/style/css",
        "element-plus/es/components/switch/style/css",
        "element-plus/es/components/upload/style/css",
        "element-plus/es/components/menu/style/css",
        "element-plus/es/components/col/style/css",
        "element-plus/es/components/icon/style/css",
        "element-plus/es/components/row/style/css",
        "element-plus/es/components/tag/style/css",
        "element-plus/es/components/dialog/style/css",
        "element-plus/es/components/loading/style/css",
        "element-plus/es/components/radio/style/css",
        "element-plus/es/components/radio-group/style/css",
        "element-plus/es/components/popover/style/css",
        "element-plus/es/components/scrollbar/style/css",
        "element-plus/es/components/tooltip/style/css",
        "element-plus/es/components/dropdown/style/css",
        "element-plus/es/components/dropdown-menu/style/css",
        "element-plus/es/components/dropdown-item/style/css",
        "element-plus/es/components/sub-menu/style/css",
        "element-plus/es/components/menu-item/style/css",
        "element-plus/es/components/divider/style/css",
        "element-plus/es/components/card/style/css",
        "element-plus/es/components/link/style/css",
        "element-plus/es/components/breadcrumb/style/css",
        "element-plus/es/components/breadcrumb-item/style/css",
        "element-plus/es/components/table/style/css",
        "element-plus/es/components/tree-select/style/css",
        "element-plus/es/components/table-column/style/css",
        "element-plus/es/components/select/style/css",
        "element-plus/es/components/option/style/css",
        "element-plus/es/components/pagination/style/css",
        "element-plus/es/components/tree/style/css",
        "element-plus/es/components/alert/style/css",
        "element-plus/es/components/radio-button/style/css",
        "element-plus/es/components/checkbox-group/style/css",
        "element-plus/es/components/checkbox/style/css",
        "element-plus/es/components/tabs/style/css",
        "element-plus/es/components/tab-pane/style/css",
        "element-plus/es/components/rate/style/css",
        "element-plus/es/components/date-picker/style/css",
        "element-plus/es/components/notification/style/css",
        "element-plus/es/components/image/style/css",
        "element-plus/es/components/statistic/style/css",
        "element-plus/es/components/watermark/style/css",
        "element-plus/es/components/config-provider/style/css",
        "element-plus/es/components/text/style/css",
        "element-plus/es/components/drawer/style/css",
        "element-plus/es/components/color-picker/style/css",
        "element-plus/es/components/backtop/style/css"
      ]
    },
    // 构建配置
    build: {
      chunkSizeWarningLimit: 2e3,
      // 消除打包大小超过500kb警告
      minify: "terser",
      // Vite 2.6.x 以上需要配置 minify: "terser", terserOptions 才能生效
      terserOptions: {
        compress: {
          keep_infinity: true,
          // 防止 Infinity 被压缩成 1/0，这可能会导致 Chrome 上的性能问题
          drop_console: true,
          // 生产环境去除 console
          drop_debugger: true
          // 生产环境去除 debugger
        },
        format: {
          comments: false
          // 删除注释
        }
      },
      rollupOptions: {
        output: {
          // manualChunks: {
          //   "vue-i18n": ["vue-i18n"],
          // },
          // 用于从入口点创建的块的打包输出格式[name]表示文件名,[hash]表示该文件内容hash值
          entryFileNames: "js/[name].[hash].js",
          // 用于命名代码拆分时创建的共享块的输出命名
          chunkFileNames: "js/[name].[hash].js",
          // 用于输出静态资源的命名，[ext]表示文件扩展名
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            let extType = info[info.length - 1];
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
              extType = "media";
            } else if (/\.(png|jpe?g|gif|svg)(\?.*)?$/.test(assetInfo.name)) {
              extType = "img";
            } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
              extType = "fonts";
            }
            return `${extType}/[name].[hash].[ext]`;
          }
        }
      }
    },
    define: {
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTQ5OTFcXFxcRGVza3RvcFxcXFxcdTY1QjBcdTVFRkFcdTY1ODdcdTRFRjZcdTU5MzlcXFxcdnVlMy43ZGdhbWUuY29tXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw5NDk5MVxcXFxEZXNrdG9wXFxcXFx1NjVCMFx1NUVGQVx1NjU4N1x1NEVGNlx1NTkzOVxcXFx2dWUzLjdkZ2FtZS5jb21cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzk0OTkxL0Rlc2t0b3AvJUU2JTk2JUIwJUU1JUJCJUJBJUU2JTk2JTg3JUU0JUJCJUI2JUU1JUE0JUI5L3Z1ZTMuN2RnYW1lLmNvbS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB2dWUgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXZ1ZVwiO1xuaW1wb3J0IHZ1ZUpzeCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tdnVlLWpzeFwiO1xuaW1wb3J0IHsgVXNlckNvbmZpZywgQ29uZmlnRW52LCBsb2FkRW52LCBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tIFwidW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZVwiO1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGVcIjtcbmltcG9ydCB7IEVsZW1lbnRQbHVzUmVzb2x2ZXIgfSBmcm9tIFwidW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzXCI7XG5pbXBvcnQgSWNvbnMgZnJvbSBcInVucGx1Z2luLWljb25zL3ZpdGVcIjtcbmltcG9ydCBJY29uc1Jlc29sdmVyIGZyb20gXCJ1bnBsdWdpbi1pY29ucy9yZXNvbHZlclwiO1xuXG5pbXBvcnQgeyBjcmVhdGVTdmdJY29uc1BsdWdpbiB9IGZyb20gXCJ2aXRlLXBsdWdpbi1zdmctaWNvbnNcIjtcbmltcG9ydCBtb2NrRGV2U2VydmVyUGx1Z2luIGZyb20gXCJ2aXRlLXBsdWdpbi1tb2NrLWRldi1zZXJ2ZXJcIjtcblxuaW1wb3J0IFVub0NTUyBmcm9tIFwidW5vY3NzL3ZpdGVcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHtcbiAgbmFtZSxcbiAgdmVyc2lvbixcbiAgZW5naW5lcyxcbiAgZGVwZW5kZW5jaWVzLFxuICBkZXZEZXBlbmRlbmNpZXMsXG59IGZyb20gXCIuL3BhY2thZ2UuanNvblwiO1xuXG4vLyBodHRwczovL2RldnRvb2xzLW5leHQudnVlanMub3JnL1xuaW1wb3J0IFZ1ZURldlRvb2xzIGZyb20gXCJ2aXRlLXBsdWdpbi12dWUtZGV2dG9vbHNcIjtcblxuLyoqIFx1NUU3M1x1NTNGMFx1NzY4NFx1NTQwRFx1NzlGMFx1MzAwMVx1NzI0OFx1NjcyQ1x1MzAwMVx1OEZEMFx1ODg0Q1x1NjI0MFx1OTcwMFx1NzY4NGBub2RlYFx1NzI0OFx1NjcyQ1x1MzAwMVx1NEY5RFx1OEQ1Nlx1MzAwMVx1Njc4NFx1NUVGQVx1NjVGNlx1OTVGNFx1NzY4NFx1N0M3Qlx1NTc4Qlx1NjNEMFx1NzkzQSAqL1xuY29uc3QgX19BUFBfSU5GT19fID0ge1xuICBwa2c6IHsgbmFtZSwgdmVyc2lvbiwgZW5naW5lcywgZGVwZW5kZW5jaWVzLCBkZXZEZXBlbmRlbmNpZXMgfSxcbiAgYnVpbGRUaW1lc3RhbXA6IERhdGUubm93KCksXG59O1xuXG5jb25zdCBwYXRoU3JjID0gcmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjXCIpO1xuLy8gIGh0dHBzOi8vY24udml0ZWpzLmRldi9jb25maWdcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH06IENvbmZpZ0Vudik6IFVzZXJDb25maWcgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCkpO1xuICByZXR1cm4ge1xuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoU3JjLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNzczoge1xuICAgICAgLy8gQ1NTIFx1OTg4NFx1NTkwNFx1NzQwNlx1NTY2OFxuICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgICAvLyBcdTVCOUFcdTRFNDlcdTUxNjhcdTVDNDAgU0NTUyBcdTUzRDhcdTkxQ0ZcbiAgICAgICAgc2Nzczoge1xuICAgICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgXG4gICAgICAgICAgICBAdXNlIFwiQC9zdHlsZXMvdmFyaWFibGVzLnNjc3NcIiBhcyAqO1xuICAgICAgICAgIGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICAvLyBcdTUxNDFcdThCQjhJUFx1OEJCRlx1OTVFRVxuICAgICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgICAvLyBcdTVFOTRcdTc1MjhcdTdBRUZcdTUzRTMgKFx1OUVEOFx1OEJBNDozMDAwKVxuICAgICAgcG9ydDogTnVtYmVyKGVudi5WSVRFX0FQUF9QT1JUKSxcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NjYyRlx1NTQyNlx1ODFFQVx1NTJBOFx1NjI1M1x1NUYwMFx1NkQ0Rlx1ODlDOFx1NTY2OFxuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgIC8qKiBcdTRFRTNcdTc0MDZcdTUyNERcdTdGMDBcdTRFM0EgL2Rldi1hcGkgXHU3Njg0XHU4QkY3XHU2QzQyICAqL1xuICAgICAgICBbZW52LlZJVEVfQVBQX0JBU0VfQVBJXToge1xuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAvLyBcdTYzQTVcdTUzRTNcdTU3MzBcdTU3NDBcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQUF9BUElfVVJMLFxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PlxuICAgICAgICAgICAgcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJeXCIgKyBlbnYuVklURV9BUFBfQkFTRV9BUEkpLCBcIlwiKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB2dWUoKSxcbiAgICAgIC8vIGpzeFx1MzAwMXRzeFx1OEJFRFx1NkNENVx1NjUyRlx1NjMwMVxuICAgICAgdnVlSnN4KCksXG4gICAgICAvLyBNT0NLIFx1NjcwRFx1NTJBMVxuICAgICAgZW52LlZJVEVfTU9DS19ERVZfU0VSVkVSID09PSBcInRydWVcIiA/IG1vY2tEZXZTZXJ2ZXJQbHVnaW4oKSA6IG51bGwsXG4gICAgICBVbm9DU1Moe1xuICAgICAgICBobXJUb3BMZXZlbEF3YWl0OiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1XHU1M0MyXHU4MDAzXHVGRjFBIGh0dHBzOi8vZ2l0aHViLmNvbS9zeHp6L2VsZW1lbnQtcGx1cy1iZXN0LXByYWN0aWNlcy9ibG9iL21haW4vdml0ZS5jb25maWcudHNcbiAgICAgIEF1dG9JbXBvcnQoe1xuICAgICAgICAvLyBcdTgxRUFcdTUyQThcdTVCRkNcdTUxNjUgVnVlIFx1NzZGOFx1NTE3M1x1NTFGRFx1NjU3MFx1RkYwQ1x1NTk4Mlx1RkYxQXJlZiwgcmVhY3RpdmUsIHRvUmVmIFx1N0I0OVxuICAgICAgICBpbXBvcnRzOiBbXCJ2dWVcIiwgXCJAdnVldXNlL2NvcmVcIiwgXCJwaW5pYVwiLCBcInZ1ZS1yb3V0ZXJcIiwgXCJ2dWUtaTE4blwiXSxcbiAgICAgICAgcmVzb2x2ZXJzOiBbXG4gICAgICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1IEVsZW1lbnQgUGx1cyBcdTc2RjhcdTUxNzNcdTUxRkRcdTY1NzBcdUZGMENcdTU5ODJcdUZGMUFFbE1lc3NhZ2UsIEVsTWVzc2FnZUJveC4uLiAoXHU1RTI2XHU2ODM3XHU1RjBGKVxuICAgICAgICAgIEVsZW1lbnRQbHVzUmVzb2x2ZXIoKSxcbiAgICAgICAgICAvLyBcdTgxRUFcdTUyQThcdTVCRkNcdTUxNjVcdTU2RkVcdTY4MDdcdTdFQzRcdTRFRjZcbiAgICAgICAgICBJY29uc1Jlc29sdmVyKHt9KSxcbiAgICAgICAgXSxcbiAgICAgICAgZXNsaW50cmM6IHtcbiAgICAgICAgICAvLyBcdTY2MkZcdTU0MjZcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTAgZXNsaW50IFx1ODlDNFx1NTIxOVx1RkYwQ1x1NUVGQVx1OEJBRVx1NzUxRlx1NjIxMFx1NEU0Qlx1NTQwRVx1OEJCRVx1N0Y2RSBmYWxzZVxuICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NVx1NTFGRFx1NjU3MCBlc2xpbnQgXHU4OUM0XHU1MjE5XHU3Njg0XHU2NTg3XHU0RUY2XG4gICAgICAgICAgZmlsZXBhdGg6IFwiLi8uZXNsaW50cmMtYXV0by1pbXBvcnQuanNvblwiLFxuICAgICAgICAgIGdsb2JhbHNQcm9wVmFsdWU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFx1NjYyRlx1NTQyNlx1NTcyOCB2dWUgXHU2QTIxXHU2NzdGXHU0RTJEXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1XG4gICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlLFxuICAgICAgICAvLyBcdTYzMDdcdTVCOUFcdTgxRUFcdTUyQThcdTVCRkNcdTUxNjVcdTUxRkRcdTY1NzBUU1x1N0M3Qlx1NTc4Qlx1NThGMFx1NjYwRVx1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCAoZmFsc2U6XHU1MTczXHU5NUVEXHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwKVxuICAgICAgICBkdHM6IGZhbHNlLFxuICAgICAgICAvLyBkdHM6IFwic3JjL3R5cGluZ3MvYXV0by1pbXBvcnRzLmQudHNcIixcbiAgICAgIH0pLFxuICAgICAgQ29tcG9uZW50cyh7XG4gICAgICAgIHJlc29sdmVyczogW1xuICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NSBFbGVtZW50IFBsdXMgXHU3RUM0XHU0RUY2XG4gICAgICAgICAgRWxlbWVudFBsdXNSZXNvbHZlcigpLFxuICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NkNFOFx1NTE4Q1x1NTZGRVx1NjgwN1x1N0VDNFx1NEVGNlxuICAgICAgICAgIEljb25zUmVzb2x2ZXIoe1xuICAgICAgICAgICAgLy8gZWxlbWVudC1wbHVzXHU1NkZFXHU2ODA3XHU1RTkzXHVGRjBDXHU1MTc2XHU0RUQ2XHU1NkZFXHU2ODA3XHU1RTkzIGh0dHBzOi8vaWNvbi1zZXRzLmljb25pZnkuZGVzaWduL1xuICAgICAgICAgICAgZW5hYmxlZENvbGxlY3Rpb25zOiBbXCJlcFwiXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgICAgLy8gXHU2MzA3XHU1QjlBXHU4MUVBXHU1QjlBXHU0RTQ5XHU3RUM0XHU0RUY2XHU0RjREXHU3RjZFKFx1OUVEOFx1OEJBNDpzcmMvY29tcG9uZW50cylcbiAgICAgICAgZGlyczogW1wic3JjL2NvbXBvbmVudHNcIiwgXCJzcmMvKiovY29tcG9uZW50c1wiXSxcbiAgICAgICAgLy8gXHU2MzA3XHU1QjlBXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1XHU3RUM0XHU0RUY2VFNcdTdDN0JcdTU3OEJcdTU4RjBcdTY2MEVcdTY1ODdcdTRFRjZcdThERUZcdTVGODQgKGZhbHNlOlx1NTE3M1x1OTVFRFx1ODFFQVx1NTJBOFx1NzUxRlx1NjIxMClcbiAgICAgICAgZHRzOiBmYWxzZSxcbiAgICAgICAgLy8gZHRzOiBcInNyYy90eXBpbmdzL2NvbXBvbmVudHMuZC50c1wiLFxuICAgICAgfSksXG4gICAgICBJY29ucyh7XG4gICAgICAgIGNvbXBpbGVyOiBcInZ1ZTNcIixcbiAgICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1Qjg5XHU4OEM1XHU1NkZFXHU2ODA3XHU1RTkzXG4gICAgICAgIGF1dG9JbnN0YWxsOiB0cnVlLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVTdmdJY29uc1BsdWdpbih7XG4gICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1OTcwMFx1ODk4MVx1N0YxM1x1NUI1OFx1NzY4NFx1NTZGRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOVxuICAgICAgICBpY29uRGlyczogW3Jlc29sdmUocGF0aFNyYywgXCJhc3NldHMvaWNvbnNcIildLFxuICAgICAgICAvLyBcdTYzMDdcdTVCOUFzeW1ib2xJZFx1NjgzQ1x1NUYwRlxuICAgICAgICBzeW1ib2xJZDogXCJpY29uLVtkaXJdLVtuYW1lXVwiLFxuICAgICAgfSksXG4gICAgICBWdWVEZXZUb29scyh7XG4gICAgICAgIG9wZW5JbkVkaXRvckhvc3Q6IGBodHRwOi8vbG9jYWxob3N0OiR7ZW52LlZJVEVfQVBQX1BPUlR9YCxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgLy8gXHU5ODg0XHU1MkEwXHU4RjdEXHU5ODc5XHU3NkVFXHU1RkM1XHU5NzAwXHU3Njg0XHU3RUM0XHU0RUY2XG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgIFwidnVlXCIsXG4gICAgICAgIFwidnVlLXJvdXRlclwiLFxuICAgICAgICBcInBpbmlhXCIsXG4gICAgICAgIFwiYXhpb3NcIixcbiAgICAgICAgXCJAdnVldXNlL2NvcmVcIixcbiAgICAgICAgXCJwYXRoLXRvLXJlZ2V4cFwiLFxuICAgICAgICBcInZ1ZS1pMThuXCIsXG4gICAgICAgIFwicGF0aC1icm93c2VyaWZ5XCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZm9ybS9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9mb3JtLWl0ZW0vc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvYnV0dG9uL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2lucHV0L3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2lucHV0LW51bWJlci9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9zd2l0Y2gvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdXBsb2FkL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL21lbnUvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvY29sL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2ljb24vc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvcm93L3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RhZy9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9kaWFsb2cvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvbG9hZGluZy9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9yYWRpby9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9yYWRpby1ncm91cC9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9wb3BvdmVyL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3Njcm9sbGJhci9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy90b29sdGlwL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2Ryb3Bkb3duL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2Ryb3Bkb3duLW1lbnUvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZHJvcGRvd24taXRlbS9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9zdWItbWVudS9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9tZW51LWl0ZW0vc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZGl2aWRlci9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jYXJkL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2xpbmsvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvYnJlYWRjcnVtYi9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9icmVhZGNydW1iLWl0ZW0vc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdGFibGUvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdHJlZS1zZWxlY3Qvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdGFibGUtY29sdW1uL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3NlbGVjdC9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9vcHRpb24vc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvcGFnaW5hdGlvbi9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy90cmVlL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2FsZXJ0L3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3JhZGlvLWJ1dHRvbi9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jaGVja2JveC1ncm91cC9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jaGVja2JveC9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy90YWJzL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RhYi1wYW5lL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3JhdGUvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZGF0ZS1waWNrZXIvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvbm90aWZpY2F0aW9uL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2ltYWdlL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3N0YXRpc3RpYy9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy93YXRlcm1hcmsvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvY29uZmlnLXByb3ZpZGVyL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RleHQvc3R5bGUvY3NzXCIsXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZHJhd2VyL3N0eWxlL2Nzc1wiLFxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2NvbG9yLXBpY2tlci9zdHlsZS9jc3NcIixcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9iYWNrdG9wL3N0eWxlL2Nzc1wiLFxuICAgICAgXSxcbiAgICB9LFxuICAgIC8vIFx1Njc4NFx1NUVGQVx1OTE0RFx1N0Y2RVxuICAgIGJ1aWxkOiB7XG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDIwMDAsIC8vIFx1NkQ4OFx1OTY2NFx1NjI1M1x1NTMwNVx1NTkyN1x1NUMwRlx1OEQ4NVx1OEZDNzUwMGtiXHU4QjY2XHU1NDRBXG4gICAgICBtaW5pZnk6IFwidGVyc2VyXCIsIC8vIFZpdGUgMi42LnggXHU0RUU1XHU0RTBBXHU5NzAwXHU4OTgxXHU5MTREXHU3RjZFIG1pbmlmeTogXCJ0ZXJzZXJcIiwgdGVyc2VyT3B0aW9ucyBcdTYyNERcdTgwRkRcdTc1MUZcdTY1NDhcbiAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICBrZWVwX2luZmluaXR5OiB0cnVlLCAvLyBcdTk2MzJcdTZCNjIgSW5maW5pdHkgXHU4OEFCXHU1MzhCXHU3RjI5XHU2MjEwIDEvMFx1RkYwQ1x1OEZEOVx1NTNFRlx1ODBGRFx1NEYxQVx1NUJGQ1x1ODFGNCBDaHJvbWUgXHU0RTBBXHU3Njg0XHU2MDI3XHU4MEZEXHU5NUVFXHU5ODk4XG4gICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLCAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTUzQkJcdTk2NjQgY29uc29sZVxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsIC8vIFx1NzUxRlx1NEVBN1x1NzNBRlx1NTg4M1x1NTNCQlx1OTY2NCBkZWJ1Z2dlclxuICAgICAgICB9LFxuICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICBjb21tZW50czogZmFsc2UsIC8vIFx1NTIyMFx1OTY2NFx1NkNFOFx1OTFDQVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgLy8gbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gICBcInZ1ZS1pMThuXCI6IFtcInZ1ZS1pMThuXCJdLFxuICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgLy8gXHU3NTI4XHU0RThFXHU0RUNFXHU1MTY1XHU1M0UzXHU3MEI5XHU1MjFCXHU1RUZBXHU3Njg0XHU1NzU3XHU3Njg0XHU2MjUzXHU1MzA1XHU4RjkzXHU1MUZBXHU2ODNDXHU1RjBGW25hbWVdXHU4ODY4XHU3OTNBXHU2NTg3XHU0RUY2XHU1NDBELFtoYXNoXVx1ODg2OFx1NzkzQVx1OEJFNVx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOWhhc2hcdTUwM0NcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogXCJqcy9bbmFtZV0uW2hhc2hdLmpzXCIsXG4gICAgICAgICAgLy8gXHU3NTI4XHU0RThFXHU1NDdEXHU1NDBEXHU0RUUzXHU3ODAxXHU2MkM2XHU1MjA2XHU2NUY2XHU1MjFCXHU1RUZBXHU3Njg0XHU1MTcxXHU0RUFCXHU1NzU3XHU3Njg0XHU4RjkzXHU1MUZBXHU1NDdEXHU1NDBEXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6IFwianMvW25hbWVdLltoYXNoXS5qc1wiLFxuICAgICAgICAgIC8vIFx1NzUyOFx1NEU4RVx1OEY5M1x1NTFGQVx1OTc1OVx1NjAwMVx1OEQ0NFx1NkU5MFx1NzY4NFx1NTQ3RFx1NTQwRFx1RkYwQ1tleHRdXHU4ODY4XHU3OTNBXHU2NTg3XHU0RUY2XHU2MjY5XHU1QzU1XHU1NDBEXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm86IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lLnNwbGl0KFwiLlwiKTtcbiAgICAgICAgICAgIGxldCBleHRUeXBlID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1x1NjU4N1x1NEVGNlx1NEZFMVx1NjA2RicsIGFzc2V0SW5mby5uYW1lKVxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAvXFwuKG1wNHx3ZWJtfG9nZ3xtcDN8d2F2fGZsYWN8YWFjKShcXD8uKik/JC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgZXh0VHlwZSA9IFwibWVkaWFcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoL1xcLihwbmd8anBlP2d8Z2lmfHN2ZykoXFw/LiopPyQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICAgIGV4dFR5cGUgPSBcImltZ1wiO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgvXFwuKHdvZmYyP3xlb3R8dHRmfG90ZikoXFw/LiopPyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xuICAgICAgICAgICAgICBleHRUeXBlID0gXCJmb250c1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGAke2V4dFR5cGV9L1tuYW1lXS5baGFzaF0uW2V4dF1gO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgZGVmaW5lOiB7XG4gICAgICBfX0FQUF9JTkZPX186IEpTT04uc3RyaW5naWZ5KF9fQVBQX0lORk9fXyksXG4gICAgfSxcbiAgfTtcbn0pO1xuIiwgIntcclxuICBcIm5hbWVcIjogXCJcdTgyRjlcdTY3OUNBUlx1NTE0M1x1NkMxNFx1OTg3OVx1NzZFRVwiLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMTEuM1wiLFxyXG4gIFwicHJpdmF0ZVwiOiB0cnVlLFxyXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxyXG4gIFwic2NyaXB0c1wiOiB7XHJcbiAgICBcImRldlwiOiBcInZpdGVcIixcclxuICAgIFwiYnVpbGRcIjogXCJ2dWUtdHNjIC0tbm9FbWl0ICYgdml0ZSBidWlsZFwiLFxyXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXHJcbiAgICBcImJ1aWxkLW9ubHlcIjogXCJ2aXRlIGJ1aWxkXCIsXHJcbiAgICBcInR5cGUtY2hlY2tcIjogXCJ2dWUtdHNjIC0tbm9FbWl0XCIsXHJcbiAgICBcImxpbnQ6ZXNsaW50XCI6IFwiZXNsaW50ICAtLWZpeCAtLWV4dCAudHMsLmpzLC52dWUgLi9zcmMgXCIsXHJcbiAgICBcImxpbnQ6cHJldHRpZXJcIjogXCJwcmV0dGllciAtLXdyaXRlIFxcXCIqKi8qLntqcyxjanMsdHMsanNvbix0c3gsY3NzLGxlc3Msc2Nzcyx2dWUsaHRtbCxtZH1cXFwiXCIsXHJcbiAgICBcImxpbnQ6c3R5bGVsaW50XCI6IFwic3R5bGVsaW50ICBcXFwiKiovKi57Y3NzLHNjc3MsdnVlfVxcXCIgLS1maXhcIixcclxuICAgIFwibGludDpsaW50LXN0YWdlZFwiOiBcImxpbnQtc3RhZ2VkXCIsXHJcbiAgICBcInByZWluc3RhbGxcIjogXCJucHggb25seS1hbGxvdyBwbnBtXCIsXHJcbiAgICBcInByZXBhcmVcIjogXCJodXNreVwiLFxyXG4gICAgXCJjb21taXRcIjogXCJnaXQtY3pcIlxyXG4gIH0sXHJcbiAgXCJjb25maWdcIjoge1xyXG4gICAgXCJjb21taXRpemVuXCI6IHtcclxuICAgICAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL2N6LWdpdFwiXHJcbiAgICB9XHJcbiAgfSxcclxuICBcImxpbnQtc3RhZ2VkXCI6IHtcclxuICAgIFwiKi57anMsdHN9XCI6IFtcclxuICAgICAgXCJlc2xpbnQgLS1maXhcIixcclxuICAgICAgXCJwcmV0dGllciAtLXdyaXRlXCJcclxuICAgIF0sXHJcbiAgICBcIioue2Nqcyxqc29ufVwiOiBbXHJcbiAgICAgIFwicHJldHRpZXIgLS13cml0ZVwiXHJcbiAgICBdLFxyXG4gICAgXCIqLnt2dWUsaHRtbH1cIjogW1xyXG4gICAgICBcImVzbGludCAtLWZpeFwiLFxyXG4gICAgICBcInByZXR0aWVyIC0td3JpdGVcIixcclxuICAgICAgXCJzdHlsZWxpbnQgLS1maXhcIlxyXG4gICAgXSxcclxuICAgIFwiKi57c2Nzcyxjc3N9XCI6IFtcclxuICAgICAgXCJzdHlsZWxpbnQgLS1maXhcIixcclxuICAgICAgXCJwcmV0dGllciAtLXdyaXRlXCJcclxuICAgIF0sXHJcbiAgICBcIioubWRcIjogW1xyXG4gICAgICBcInByZXR0aWVyIC0td3JpdGVcIlxyXG4gICAgXVxyXG4gIH0sXHJcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xyXG4gICAgXCJAY2FzbC9hYmlsaXR5XCI6IFwiXjYuNy4xXCIsXHJcbiAgICBcIkBjYXNsL3Z1ZVwiOiBcIl4yLjIuMlwiLFxyXG4gICAgXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiOiBcIl4yLjMuMVwiLFxyXG4gICAgXCJAZm9ydGF3ZXNvbWUvZm9udGF3ZXNvbWUtc3ZnLWNvcmVcIjogXCJeNi42LjBcIixcclxuICAgIFwiQGZvcnRhd2Vzb21lL2ZyZWUtc29saWQtc3ZnLWljb25zXCI6IFwiXjYuNi4wXCIsXHJcbiAgICBcIkBmb3J0YXdlc29tZS92dWUtZm9udGF3ZXNvbWVcIjogXCJeMy4wLjhcIixcclxuICAgIFwiQHR5cGVzL2RvbXB1cmlmeVwiOiBcIl4zLjAuNVwiLFxyXG4gICAgXCJAdHlwZXMvdGhyZWVcIjogXCJeMC4xNjcuMVwiLFxyXG4gICAgXCJAdnVldXNlL2NvcmVcIjogXCJeMTAuMTEuMFwiLFxyXG4gICAgXCJhbmltYXRlLmNzc1wiOiBcIl40LjEuMVwiLFxyXG4gICAgXCJheGlvc1wiOiBcIl4xLjcuMlwiLFxyXG4gICAgXCJjb2xvclwiOiBcIl40LjIuM1wiLFxyXG4gICAgXCJjb3MtanMtc2RrLXY1XCI6IFwiXjEuOC4zXCIsXHJcbiAgICBcImRvbXB1cmlmeVwiOiBcIl4zLjEuNlwiLFxyXG4gICAgXCJlbGVtZW50LWNoaW5hLWFyZWEtZGF0YVwiOiBcIl42LjEuMFwiLFxyXG4gICAgXCJlbGVtZW50LXBsdXNcIjogXCJeMi43LjdcIixcclxuICAgIFwiZWxlbWVudC1yZXNpemUtZGV0ZWN0b3JcIjogXCJeMS4yLjRcIixcclxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwiXjExLjEwLjBcIixcclxuICAgIFwibW9tZW50XCI6IFwiXjIuMzAuMVwiLFxyXG4gICAgXCJucHJvZ3Jlc3NcIjogXCJeMC4yLjBcIixcclxuICAgIFwicGF0aFwiOiBcIl4wLjEyLjdcIixcclxuICAgIFwicGF0aC1icm93c2VyaWZ5XCI6IFwiXjEuMC4xXCIsXHJcbiAgICBcInBhdGgtdG8tcmVnZXhwXCI6IFwiXjYuMi4yXCIsXHJcbiAgICBcInBpbmlhXCI6IFwiXjIuMS43XCIsXHJcbiAgICBcInFyY29kZS52dWVcIjogXCJeMy40LjFcIixcclxuICAgIFwicXVlcnlzdHJpbmdpZnlcIjogXCJeMi4yLjBcIixcclxuICAgIFwicmV0ZVwiOiBcIl4yLjAuM1wiLFxyXG4gICAgXCJyZXRlLWFyZWEtcGx1Z2luXCI6IFwiXjIuMC40XCIsXHJcbiAgICBcInJldGUtYXV0by1hcnJhbmdlLXBsdWdpblwiOiBcIl4yLjAuMVwiLFxyXG4gICAgXCJyZXRlLWNvbm5lY3Rpb24tcGx1Z2luXCI6IFwiXjIuMC4zXCIsXHJcbiAgICBcInJldGUtY29udGV4dC1tZW51LXBsdWdpblwiOiBcIl4yLjAuM1wiLFxyXG4gICAgXCJyZXRlLWVuZ2luZVwiOiBcIl4yLjAuMVwiLFxyXG4gICAgXCJyZXRlLXZ1ZS1yZW5kZXItcGx1Z2luXCI6IFwiXjAuNS4yXCIsXHJcbiAgICBcInNwYXJrLW1kNVwiOiBcIl4zLjAuMlwiLFxyXG4gICAgXCJ0aHJlZVwiOiBcIl4wLjE2Ny4wXCIsXHJcbiAgICBcInV1aWRcIjogXCJeMTAuMC4wXCIsXHJcbiAgICBcInZ1ZVwiOiBcIl4zLjQuMjdcIixcclxuICAgIFwidnVlLWNyb3BwZXJcIjogXCJeMS4xLjRcIixcclxuICAgIFwidnVlLWhsanNcIjogXCJeMy4wLjFcIixcclxuICAgIFwidnVlLWkxOG5cIjogXCI5LjkuMVwiLFxyXG4gICAgXCJ2dWUtaWZyYW1lc1wiOiBcIl4wLjAuMjFcIixcclxuICAgIFwidnVlLXJvdXRlclwiOiBcIl40LjMuM1wiLFxyXG4gICAgXCJ2dWUtd2F0ZXJmYWxsLXBsdWdpblwiOiBcIl4zLjMuMVwiLFxyXG4gICAgXCJ2dWUtd2F0ZXJmYWxsLXBsdWdpbi1uZXh0XCI6IFwiXjIuNC4zXCIsXHJcbiAgICBcInZ1ZTMtZWRpdG9yXCI6IFwiXjAuMS4xXCJcclxuICB9LFxyXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcclxuICAgIFwiQGNvbW1pdGxpbnQvY2xpXCI6IFwiXjE4LjYuMVwiLFxyXG4gICAgXCJAY29tbWl0bGludC9jb25maWctY29udmVudGlvbmFsXCI6IFwiXjE4LjYuM1wiLFxyXG4gICAgXCJAaWNvbmlmeS1qc29uL2VwXCI6IFwiXjEuMS4xNVwiLFxyXG4gICAgXCJAdHlwZXMvY29sb3JcIjogXCJeMy4wLjZcIixcclxuICAgIFwiQHR5cGVzL2VsZW1lbnQtcmVzaXplLWRldGVjdG9yXCI6IFwiXjEuMS42XCIsXHJcbiAgICBcIkB0eXBlcy9ub2RlXCI6IFwiXjIwLjE0LjJcIixcclxuICAgIFwiQHR5cGVzL25wcm9ncmVzc1wiOiBcIl4wLjIuM1wiLFxyXG4gICAgXCJAdHlwZXMvcGF0aC1icm93c2VyaWZ5XCI6IFwiXjEuMC4yXCIsXHJcbiAgICBcIkB0eXBlcy9xdWVyeXN0cmluZ2lmeVwiOiBcIl4yLjAuMlwiLFxyXG4gICAgXCJAdHlwZXMvc3BhcmstbWQ1XCI6IFwiXjMuMC40XCIsXHJcbiAgICBcIkB0eXBlcy91dWlkXCI6IFwiXjEwLjAuMFwiLFxyXG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvZXNsaW50LXBsdWdpblwiOiBcIl43LjEzLjBcIixcclxuICAgIFwiQHR5cGVzY3JpcHQtZXNsaW50L3BhcnNlclwiOiBcIl43LjEzLjBcIixcclxuICAgIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI6IFwiXjUuMC41XCIsXHJcbiAgICBcIkB2aXRlanMvcGx1Z2luLXZ1ZS1qc3hcIjogXCJeMy4xLjBcIixcclxuICAgIFwiYXV0b3ByZWZpeGVyXCI6IFwiXjEwLjQuMTlcIixcclxuICAgIFwiY29tbWl0aXplblwiOiBcIl40LjMuMFwiLFxyXG4gICAgXCJjei1naXRcIjogXCJeMS45LjNcIixcclxuICAgIFwiZXNsaW50XCI6IFwiXjguNTcuMFwiLFxyXG4gICAgXCJlc2xpbnQtY29uZmlnLXByZXR0aWVyXCI6IFwiXjkuMS4wXCIsXHJcbiAgICBcImVzbGludC1wbHVnaW4taW1wb3J0XCI6IFwiXjIuMjkuMVwiLFxyXG4gICAgXCJlc2xpbnQtcGx1Z2luLXByZXR0aWVyXCI6IFwiXjUuMS4zXCIsXHJcbiAgICBcImVzbGludC1wbHVnaW4tdnVlXCI6IFwiXjkuMjYuMFwiLFxyXG4gICAgXCJmYXN0LWdsb2JcIjogXCJeMy4zLjJcIixcclxuICAgIFwiaHVza3lcIjogXCJeOS4wLjExXCIsXHJcbiAgICBcImxpbnQtc3RhZ2VkXCI6IFwiXjE1LjIuN1wiLFxyXG4gICAgXCJwb3N0Y3NzXCI6IFwiXjguNC4zOFwiLFxyXG4gICAgXCJwb3N0Y3NzLWh0bWxcIjogXCJeMS43LjBcIixcclxuICAgIFwicG9zdGNzcy1zY3NzXCI6IFwiXjQuMC45XCIsXHJcbiAgICBcInByZXR0aWVyXCI6IFwiXjMuMy4yXCIsXHJcbiAgICBcInNhc3NcIjogXCJeMS43Ny41XCIsXHJcbiAgICBcInN0eWxlbGludFwiOiBcIl4xNi42LjFcIixcclxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1odG1sXCI6IFwiXjEuMS4wXCIsXHJcbiAgICBcInN0eWxlbGludC1jb25maWctcmVjZXNzLW9yZGVyXCI6IFwiXjQuNi4wXCIsXHJcbiAgICBcInN0eWxlbGludC1jb25maWctcmVjb21tZW5kZWQtc2Nzc1wiOiBcIl4xNC4wLjBcIixcclxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1yZWNvbW1lbmRlZC12dWVcIjogXCJeMS41LjBcIixcclxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1zdGFuZGFyZFwiOiBcIl4zNi4wLjBcIixcclxuICAgIFwidGVyc2VyXCI6IFwiXjUuMzEuMVwiLFxyXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiXjUuNC41XCIsXHJcbiAgICBcInVub2Nzc1wiOiBcIl4wLjU4LjlcIixcclxuICAgIFwidW5wbHVnaW4tYXV0by1pbXBvcnRcIjogXCJeMC4xNy42XCIsXHJcbiAgICBcInVucGx1Z2luLWljb25zXCI6IFwiXjAuMTguNVwiLFxyXG4gICAgXCJ1bnBsdWdpbi12dWUtY29tcG9uZW50c1wiOiBcIl4wLjI2LjBcIixcclxuICAgIFwidml0ZVwiOiBcIl41LjIuMTNcIixcclxuICAgIFwidml0ZS1wbHVnaW4tbW9jay1kZXYtc2VydmVyXCI6IFwiXjEuNS4wXCIsXHJcbiAgICBcInZpdGUtcGx1Z2luLXN2Zy1pY29uc1wiOiBcIl4yLjAuMVwiLFxyXG4gICAgXCJ2aXRlLXBsdWdpbi12dWUtZGV2dG9vbHNcIjogXCJeNy4yLjFcIixcclxuICAgIFwidnVlLXRzY1wiOiBcIl4yLjAuMjFcIlxyXG4gIH0sXHJcbiAgXCJyZXBvc2l0b3J5XCI6IFwiaHR0cHM6Ly9naXRlZS5jb20veW91bGFpb3JnL3Z1ZTMtZWxlbWVudC1hZG1pbi5naXRcIixcclxuICBcImF1dGhvclwiOiBcIlwiLFxyXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxyXG4gIFwiZW5naW5lc1wiOiB7XHJcbiAgICBcIm5vZGVcIjogXCI+PTE4LjAuMFwiXHJcbiAgfSxcclxuICBcInBhY2thZ2VNYW5hZ2VyXCI6IFwicG5wbUA5LjEuMytzaGE1MTIuN2MyZWEwODllMWE2YWYzMDY0MDljNGZjOGM0ZjA4OTdiZGFjMzJiNzcyMDE2MTk2YzQ2OWQ5NDI4ZjFmZTJkNWEyMWRhZjhhZDY1MTI3NjI2NTRhYzY0NWI1ZDkxMzZiYjIxMGVjOWEwMGFmYThkYmM0Njc3ODQzYmEzNjJlY2RcIlxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFcsT0FBTyxTQUFTO0FBQzFYLE9BQU8sWUFBWTtBQUNuQixTQUFnQyxTQUFTLG9CQUFvQjtBQUU3RCxPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLDJCQUEyQjtBQUNwQyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxtQkFBbUI7QUFFMUIsU0FBUyw0QkFBNEI7QUFDckMsT0FBTyx5QkFBeUI7QUFFaEMsT0FBTyxZQUFZO0FBQ25CLFNBQVMsZUFBZTs7O0FDYnRCLFdBQVE7QUFDUixjQUFXO0FBMkNYLG1CQUFnQjtBQUFBLEVBQ2QsaUJBQWlCO0FBQUEsRUFDakIsYUFBYTtBQUFBLEVBQ2IsMkJBQTJCO0FBQUEsRUFDM0IscUNBQXFDO0FBQUEsRUFDckMscUNBQXFDO0FBQUEsRUFDckMsZ0NBQWdDO0FBQUEsRUFDaEMsb0JBQW9CO0FBQUEsRUFDcEIsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsZUFBZTtBQUFBLEVBQ2YsT0FBUztBQUFBLEVBQ1QsT0FBUztBQUFBLEVBQ1QsaUJBQWlCO0FBQUEsRUFDakIsV0FBYTtBQUFBLEVBQ2IsMkJBQTJCO0FBQUEsRUFDM0IsZ0JBQWdCO0FBQUEsRUFDaEIsMkJBQTJCO0FBQUEsRUFDM0IsZ0JBQWdCO0FBQUEsRUFDaEIsUUFBVTtBQUFBLEVBQ1YsV0FBYTtBQUFBLEVBQ2IsTUFBUTtBQUFBLEVBQ1IsbUJBQW1CO0FBQUEsRUFDbkIsa0JBQWtCO0FBQUEsRUFDbEIsT0FBUztBQUFBLEVBQ1QsY0FBYztBQUFBLEVBQ2QsZ0JBQWtCO0FBQUEsRUFDbEIsTUFBUTtBQUFBLEVBQ1Isb0JBQW9CO0FBQUEsRUFDcEIsNEJBQTRCO0FBQUEsRUFDNUIsMEJBQTBCO0FBQUEsRUFDMUIsNEJBQTRCO0FBQUEsRUFDNUIsZUFBZTtBQUFBLEVBQ2YsMEJBQTBCO0FBQUEsRUFDMUIsYUFBYTtBQUFBLEVBQ2IsT0FBUztBQUFBLEVBQ1QsTUFBUTtBQUFBLEVBQ1IsS0FBTztBQUFBLEVBQ1AsZUFBZTtBQUFBLEVBQ2YsWUFBWTtBQUFBLEVBQ1osWUFBWTtBQUFBLEVBQ1osZUFBZTtBQUFBLEVBQ2YsY0FBYztBQUFBLEVBQ2Qsd0JBQXdCO0FBQUEsRUFDeEIsNkJBQTZCO0FBQUEsRUFDN0IsZUFBZTtBQUNqQjtBQUNBLHNCQUFtQjtBQUFBLEVBQ2pCLG1CQUFtQjtBQUFBLEVBQ25CLG1DQUFtQztBQUFBLEVBQ25DLG9CQUFvQjtBQUFBLEVBQ3BCLGdCQUFnQjtBQUFBLEVBQ2hCLGtDQUFrQztBQUFBLEVBQ2xDLGVBQWU7QUFBQSxFQUNmLG9CQUFvQjtBQUFBLEVBQ3BCLDBCQUEwQjtBQUFBLEVBQzFCLHlCQUF5QjtBQUFBLEVBQ3pCLG9CQUFvQjtBQUFBLEVBQ3BCLGVBQWU7QUFBQSxFQUNmLG9DQUFvQztBQUFBLEVBQ3BDLDZCQUE2QjtBQUFBLEVBQzdCLHNCQUFzQjtBQUFBLEVBQ3RCLDBCQUEwQjtBQUFBLEVBQzFCLGNBQWdCO0FBQUEsRUFDaEIsWUFBYztBQUFBLEVBQ2QsVUFBVTtBQUFBLEVBQ1YsUUFBVTtBQUFBLEVBQ1YsMEJBQTBCO0FBQUEsRUFDMUIsd0JBQXdCO0FBQUEsRUFDeEIsMEJBQTBCO0FBQUEsRUFDMUIscUJBQXFCO0FBQUEsRUFDckIsYUFBYTtBQUFBLEVBQ2IsT0FBUztBQUFBLEVBQ1QsZUFBZTtBQUFBLEVBQ2YsU0FBVztBQUFBLEVBQ1gsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsVUFBWTtBQUFBLEVBQ1osTUFBUTtBQUFBLEVBQ1IsV0FBYTtBQUFBLEVBQ2IseUJBQXlCO0FBQUEsRUFDekIsaUNBQWlDO0FBQUEsRUFDakMscUNBQXFDO0FBQUEsRUFDckMsb0NBQW9DO0FBQUEsRUFDcEMsNkJBQTZCO0FBQUEsRUFDN0IsUUFBVTtBQUFBLEVBQ1YsWUFBYztBQUFBLEVBQ2QsUUFBVTtBQUFBLEVBQ1Ysd0JBQXdCO0FBQUEsRUFDeEIsa0JBQWtCO0FBQUEsRUFDbEIsMkJBQTJCO0FBQUEsRUFDM0IsTUFBUTtBQUFBLEVBQ1IsK0JBQStCO0FBQUEsRUFDL0IseUJBQXlCO0FBQUEsRUFDekIsNEJBQTRCO0FBQUEsRUFDNUIsV0FBVztBQUNiO0FBSUEsY0FBVztBQUFBLEVBQ1QsTUFBUTtBQUNWOzs7QUQzSEYsT0FBTyxpQkFBaUI7QUF4QnhCLElBQU0sbUNBQW1DO0FBMkJ6QyxJQUFNLGVBQWU7QUFBQSxFQUNuQixLQUFLLEVBQUUsTUFBTSxTQUFTLFNBQVMsY0FBYyxnQkFBZ0I7QUFBQSxFQUM3RCxnQkFBZ0IsS0FBSyxJQUFJO0FBQzNCO0FBRUEsSUFBTSxVQUFVLFFBQVEsa0NBQVcsS0FBSztBQUV4QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBNkI7QUFDL0QsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksQ0FBQztBQUN2QyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLO0FBQUEsTUFDUDtBQUFBLElBQ0Y7QUFBQSxJQUNBLEtBQUs7QUFBQTtBQUFBLE1BRUgscUJBQXFCO0FBQUE7QUFBQSxRQUVuQixNQUFNO0FBQUEsVUFDSixtQkFBbUI7QUFBQSxVQUNuQixnQkFBZ0I7QUFBQTtBQUFBO0FBQUEsUUFHbEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBO0FBQUEsTUFFTixNQUFNO0FBQUE7QUFBQSxNQUVOLE1BQU0sT0FBTyxJQUFJLGFBQWE7QUFBQTtBQUFBLE1BRTlCLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQTtBQUFBLFFBRUwsQ0FBQyxJQUFJLGlCQUFpQixHQUFHO0FBQUEsVUFDdkIsY0FBYztBQUFBO0FBQUEsVUFFZCxRQUFRLElBQUk7QUFBQSxVQUNaLFNBQVMsQ0FBQyxTQUNSLEtBQUssUUFBUSxJQUFJLE9BQU8sTUFBTSxJQUFJLGlCQUFpQixHQUFHLEVBQUU7QUFBQSxRQUM1RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxJQUFJO0FBQUE7QUFBQSxNQUVKLE9BQU87QUFBQTtBQUFBLE1BRVAsSUFBSSx5QkFBeUIsU0FBUyxvQkFBb0IsSUFBSTtBQUFBLE1BQzlELE9BQU87QUFBQSxRQUNMLGtCQUFrQjtBQUFBLE1BQ3BCLENBQUM7QUFBQTtBQUFBLE1BRUQsV0FBVztBQUFBO0FBQUEsUUFFVCxTQUFTLENBQUMsT0FBTyxnQkFBZ0IsU0FBUyxjQUFjLFVBQVU7QUFBQSxRQUNsRSxXQUFXO0FBQUE7QUFBQSxVQUVULG9CQUFvQjtBQUFBO0FBQUEsVUFFcEIsY0FBYyxDQUFDLENBQUM7QUFBQSxRQUNsQjtBQUFBLFFBQ0EsVUFBVTtBQUFBO0FBQUEsVUFFUixTQUFTO0FBQUE7QUFBQSxVQUVULFVBQVU7QUFBQSxVQUNWLGtCQUFrQjtBQUFBLFFBQ3BCO0FBQUE7QUFBQSxRQUVBLGFBQWE7QUFBQTtBQUFBLFFBRWIsS0FBSztBQUFBO0FBQUEsTUFFUCxDQUFDO0FBQUEsTUFDRCxXQUFXO0FBQUEsUUFDVCxXQUFXO0FBQUE7QUFBQSxVQUVULG9CQUFvQjtBQUFBO0FBQUEsVUFFcEIsY0FBYztBQUFBO0FBQUEsWUFFWixvQkFBb0IsQ0FBQyxJQUFJO0FBQUEsVUFDM0IsQ0FBQztBQUFBLFFBQ0g7QUFBQTtBQUFBLFFBRUEsTUFBTSxDQUFDLGtCQUFrQixtQkFBbUI7QUFBQTtBQUFBLFFBRTVDLEtBQUs7QUFBQTtBQUFBLE1BRVAsQ0FBQztBQUFBLE1BQ0QsTUFBTTtBQUFBLFFBQ0osVUFBVTtBQUFBO0FBQUEsUUFFVixhQUFhO0FBQUEsTUFDZixDQUFDO0FBQUEsTUFDRCxxQkFBcUI7QUFBQTtBQUFBLFFBRW5CLFVBQVUsQ0FBQyxRQUFRLFNBQVMsY0FBYyxDQUFDO0FBQUE7QUFBQSxRQUUzQyxVQUFVO0FBQUEsTUFDWixDQUFDO0FBQUEsTUFDRCxZQUFZO0FBQUEsUUFDVixrQkFBa0Isb0JBQW9CLElBQUksYUFBYTtBQUFBLE1BQ3pELENBQUM7QUFBQSxJQUNIO0FBQUE7QUFBQSxJQUVBLGNBQWM7QUFBQSxNQUNaLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsT0FBTztBQUFBLE1BQ0wsdUJBQXVCO0FBQUE7QUFBQSxNQUN2QixRQUFRO0FBQUE7QUFBQSxNQUNSLGVBQWU7QUFBQSxRQUNiLFVBQVU7QUFBQSxVQUNSLGVBQWU7QUFBQTtBQUFBLFVBQ2YsY0FBYztBQUFBO0FBQUEsVUFDZCxlQUFlO0FBQUE7QUFBQSxRQUNqQjtBQUFBLFFBQ0EsUUFBUTtBQUFBLFVBQ04sVUFBVTtBQUFBO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBS04sZ0JBQWdCO0FBQUE7QUFBQSxVQUVoQixnQkFBZ0I7QUFBQTtBQUFBLFVBRWhCLGdCQUFnQixDQUFDLGNBQW1CO0FBQ2xDLGtCQUFNLE9BQU8sVUFBVSxLQUFLLE1BQU0sR0FBRztBQUNyQyxnQkFBSSxVQUFVLEtBQUssS0FBSyxTQUFTLENBQUM7QUFFbEMsZ0JBQ0UsNkNBQTZDLEtBQUssVUFBVSxJQUFJLEdBQ2hFO0FBQ0Esd0JBQVU7QUFBQSxZQUNaLFdBQVcsZ0NBQWdDLEtBQUssVUFBVSxJQUFJLEdBQUc7QUFDL0Qsd0JBQVU7QUFBQSxZQUNaLFdBQVcsa0NBQWtDLEtBQUssVUFBVSxJQUFJLEdBQUc7QUFDakUsd0JBQVU7QUFBQSxZQUNaO0FBQ0EsbUJBQU8sR0FBRyxPQUFPO0FBQUEsVUFDbkI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLGNBQWMsS0FBSyxVQUFVLFlBQVk7QUFBQSxJQUMzQztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
