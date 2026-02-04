// vite.config.ts
import vue from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/@vitejs+plugin-vue@5.2.0_vite@5.4.11_@types+node@20.17.6_sass@1.81.0_terser@5.36.0__vue@3.5.13_typescript@5.6.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/@vitejs+plugin-vue-jsx@3.1.0_vite@5.4.11_@types+node@20.17.6_sass@1.81.0_terser@5.36.0__vue@3.5.13_typescript@5.6.3_/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import { loadEnv, defineConfig } from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/vite@5.4.11_@types+node@20.17.6_sass@1.81.0_terser@5.36.0/node_modules/vite/dist/node/index.js";
import AutoImport from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unplugin-auto-import@0.17.8_@nuxt+kit@3.14.159_rollup@4.21.1__@vueuse+core@10.11.1_vue@3.5.13_ay4h4zek4e6aghrjttykl276wy/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unplugin-vue-components@0.26.0_@babel+parser@7.26.2_@nuxt+kit@3.14.159_rollup@4.21.1__rollup@_lmh6ia6q7s5up63rbalg6o7xwm/node_modules/unplugin-vue-components/dist/vite.js";
import { ElementPlusResolver } from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unplugin-vue-components@0.26.0_@babel+parser@7.26.2_@nuxt+kit@3.14.159_rollup@4.21.1__rollup@_lmh6ia6q7s5up63rbalg6o7xwm/node_modules/unplugin-vue-components/dist/resolvers.js";
import Icons from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unplugin-icons@0.18.5_@vue+compiler-sfc@3.5.13_vue-template-es2015-compiler@1.9.1/node_modules/unplugin-icons/dist/vite.js";
import IconsResolver from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unplugin-icons@0.18.5_@vue+compiler-sfc@3.5.13_vue-template-es2015-compiler@1.9.1/node_modules/unplugin-icons/dist/resolver.js";
import { createSvgIconsPlugin } from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-svg-icons@2.0.1_vite@5.4.11_@types+node@20.17.6_sass@1.81.0_terser@5.36.0_/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import mockDevServerPlugin from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-mock-dev-server@1.8.0_esbuild@0.21.5_rollup@4.21.1_vite@5.4.11_@types+node@20.17._whbddcyrd4mbiswp3vu3sh4w3i/node_modules/vite-plugin-mock-dev-server/dist/index.js";
import UnoCSS from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/unocss@0.58.9_postcss@8.4.49_rollup@4.21.1_vite@5.4.11_@types+node@20.17.6_sass@1.81.0_terser@5.36.0_/node_modules/unocss/dist/vite.mjs";
import { resolve } from "path";

// package.json
var name = "Mixed Reality Programming Platform";
var version = "2.11.3";
var dependencies = {
  "@casl/ability": "^6.7.2",
  "@casl/vue": "^2.2.2",
  "@element-plus/icons-vue": "^2.3.1",
  "@fortawesome/fontawesome-svg-core": "^6.6.0",
  "@fortawesome/free-solid-svg-icons": "^6.6.0",
  "@fortawesome/vue-fontawesome": "^3.0.8",
  "@lljj/vue3-form-element": "^1.19.0",
  "@types/dompurify": "^3.0.5",
  "@types/three": "^0.167.2",
  "@vueuse/core": "^10.11.1",
  ajv: "^6.12.6",
  "animate.css": "^4.1.1",
  axios: "^1.7.7",
  color: "^4.2.3",
  "cos-js-sdk-v5": "^1.8.6",
  "crypto-js": "^4.2.0",
  dompurify: "^3.2.0",
  "element-china-area-data": "^6.1.0",
  "element-plus": "^2.8.7",
  "element-resize-detector": "^1.2.4",
  express: "^4.21.1",
  "highlight.js": "^10.7.3",
  howler: "^2.2.4",
  "https-localhost": "^4.7.1",
  moment: "^2.30.1",
  nprogress: "^0.2.0",
  pako: "^2.1.0",
  path: "^0.12.7",
  "path-browserify": "^1.0.1",
  "path-to-regexp": "^6.3.0",
  pinia: "^2.2.6",
  "pinia-plugin-persistedstate": "^4.2.0",
  "qrcode.vue": "^3.6.0",
  querystringify: "^2.2.0",
  "secure-ls": "^2.0.0",
  "spark-md5": "^3.0.2",
  three: "^0.167.1",
  uuid: "^10.0.0",
  vue: "^3.5.12",
  "vue-3d-loader": "^2.2.4",
  "vue-apple-login": "~2.0.1",
  "vue-cropper": "^1.1.4",
  "vue-hljs": "^3.0.1",
  "vue-i18n": "9.9.1",
  "vue-iframes": "^0.0.21",
  "vue-router": "^4.4.5",
  "vue-waterfall-plugin-next": "^2.6.4",
  "vue3-editor": "^0.1.1"
};
var devDependencies = {
  "@commitlint/cli": "^18.6.1",
  "@commitlint/config-conventional": "^18.6.3",
  "@iconify-json/ep": "^1.2.1",
  "@types/color": "^3.0.6",
  "@types/element-resize-detector": "^1.1.6",
  "@types/js-beautify": "^1.14.3",
  "@types/node": "^20.17.6",
  "@types/nprogress": "^0.2.3",
  "@types/path-browserify": "^1.0.3",
  "@types/querystringify": "^2.0.2",
  "@types/spark-md5": "^3.0.5",
  "@types/uuid": "^10.0.0",
  "@typescript-eslint/eslint-plugin": "^7.18.0",
  "@typescript-eslint/parser": "^7.18.0",
  "@vitejs/plugin-vue": "^5.2.0",
  "@vitejs/plugin-vue-jsx": "^3.1.0",
  autoprefixer: "^10.4.20",
  commitizen: "^4.3.1",
  "cz-git": "^1.11.0",
  eslint: "^8.57.1",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-import": "^2.31.0",
  "eslint-plugin-prettier": "^5.2.1",
  "eslint-plugin-vue": "^9.31.0",
  "fast-glob": "^3.3.2",
  husky: "^9.1.6",
  "js-beautify": "^1.15.1",
  "lint-staged": "^15.2.10",
  postcss: "^8.4.49",
  "postcss-html": "^1.7.0",
  "postcss-scss": "^4.0.9",
  prettier: "^3.3.3",
  sass: "^1.80.7",
  stylelint: "^16.10.0",
  "stylelint-config-html": "^1.1.0",
  "stylelint-config-recess-order": "^4.6.0",
  "stylelint-config-recommended-scss": "^14.1.0",
  "stylelint-config-recommended-vue": "^1.5.0",
  "stylelint-config-standard": "^36.0.1",
  terser: "^5.36.0",
  typescript: "^5.6.3",
  unocss: "^0.58.9",
  "unplugin-auto-import": "^0.17.8",
  "unplugin-icons": "^0.18.5",
  "unplugin-vue-components": "^0.26.0",
  vite: "^5.4.11",
  "vite-plugin-mock-dev-server": "^1.8.0",
  "vite-plugin-svg-icons": "^2.0.1",
  "vite-plugin-vue-devtools": "^7.6.4",
  "vue-tsc": "^2.1.10"
};
var engines = {
  node: ">=18.0.0"
};

// vite.config.ts
import VueDevTools from "file:///C:/Users/94991/Desktop/MRPP/vue3.7dgame.com/node_modules/.pnpm/vite-plugin-vue-devtools@7.6.4_@nuxt+kit@3.14.159_rollup@4.21.1__rollup@4.21.1_vite@5.4.11_@t_ezjeyogkhxzje5iltgz6khnhla/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
var __vite_injected_original_dirname = "C:\\Users\\94991\\Desktop\\MRPP\\vue3.7dgame.com";
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
        [env.VITE_APP_API_URL]: {
          changeOrigin: true,
          // 接口地址
          target: env.VITE_APP_API_URL,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_API_URL), "")
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
      chunkSizeWarningLimit: 4e3,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTQ5OTFcXFxcRGVza3RvcFxcXFxNUlBQXFxcXHZ1ZTMuN2RnYW1lLmNvbVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTQ5OTFcXFxcRGVza3RvcFxcXFxNUlBQXFxcXHZ1ZTMuN2RnYW1lLmNvbVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvOTQ5OTEvRGVza3RvcC9NUlBQL3Z1ZTMuN2RnYW1lLmNvbS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB2dWUgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXZ1ZVwiO1xyXG5pbXBvcnQgdnVlSnN4IGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWUtanN4XCI7XHJcbmltcG9ydCB7IFVzZXJDb25maWcsIENvbmZpZ0VudiwgbG9hZEVudiwgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuXHJcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gXCJ1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlXCI7XHJcbmltcG9ydCBDb21wb25lbnRzIGZyb20gXCJ1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlXCI7XHJcbmltcG9ydCB7IEVsZW1lbnRQbHVzUmVzb2x2ZXIgfSBmcm9tIFwidW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzXCI7XHJcbmltcG9ydCBJY29ucyBmcm9tIFwidW5wbHVnaW4taWNvbnMvdml0ZVwiO1xyXG5pbXBvcnQgSWNvbnNSZXNvbHZlciBmcm9tIFwidW5wbHVnaW4taWNvbnMvcmVzb2x2ZXJcIjtcclxuXHJcbmltcG9ydCB7IGNyZWF0ZVN2Z0ljb25zUGx1Z2luIH0gZnJvbSBcInZpdGUtcGx1Z2luLXN2Zy1pY29uc1wiO1xyXG5pbXBvcnQgbW9ja0RldlNlcnZlclBsdWdpbiBmcm9tIFwidml0ZS1wbHVnaW4tbW9jay1kZXYtc2VydmVyXCI7XHJcblxyXG5pbXBvcnQgVW5vQ1NTIGZyb20gXCJ1bm9jc3Mvdml0ZVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHtcclxuICBuYW1lLFxyXG4gIHZlcnNpb24sXHJcbiAgZW5naW5lcyxcclxuICBkZXBlbmRlbmNpZXMsXHJcbiAgZGV2RGVwZW5kZW5jaWVzLFxyXG59IGZyb20gXCIuL3BhY2thZ2UuanNvblwiO1xyXG5cclxuLy8gaHR0cHM6Ly9kZXZ0b29scy1uZXh0LnZ1ZWpzLm9yZy9cclxuaW1wb3J0IFZ1ZURldlRvb2xzIGZyb20gXCJ2aXRlLXBsdWdpbi12dWUtZGV2dG9vbHNcIjtcclxuXHJcbi8qKiBcdTVFNzNcdTUzRjBcdTc2ODRcdTU0MERcdTc5RjBcdTMwMDFcdTcyNDhcdTY3MkNcdTMwMDFcdThGRDBcdTg4NENcdTYyNDBcdTk3MDBcdTc2ODRgbm9kZWBcdTcyNDhcdTY3MkNcdTMwMDFcdTRGOURcdThENTZcdTMwMDFcdTY3ODRcdTVFRkFcdTY1RjZcdTk1RjRcdTc2ODRcdTdDN0JcdTU3OEJcdTYzRDBcdTc5M0EgKi9cclxuY29uc3QgX19BUFBfSU5GT19fID0ge1xyXG4gIHBrZzogeyBuYW1lLCB2ZXJzaW9uLCBlbmdpbmVzLCBkZXBlbmRlbmNpZXMsIGRldkRlcGVuZGVuY2llcyB9LFxyXG4gIGJ1aWxkVGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG59O1xyXG5cclxuY29uc3QgcGF0aFNyYyA9IHJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKTtcclxuLy8gIGh0dHBzOi8vY24udml0ZWpzLmRldi9jb25maWdcclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfTogQ29uZmlnRW52KTogVXNlckNvbmZpZyA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpKTtcclxuICByZXR1cm4ge1xyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgIFwiQFwiOiBwYXRoU3JjLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIGNzczoge1xyXG4gICAgICAvLyBDU1MgXHU5ODg0XHU1OTA0XHU3NDA2XHU1NjY4XHJcbiAgICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgICAvLyBcdTVCOUFcdTRFNDlcdTUxNjhcdTVDNDAgU0NTUyBcdTUzRDhcdTkxQ0ZcclxuICAgICAgICBzY3NzOiB7XHJcbiAgICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgXHJcbiAgICAgICAgICAgIEB1c2UgXCJAL3N0eWxlcy92YXJpYWJsZXMuc2Nzc1wiIGFzICo7XHJcbiAgICAgICAgICBgLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIC8vIFx1NTE0MVx1OEJCOElQXHU4QkJGXHU5NUVFXHJcbiAgICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxyXG4gICAgICAvLyBcdTVFOTRcdTc1MjhcdTdBRUZcdTUzRTMgKFx1OUVEOFx1OEJBNDozMDAwKVxyXG4gICAgICBwb3J0OiBOdW1iZXIoZW52LlZJVEVfQVBQX1BPUlQpLFxyXG4gICAgICAvLyBcdThGRDBcdTg4NENcdTY2MkZcdTU0MjZcdTgxRUFcdTUyQThcdTYyNTNcdTVGMDBcdTZENEZcdTg5QzhcdTU2NjhcclxuICAgICAgb3BlbjogdHJ1ZSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAvKiogXHU0RUUzXHU3NDA2XHU1MjREXHU3RjAwXHU0RTNBIC9kZXYtYXBpIFx1NzY4NFx1OEJGN1x1NkM0MiAgKi9cclxuICAgICAgICBbZW52LlZJVEVfQVBQX0JBU0VfQVBJXToge1xyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgLy8gXHU2M0E1XHU1M0UzXHU1NzMwXHU1NzQwXHJcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQUF9BUElfVVJMLFxyXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+XHJcbiAgICAgICAgICAgIHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiXlwiICsgZW52LlZJVEVfQVBQX0JBU0VfQVBJKSwgXCJcIiksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHZ1ZSgpLFxyXG4gICAgICAvLyBqc3hcdTMwMDF0c3hcdThCRURcdTZDRDVcdTY1MkZcdTYzMDFcclxuICAgICAgdnVlSnN4KCksXHJcbiAgICAgIC8vIE1PQ0sgXHU2NzBEXHU1MkExXHJcbiAgICAgIGVudi5WSVRFX01PQ0tfREVWX1NFUlZFUiA9PT0gXCJ0cnVlXCIgPyBtb2NrRGV2U2VydmVyUGx1Z2luKCkgOiBudWxsLFxyXG4gICAgICBVbm9DU1Moe1xyXG4gICAgICAgIGhtclRvcExldmVsQXdhaXQ6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1XHU1M0MyXHU4MDAzXHVGRjFBIGh0dHBzOi8vZ2l0aHViLmNvbS9zeHp6L2VsZW1lbnQtcGx1cy1iZXN0LXByYWN0aWNlcy9ibG9iL21haW4vdml0ZS5jb25maWcudHNcclxuICAgICAgQXV0b0ltcG9ydCh7XHJcbiAgICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1IFZ1ZSBcdTc2RjhcdTUxNzNcdTUxRkRcdTY1NzBcdUZGMENcdTU5ODJcdUZGMUFyZWYsIHJlYWN0aXZlLCB0b1JlZiBcdTdCNDlcclxuICAgICAgICBpbXBvcnRzOiBbXCJ2dWVcIiwgXCJAdnVldXNlL2NvcmVcIiwgXCJwaW5pYVwiLCBcInZ1ZS1yb3V0ZXJcIiwgXCJ2dWUtaTE4blwiXSxcclxuICAgICAgICByZXNvbHZlcnM6IFtcclxuICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NSBFbGVtZW50IFBsdXMgXHU3NkY4XHU1MTczXHU1MUZEXHU2NTcwXHVGRjBDXHU1OTgyXHVGRjFBRWxNZXNzYWdlLCBFbE1lc3NhZ2VCb3guLi4gKFx1NUUyNlx1NjgzN1x1NUYwRilcclxuICAgICAgICAgIEVsZW1lbnRQbHVzUmVzb2x2ZXIoKSxcclxuICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NVx1NTZGRVx1NjgwN1x1N0VDNFx1NEVGNlxyXG4gICAgICAgICAgSWNvbnNSZXNvbHZlcih7fSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICBlc2xpbnRyYzoge1xyXG4gICAgICAgICAgLy8gXHU2NjJGXHU1NDI2XHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwIGVzbGludCBcdTg5QzRcdTUyMTlcdUZGMENcdTVFRkFcdThCQUVcdTc1MUZcdTYyMTBcdTRFNEJcdTU0MEVcdThCQkVcdTdGNkUgZmFsc2VcclxuICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgLy8gXHU2MzA3XHU1QjlBXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1XHU1MUZEXHU2NTcwIGVzbGludCBcdTg5QzRcdTUyMTlcdTc2ODRcdTY1ODdcdTRFRjZcclxuICAgICAgICAgIGZpbGVwYXRoOiBcIi4vLmVzbGludHJjLWF1dG8taW1wb3J0Lmpzb25cIixcclxuICAgICAgICAgIGdsb2JhbHNQcm9wVmFsdWU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBcdTY2MkZcdTU0MjZcdTU3MjggdnVlIFx1NkEyMVx1Njc3Rlx1NEUyRFx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NVxyXG4gICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NVx1NTFGRFx1NjU3MFRTXHU3QzdCXHU1NzhCXHU1OEYwXHU2NjBFXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0IChmYWxzZTpcdTUxNzNcdTk1RURcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTApXHJcbiAgICAgICAgZHRzOiBmYWxzZSxcclxuICAgICAgICAvLyBkdHM6IFwic3JjL3R5cGluZ3MvYXV0by1pbXBvcnRzLmQudHNcIixcclxuICAgICAgfSksXHJcbiAgICAgIENvbXBvbmVudHMoe1xyXG4gICAgICAgIHJlc29sdmVyczogW1xyXG4gICAgICAgICAgLy8gXHU4MUVBXHU1MkE4XHU1QkZDXHU1MTY1IEVsZW1lbnQgUGx1cyBcdTdFQzRcdTRFRjZcclxuICAgICAgICAgIEVsZW1lbnRQbHVzUmVzb2x2ZXIoKSxcclxuICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NkNFOFx1NTE4Q1x1NTZGRVx1NjgwN1x1N0VDNFx1NEVGNlxyXG4gICAgICAgICAgSWNvbnNSZXNvbHZlcih7XHJcbiAgICAgICAgICAgIC8vIGVsZW1lbnQtcGx1c1x1NTZGRVx1NjgwN1x1NUU5M1x1RkYwQ1x1NTE3Nlx1NEVENlx1NTZGRVx1NjgwN1x1NUU5MyBodHRwczovL2ljb24tc2V0cy5pY29uaWZ5LmRlc2lnbi9cclxuICAgICAgICAgICAgZW5hYmxlZENvbGxlY3Rpb25zOiBbXCJlcFwiXSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgLy8gXHU2MzA3XHU1QjlBXHU4MUVBXHU1QjlBXHU0RTQ5XHU3RUM0XHU0RUY2XHU0RjREXHU3RjZFKFx1OUVEOFx1OEJBNDpzcmMvY29tcG9uZW50cylcclxuICAgICAgICBkaXJzOiBbXCJzcmMvY29tcG9uZW50c1wiLCBcInNyYy8qKi9jb21wb25lbnRzXCJdLFxyXG4gICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1ODFFQVx1NTJBOFx1NUJGQ1x1NTE2NVx1N0VDNFx1NEVGNlRTXHU3QzdCXHU1NzhCXHU1OEYwXHU2NjBFXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0IChmYWxzZTpcdTUxNzNcdTk1RURcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTApXHJcbiAgICAgICAgZHRzOiBmYWxzZSxcclxuICAgICAgICAvLyBkdHM6IFwic3JjL3R5cGluZ3MvY29tcG9uZW50cy5kLnRzXCIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBJY29ucyh7XHJcbiAgICAgICAgY29tcGlsZXI6IFwidnVlM1wiLFxyXG4gICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NUI4OVx1ODhDNVx1NTZGRVx1NjgwN1x1NUU5M1xyXG4gICAgICAgIGF1dG9JbnN0YWxsOiB0cnVlLFxyXG4gICAgICB9KSxcclxuICAgICAgY3JlYXRlU3ZnSWNvbnNQbHVnaW4oe1xyXG4gICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1OTcwMFx1ODk4MVx1N0YxM1x1NUI1OFx1NzY4NFx1NTZGRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOVxyXG4gICAgICAgIGljb25EaXJzOiBbcmVzb2x2ZShwYXRoU3JjLCBcImFzc2V0cy9pY29uc1wiKV0sXHJcbiAgICAgICAgLy8gXHU2MzA3XHU1QjlBc3ltYm9sSWRcdTY4M0NcdTVGMEZcclxuICAgICAgICBzeW1ib2xJZDogXCJpY29uLVtkaXJdLVtuYW1lXVwiLFxyXG4gICAgICB9KSxcclxuICAgICAgVnVlRGV2VG9vbHMoe1xyXG4gICAgICAgIG9wZW5JbkVkaXRvckhvc3Q6IGBodHRwOi8vbG9jYWxob3N0OiR7ZW52LlZJVEVfQVBQX1BPUlR9YCxcclxuICAgICAgfSksXHJcbiAgICBdLFxyXG4gICAgLy8gXHU5ODg0XHU1MkEwXHU4RjdEXHU5ODc5XHU3NkVFXHU1RkM1XHU5NzAwXHU3Njg0XHU3RUM0XHU0RUY2XHJcbiAgICBvcHRpbWl6ZURlcHM6IHtcclxuICAgICAgaW5jbHVkZTogW1xyXG4gICAgICAgIFwidnVlXCIsXHJcbiAgICAgICAgXCJ2dWUtcm91dGVyXCIsXHJcbiAgICAgICAgXCJwaW5pYVwiLFxyXG4gICAgICAgIFwiYXhpb3NcIixcclxuICAgICAgICBcIkB2dWV1c2UvY29yZVwiLFxyXG4gICAgICAgIFwicGF0aC10by1yZWdleHBcIixcclxuICAgICAgICBcInZ1ZS1pMThuXCIsXHJcbiAgICAgICAgXCJwYXRoLWJyb3dzZXJpZnlcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2Zvcm0vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9mb3JtLWl0ZW0vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9idXR0b24vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9pbnB1dC9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2lucHV0LW51bWJlci9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3N3aXRjaC9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3VwbG9hZC9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL21lbnUvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jb2wvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9pY29uL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvcm93L3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdGFnL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZGlhbG9nL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvbG9hZGluZy9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3JhZGlvL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvcmFkaW8tZ3JvdXAvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9wb3BvdmVyL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvc2Nyb2xsYmFyL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdG9vbHRpcC9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2Ryb3Bkb3duL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZHJvcGRvd24tbWVudS9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2Ryb3Bkb3duLWl0ZW0vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9zdWItbWVudS9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL21lbnUtaXRlbS9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2RpdmlkZXIvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jYXJkL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvbGluay9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2JyZWFkY3J1bWIvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9icmVhZGNydW1iLWl0ZW0vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy90YWJsZS9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RyZWUtc2VsZWN0L3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdGFibGUtY29sdW1uL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvc2VsZWN0L3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvb3B0aW9uL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvcGFnaW5hdGlvbi9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RyZWUvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9hbGVydC9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3JhZGlvLWJ1dHRvbi9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2NoZWNrYm94LWdyb3VwL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvY2hlY2tib3gvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy90YWJzL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvdGFiLXBhbmUvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9yYXRlL3N0eWxlL2Nzc1wiLFxyXG4gICAgICAgIFwiZWxlbWVudC1wbHVzL2VzL2NvbXBvbmVudHMvZGF0ZS1waWNrZXIvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9ub3RpZmljYXRpb24vc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9pbWFnZS9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3N0YXRpc3RpYy9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3dhdGVybWFyay9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL2NvbmZpZy1wcm92aWRlci9zdHlsZS9jc3NcIixcclxuICAgICAgICBcImVsZW1lbnQtcGx1cy9lcy9jb21wb25lbnRzL3RleHQvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9kcmF3ZXIvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9jb2xvci1waWNrZXIvc3R5bGUvY3NzXCIsXHJcbiAgICAgICAgXCJlbGVtZW50LXBsdXMvZXMvY29tcG9uZW50cy9iYWNrdG9wL3N0eWxlL2Nzc1wiLFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICAgIC8vIFx1Njc4NFx1NUVGQVx1OTE0RFx1N0Y2RVxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA0MDAwLCAvLyBcdTZEODhcdTk2NjRcdTYyNTNcdTUzMDVcdTU5MjdcdTVDMEZcdThEODVcdThGQzc1MDBrYlx1OEI2Nlx1NTQ0QVxyXG4gICAgICBtaW5pZnk6IFwidGVyc2VyXCIsIC8vIFZpdGUgMi42LnggXHU0RUU1XHU0RTBBXHU5NzAwXHU4OTgxXHU5MTREXHU3RjZFIG1pbmlmeTogXCJ0ZXJzZXJcIiwgdGVyc2VyT3B0aW9ucyBcdTYyNERcdTgwRkRcdTc1MUZcdTY1NDhcclxuICAgICAgdGVyc2VyT3B0aW9uczoge1xyXG4gICAgICAgIGNvbXByZXNzOiB7XHJcbiAgICAgICAgICBrZWVwX2luZmluaXR5OiB0cnVlLCAvLyBcdTk2MzJcdTZCNjIgSW5maW5pdHkgXHU4OEFCXHU1MzhCXHU3RjI5XHU2MjEwIDEvMFx1RkYwQ1x1OEZEOVx1NTNFRlx1ODBGRFx1NEYxQVx1NUJGQ1x1ODFGNCBDaHJvbWUgXHU0RTBBXHU3Njg0XHU2MDI3XHU4MEZEXHU5NUVFXHU5ODk4XHJcbiAgICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsIC8vIFx1NzUxRlx1NEVBN1x1NzNBRlx1NTg4M1x1NTNCQlx1OTY2NCBjb25zb2xlXHJcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLCAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTUzQkJcdTk2NjQgZGVidWdnZXJcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgY29tbWVudHM6IGZhbHNlLCAvLyBcdTUyMjBcdTk2NjRcdTZDRThcdTkxQ0FcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICAvLyBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIC8vICAgXCJ2dWUtaTE4blwiOiBbXCJ2dWUtaTE4blwiXSxcclxuICAgICAgICAgIC8vIH0sXHJcbiAgICAgICAgICAvLyBcdTc1MjhcdTRFOEVcdTRFQ0VcdTUxNjVcdTUzRTNcdTcwQjlcdTUyMUJcdTVFRkFcdTc2ODRcdTU3NTdcdTc2ODRcdTYyNTNcdTUzMDVcdThGOTNcdTUxRkFcdTY4M0NcdTVGMEZbbmFtZV1cdTg4NjhcdTc5M0FcdTY1ODdcdTRFRjZcdTU0MEQsW2hhc2hdXHU4ODY4XHU3OTNBXHU4QkU1XHU2NTg3XHU0RUY2XHU1MTg1XHU1QkI5aGFzaFx1NTAzQ1xyXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IFwianMvW25hbWVdLltoYXNoXS5qc1wiLFxyXG4gICAgICAgICAgLy8gXHU3NTI4XHU0RThFXHU1NDdEXHU1NDBEXHU0RUUzXHU3ODAxXHU2MkM2XHU1MjA2XHU2NUY2XHU1MjFCXHU1RUZBXHU3Njg0XHU1MTcxXHU0RUFCXHU1NzU3XHU3Njg0XHU4RjkzXHU1MUZBXHU1NDdEXHU1NDBEXHJcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogXCJqcy9bbmFtZV0uW2hhc2hdLmpzXCIsXHJcbiAgICAgICAgICAvLyBcdTc1MjhcdTRFOEVcdThGOTNcdTUxRkFcdTk3NTlcdTYwMDFcdThENDRcdTZFOTBcdTc2ODRcdTU0N0RcdTU0MERcdUZGMENbZXh0XVx1ODg2OFx1NzkzQVx1NjU4N1x1NEVGNlx1NjI2OVx1NUM1NVx1NTQwRFxyXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm86IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpbmZvID0gYXNzZXRJbmZvLm5hbWUuc3BsaXQoXCIuXCIpO1xyXG4gICAgICAgICAgICBsZXQgZXh0VHlwZSA9IGluZm9baW5mby5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1x1NjU4N1x1NEVGNlx1NEZFMVx1NjA2RicsIGFzc2V0SW5mby5uYW1lKVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgL1xcLihtcDR8d2VibXxvZ2d8bXAzfHdhdnxmbGFjfGFhYykoXFw/LiopPyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICBleHRUeXBlID0gXCJtZWRpYVwiO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnxzdmcpKFxcPy4qKT8kLy50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICAgIGV4dFR5cGUgPSBcImltZ1wiO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKShcXD8uKik/JC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgZXh0VHlwZSA9IFwiZm9udHNcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYCR7ZXh0VHlwZX0vW25hbWVdLltoYXNoXS5bZXh0XWA7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgIF9fQVBQX0lORk9fXzogSlNPTi5zdHJpbmdpZnkoX19BUFBfSU5GT19fKSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiIsICJ7XHJcbiAgXCJuYW1lXCI6IFwiTWl4ZWQgUmVhbGl0eSBQcm9ncmFtbWluZyBQbGF0Zm9ybVwiLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMTEuM1wiLFxyXG4gIFwicHJpdmF0ZVwiOiB0cnVlLFxyXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxyXG4gIFwic2NyaXB0c1wiOiB7XHJcbiAgICBcImRldlwiOiBcInZpdGUgLS1tb2RlIGRldmVsb3BtZW50XCIsXHJcbiAgICBcImJ1aWxkXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmIHZpdGUgYnVpbGQgLS1tb2RlIHByb2R1Y3Rpb25cIixcclxuICAgIFwiYnVpbGQ6c3RhZ2luZ1wiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiB2aXRlIGJ1aWxkIC0tbW9kZSBzdGFnaW5nXCIsXHJcbiAgICBcImJ1aWxkOm1ycHBfY29tXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmIHZpdGUgYnVpbGQgLS1tb2RlIG1ycHBfY29tXCIsXHJcbiAgICBcImJ1aWxkOjRtcl9jblwiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiB2aXRlIGJ1aWxkIC0tbW9kZSA0bXJfY25cIixcclxuICAgIFwiYnVpbGQ6MDF4cl9jb21cIjogXCJ2dWUtdHNjIC0tbm9FbWl0ICYgdml0ZSBidWlsZCAtLW1vZGUgMDF4cl9jb21cIixcclxuICAgIFwiYnVpbGQ6N2RnYW1lX2NvbVwiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiB2aXRlIGJ1aWxkIC0tbW9kZSA3ZGdhbWVfY29tXCIsXHJcbiAgICBcImJ1aWxkOjF1Y2JfY29tXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmIHZpdGUgYnVpbGQgLS1tb2RlIDF1Y2JfY29tXCIsXHJcbiAgICBcImJ1aWxkOnZveGVscGFydHlfY29tXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmIHZpdGUgYnVpbGQgLS1tb2RlIHZveGVscGFydHlfY29tXCIsXHJcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcclxuICAgIFwiYnVpbGQtb25seVwiOiBcInZpdGUgYnVpbGRcIixcclxuICAgIFwidHlwZS1jaGVja1wiOiBcInZ1ZS10c2MgLS1ub0VtaXRcIixcclxuICAgIFwibGludDplc2xpbnRcIjogXCJlc2xpbnQgIC0tZml4IC0tZXh0IC50cywuanMsLnZ1ZSAuL3NyYyBcIixcclxuICAgIFwibGludDpwcmV0dGllclwiOiBcInByZXR0aWVyIC0td3JpdGUgXFxcIioqLyoue2pzLGNqcyx0cyxqc29uLHRzeCxjc3MsbGVzcyxzY3NzLHZ1ZSxodG1sLG1kfVxcXCJcIixcclxuICAgIFwibGludDpzdHlsZWxpbnRcIjogXCJzdHlsZWxpbnQgIFxcXCIqKi8qLntjc3Msc2Nzcyx2dWV9XFxcIiAtLWZpeFwiLFxyXG4gICAgXCJsaW50OmxpbnQtc3RhZ2VkXCI6IFwibGludC1zdGFnZWRcIixcclxuICAgIFwicHJlaW5zdGFsbFwiOiBcIm5weCBvbmx5LWFsbG93IHBucG1cIixcclxuICAgIFwicHJlcGFyZVwiOiBcImh1c2t5XCIsXHJcbiAgICBcImNvbW1pdFwiOiBcImdpdC1jelwiXHJcbiAgfSxcclxuICBcImNvbmZpZ1wiOiB7XHJcbiAgICBcImNvbW1pdGl6ZW5cIjoge1xyXG4gICAgICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvY3otZ2l0XCJcclxuICAgIH1cclxuICB9LFxyXG4gIFwibGludC1zdGFnZWRcIjoge1xyXG4gICAgXCIqLntqcyx0c31cIjogW1xyXG4gICAgICBcImVzbGludCAtLWZpeFwiLFxyXG4gICAgICBcInByZXR0aWVyIC0td3JpdGVcIlxyXG4gICAgXSxcclxuICAgIFwiKi57Y2pzLGpzb259XCI6IFtcclxuICAgICAgXCJwcmV0dGllciAtLXdyaXRlXCJcclxuICAgIF0sXHJcbiAgICBcIioue3Z1ZSxodG1sfVwiOiBbXHJcbiAgICAgIFwiZXNsaW50IC0tZml4XCIsXHJcbiAgICAgIFwicHJldHRpZXIgLS13cml0ZVwiLFxyXG4gICAgICBcInN0eWxlbGludCAtLWZpeFwiXHJcbiAgICBdLFxyXG4gICAgXCIqLntzY3NzLGNzc31cIjogW1xyXG4gICAgICBcInN0eWxlbGludCAtLWZpeFwiLFxyXG4gICAgICBcInByZXR0aWVyIC0td3JpdGVcIlxyXG4gICAgXSxcclxuICAgIFwiKi5tZFwiOiBbXHJcbiAgICAgIFwicHJldHRpZXIgLS13cml0ZVwiXHJcbiAgICBdXHJcbiAgfSxcclxuICBcImRlcGVuZGVuY2llc1wiOiB7XHJcbiAgICBcIkBjYXNsL2FiaWxpdHlcIjogXCJeNi43LjJcIixcclxuICAgIFwiQGNhc2wvdnVlXCI6IFwiXjIuMi4yXCIsXHJcbiAgICBcIkBlbGVtZW50LXBsdXMvaWNvbnMtdnVlXCI6IFwiXjIuMy4xXCIsXHJcbiAgICBcIkBmb3J0YXdlc29tZS9mb250YXdlc29tZS1zdmctY29yZVwiOiBcIl42LjYuMFwiLFxyXG4gICAgXCJAZm9ydGF3ZXNvbWUvZnJlZS1zb2xpZC1zdmctaWNvbnNcIjogXCJeNi42LjBcIixcclxuICAgIFwiQGZvcnRhd2Vzb21lL3Z1ZS1mb250YXdlc29tZVwiOiBcIl4zLjAuOFwiLFxyXG4gICAgXCJAbGxqai92dWUzLWZvcm0tZWxlbWVudFwiOiBcIl4xLjE5LjBcIixcclxuICAgIFwiQHR5cGVzL2RvbXB1cmlmeVwiOiBcIl4zLjAuNVwiLFxyXG4gICAgXCJAdHlwZXMvdGhyZWVcIjogXCJeMC4xNjcuMlwiLFxyXG4gICAgXCJAdnVldXNlL2NvcmVcIjogXCJeMTAuMTEuMVwiLFxyXG4gICAgXCJhanZcIjogXCJeNi4xMi42XCIsXHJcbiAgICBcImFuaW1hdGUuY3NzXCI6IFwiXjQuMS4xXCIsXHJcbiAgICBcImF4aW9zXCI6IFwiXjEuNy43XCIsXHJcbiAgICBcImNvbG9yXCI6IFwiXjQuMi4zXCIsXHJcbiAgICBcImNvcy1qcy1zZGstdjVcIjogXCJeMS44LjZcIixcclxuICAgIFwiY3J5cHRvLWpzXCI6IFwiXjQuMi4wXCIsXHJcbiAgICBcImRvbXB1cmlmeVwiOiBcIl4zLjIuMFwiLFxyXG4gICAgXCJlbGVtZW50LWNoaW5hLWFyZWEtZGF0YVwiOiBcIl42LjEuMFwiLFxyXG4gICAgXCJlbGVtZW50LXBsdXNcIjogXCJeMi44LjdcIixcclxuICAgIFwiZWxlbWVudC1yZXNpemUtZGV0ZWN0b3JcIjogXCJeMS4yLjRcIixcclxuICAgIFwiZXhwcmVzc1wiOiBcIl40LjIxLjFcIixcclxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwiXjEwLjcuM1wiLFxyXG4gICAgXCJob3dsZXJcIjogXCJeMi4yLjRcIixcclxuICAgIFwiaHR0cHMtbG9jYWxob3N0XCI6IFwiXjQuNy4xXCIsXHJcbiAgICBcIm1vbWVudFwiOiBcIl4yLjMwLjFcIixcclxuICAgIFwibnByb2dyZXNzXCI6IFwiXjAuMi4wXCIsXHJcbiAgICBcInBha29cIjogXCJeMi4xLjBcIixcclxuICAgIFwicGF0aFwiOiBcIl4wLjEyLjdcIixcclxuICAgIFwicGF0aC1icm93c2VyaWZ5XCI6IFwiXjEuMC4xXCIsXHJcbiAgICBcInBhdGgtdG8tcmVnZXhwXCI6IFwiXjYuMy4wXCIsXHJcbiAgICBcInBpbmlhXCI6IFwiXjIuMi42XCIsXHJcbiAgICBcInBpbmlhLXBsdWdpbi1wZXJzaXN0ZWRzdGF0ZVwiOiBcIl40LjIuMFwiLFxyXG4gICAgXCJxcmNvZGUudnVlXCI6IFwiXjMuNi4wXCIsXHJcbiAgICBcInF1ZXJ5c3RyaW5naWZ5XCI6IFwiXjIuMi4wXCIsXHJcbiAgICBcInNlY3VyZS1sc1wiOiBcIl4yLjAuMFwiLFxyXG4gICAgXCJzcGFyay1tZDVcIjogXCJeMy4wLjJcIixcclxuICAgIFwidGhyZWVcIjogXCJeMC4xNjcuMVwiLFxyXG4gICAgXCJ1dWlkXCI6IFwiXjEwLjAuMFwiLFxyXG4gICAgXCJ2dWVcIjogXCJeMy41LjEyXCIsXHJcbiAgICBcInZ1ZS0zZC1sb2FkZXJcIjogXCJeMi4yLjRcIixcclxuICAgIFwidnVlLWFwcGxlLWxvZ2luXCI6IFwifjIuMC4xXCIsXHJcbiAgICBcInZ1ZS1jcm9wcGVyXCI6IFwiXjEuMS40XCIsXHJcbiAgICBcInZ1ZS1obGpzXCI6IFwiXjMuMC4xXCIsXHJcbiAgICBcInZ1ZS1pMThuXCI6IFwiOS45LjFcIixcclxuICAgIFwidnVlLWlmcmFtZXNcIjogXCJeMC4wLjIxXCIsXHJcbiAgICBcInZ1ZS1yb3V0ZXJcIjogXCJeNC40LjVcIixcclxuICAgIFwidnVlLXdhdGVyZmFsbC1wbHVnaW4tbmV4dFwiOiBcIl4yLjYuNFwiLFxyXG4gICAgXCJ2dWUzLWVkaXRvclwiOiBcIl4wLjEuMVwiXHJcbiAgfSxcclxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XHJcbiAgICBcIkBjb21taXRsaW50L2NsaVwiOiBcIl4xOC42LjFcIixcclxuICAgIFwiQGNvbW1pdGxpbnQvY29uZmlnLWNvbnZlbnRpb25hbFwiOiBcIl4xOC42LjNcIixcclxuICAgIFwiQGljb25pZnktanNvbi9lcFwiOiBcIl4xLjIuMVwiLFxyXG4gICAgXCJAdHlwZXMvY29sb3JcIjogXCJeMy4wLjZcIixcclxuICAgIFwiQHR5cGVzL2VsZW1lbnQtcmVzaXplLWRldGVjdG9yXCI6IFwiXjEuMS42XCIsXHJcbiAgICBcIkB0eXBlcy9qcy1iZWF1dGlmeVwiOiBcIl4xLjE0LjNcIixcclxuICAgIFwiQHR5cGVzL25vZGVcIjogXCJeMjAuMTcuNlwiLFxyXG4gICAgXCJAdHlwZXMvbnByb2dyZXNzXCI6IFwiXjAuMi4zXCIsXHJcbiAgICBcIkB0eXBlcy9wYXRoLWJyb3dzZXJpZnlcIjogXCJeMS4wLjNcIixcclxuICAgIFwiQHR5cGVzL3F1ZXJ5c3RyaW5naWZ5XCI6IFwiXjIuMC4yXCIsXHJcbiAgICBcIkB0eXBlcy9zcGFyay1tZDVcIjogXCJeMy4wLjVcIixcclxuICAgIFwiQHR5cGVzL3V1aWRcIjogXCJeMTAuMC4wXCIsXHJcbiAgICBcIkB0eXBlc2NyaXB0LWVzbGludC9lc2xpbnQtcGx1Z2luXCI6IFwiXjcuMTguMFwiLFxyXG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvcGFyc2VyXCI6IFwiXjcuMTguMFwiLFxyXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWVcIjogXCJeNS4yLjBcIixcclxuICAgIFwiQHZpdGVqcy9wbHVnaW4tdnVlLWpzeFwiOiBcIl4zLjEuMFwiLFxyXG4gICAgXCJhdXRvcHJlZml4ZXJcIjogXCJeMTAuNC4yMFwiLFxyXG4gICAgXCJjb21taXRpemVuXCI6IFwiXjQuMy4xXCIsXHJcbiAgICBcImN6LWdpdFwiOiBcIl4xLjExLjBcIixcclxuICAgIFwiZXNsaW50XCI6IFwiXjguNTcuMVwiLFxyXG4gICAgXCJlc2xpbnQtY29uZmlnLXByZXR0aWVyXCI6IFwiXjkuMS4wXCIsXHJcbiAgICBcImVzbGludC1wbHVnaW4taW1wb3J0XCI6IFwiXjIuMzEuMFwiLFxyXG4gICAgXCJlc2xpbnQtcGx1Z2luLXByZXR0aWVyXCI6IFwiXjUuMi4xXCIsXHJcbiAgICBcImVzbGludC1wbHVnaW4tdnVlXCI6IFwiXjkuMzEuMFwiLFxyXG4gICAgXCJmYXN0LWdsb2JcIjogXCJeMy4zLjJcIixcclxuICAgIFwiaHVza3lcIjogXCJeOS4xLjZcIixcclxuICAgIFwianMtYmVhdXRpZnlcIjogXCJeMS4xNS4xXCIsXHJcbiAgICBcImxpbnQtc3RhZ2VkXCI6IFwiXjE1LjIuMTBcIixcclxuICAgIFwicG9zdGNzc1wiOiBcIl44LjQuNDlcIixcclxuICAgIFwicG9zdGNzcy1odG1sXCI6IFwiXjEuNy4wXCIsXHJcbiAgICBcInBvc3Rjc3Mtc2Nzc1wiOiBcIl40LjAuOVwiLFxyXG4gICAgXCJwcmV0dGllclwiOiBcIl4zLjMuM1wiLFxyXG4gICAgXCJzYXNzXCI6IFwiXjEuODAuN1wiLFxyXG4gICAgXCJzdHlsZWxpbnRcIjogXCJeMTYuMTAuMFwiLFxyXG4gICAgXCJzdHlsZWxpbnQtY29uZmlnLWh0bWxcIjogXCJeMS4xLjBcIixcclxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1yZWNlc3Mtb3JkZXJcIjogXCJeNC42LjBcIixcclxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1yZWNvbW1lbmRlZC1zY3NzXCI6IFwiXjE0LjEuMFwiLFxyXG4gICAgXCJzdHlsZWxpbnQtY29uZmlnLXJlY29tbWVuZGVkLXZ1ZVwiOiBcIl4xLjUuMFwiLFxyXG4gICAgXCJzdHlsZWxpbnQtY29uZmlnLXN0YW5kYXJkXCI6IFwiXjM2LjAuMVwiLFxyXG4gICAgXCJ0ZXJzZXJcIjogXCJeNS4zNi4wXCIsXHJcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNS42LjNcIixcclxuICAgIFwidW5vY3NzXCI6IFwiXjAuNTguOVwiLFxyXG4gICAgXCJ1bnBsdWdpbi1hdXRvLWltcG9ydFwiOiBcIl4wLjE3LjhcIixcclxuICAgIFwidW5wbHVnaW4taWNvbnNcIjogXCJeMC4xOC41XCIsXHJcbiAgICBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzXCI6IFwiXjAuMjYuMFwiLFxyXG4gICAgXCJ2aXRlXCI6IFwiXjUuNC4xMVwiLFxyXG4gICAgXCJ2aXRlLXBsdWdpbi1tb2NrLWRldi1zZXJ2ZXJcIjogXCJeMS44LjBcIixcclxuICAgIFwidml0ZS1wbHVnaW4tc3ZnLWljb25zXCI6IFwiXjIuMC4xXCIsXHJcbiAgICBcInZpdGUtcGx1Z2luLXZ1ZS1kZXZ0b29sc1wiOiBcIl43LjYuNFwiLFxyXG4gICAgXCJ2dWUtdHNjXCI6IFwiXjIuMS4xMFwiXHJcbiAgfSxcclxuICBcInJlcG9zaXRvcnlcIjogXCJodHRwczovL2dpdGVlLmNvbS95b3VsYWlvcmcvdnVlMy1lbGVtZW50LWFkbWluLmdpdFwiLFxyXG4gIFwiYXV0aG9yXCI6IFwiXCIsXHJcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXHJcbiAgXCJlbmdpbmVzXCI6IHtcclxuICAgIFwibm9kZVwiOiBcIj49MTguMC4wXCJcclxuICB9LFxyXG4gIFwicGFja2FnZU1hbmFnZXJcIjogXCJwbnBtQDkuMS4zK3NoYTUxMi43YzJlYTA4OWUxYTZhZjMwNjQwOWM0ZmM4YzRmMDg5N2JkYWMzMmI3NzIwMTYxOTZjNDY5ZDk0MjhmMWZlMmQ1YTIxZGFmOGFkNjUxMjc2MjY1NGFjNjQ1YjVkOTEzNmJiMjEwZWM5YTAwYWZhOGRiYzQ2Nzc4NDNiYTM2MmVjZFwiXHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErVCxPQUFPLFNBQVM7QUFDL1UsT0FBTyxZQUFZO0FBQ25CLFNBQWdDLFNBQVMsb0JBQW9CO0FBRTdELE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsMkJBQTJCO0FBQ3BDLE9BQU8sV0FBVztBQUNsQixPQUFPLG1CQUFtQjtBQUUxQixTQUFTLDRCQUE0QjtBQUNyQyxPQUFPLHlCQUF5QjtBQUVoQyxPQUFPLFlBQVk7QUFDbkIsU0FBUyxlQUFlOzs7QUNidEIsV0FBUTtBQUNSLGNBQVc7QUFrRFgsbUJBQWdCO0FBQUEsRUFDZCxpQkFBaUI7QUFBQSxFQUNqQixhQUFhO0FBQUEsRUFDYiwyQkFBMkI7QUFBQSxFQUMzQixxQ0FBcUM7QUFBQSxFQUNyQyxxQ0FBcUM7QUFBQSxFQUNyQyxnQ0FBZ0M7QUFBQSxFQUNoQywyQkFBMkI7QUFBQSxFQUMzQixvQkFBb0I7QUFBQSxFQUNwQixnQkFBZ0I7QUFBQSxFQUNoQixnQkFBZ0I7QUFBQSxFQUNoQixLQUFPO0FBQUEsRUFDUCxlQUFlO0FBQUEsRUFDZixPQUFT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
