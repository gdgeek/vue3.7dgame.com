import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { UserConfig, ConfigEnv, loadEnv, defineConfig } from "vite";

import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";

import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
import mockDevServerPlugin from "vite-plugin-mock-dev-server";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

import UnoCSS from "unocss/vite";
import { resolve } from "path";
import {
  name,
  version,
  engines,
  dependencies,
  devDependencies,
} from "./package.json";

// https://devtools-next.vuejs.org/
import VueDevTools from "vite-plugin-vue-devtools";

/** 平台的名称、版本、运行所需的`node`版本、依赖、构建时间的类型提示 */
const __APP_INFO__ = {
  pkg: { name, version, engines, dependencies, devDependencies },
  buildTimestamp: Date.now(),
};

const pathSrc = resolve(__dirname, "src");
//  https://cn.vitejs.dev/config
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd());
  return {
    resolve: {
      alias: {
        "@": pathSrc,
      },
    },
    css: {
      // CSS 预处理器
      preprocessorOptions: {
        // 定义全局 SCSS 变量
        scss: {
          api: "modern-compiler",
          javascriptEnabled: true,
          additionalData: `
            @use "@/styles/variables.scss" as *;
          `,
        },
      },
    },
    server: {
      // 允许IP访问
      host: "0.0.0.0",
      // 应用端口 (默认:3000)
      port: Number(env.VITE_APP_PORT),
      // 运行是否自动打开浏览器
      open: true,
      proxy: env.VITE_APP_API_URL
        ? {
            /** 代理前缀为 /dev-api 的请求  */
            [env.VITE_APP_API_URL]: {
              changeOrigin: true,
              // 接口地址
              target: env.VITE_APP_API_URL,
              rewrite: (path) =>
                path.replace(new RegExp("^" + env.VITE_APP_API_URL), ""),
            },
          }
        : undefined,
    },
    plugins: [
      vue(),
      // jsx、tsx语法支持
      vueJsx(),
      // MOCK 服务
      env.VITE_MOCK_DEV_SERVER === "true" ? mockDevServerPlugin() : null,
      UnoCSS({
        hmrTopLevelAwait: false,
      }),
      // 自动导入参考： https://github.com/sxzz/element-plus-best-practices/blob/main/vite.config.ts
      AutoImport({
        // 自动导入 Vue 相关函数，如：ref, reactive, toRef 等
        imports: ["vue", "@vueuse/core", "pinia", "vue-router", "vue-i18n"],
        resolvers: [
          // 自动导入 Element Plus 相关函数，如：ElMessage, ElMessageBox... (带样式)
          ElementPlusResolver(),
          // 自动导入图标组件
          IconsResolver({}),
        ],
        eslintrc: {
          // 是否自动生成 eslint 规则，建议生成之后设置 false
          enabled: false,
          // 指定自动导入函数 eslint 规则的文件
          filepath: "./.eslintrc-auto-import.json",
          globalsPropValue: true,
        },
        // 是否在 vue 模板中自动导入
        vueTemplate: true,
        // 指定自动导入函数TS类型声明文件路径 (false:关闭自动生成)
        dts: false,
        // dts: "src/typings/auto-imports.d.ts",
      }),
      Components({
        resolvers: [
          // 自动导入 Element Plus 组件
          ElementPlusResolver(),
          // 自动注册图标组件
          IconsResolver({
            // element-plus图标库，其他图标库 https://icon-sets.iconify.design/
            enabledCollections: ["ep"],
          }),
        ],
        // 指定自定义组件位置(默认:src/components)
        dirs: ["src/components", "src/**/components"],
        // 指定自动导入组件TS类型声明文件路径 (false:关闭自动生成)
        dts: false,
        // dts: "src/typings/components.d.ts",
      }),
      Icons({
        compiler: "vue3",
        // 自动安装图标库
        autoInstall: true,
      }),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [resolve(pathSrc, "assets/icons")],
        // 指定symbolId格式
        symbolId: "icon-[dir]-[name]",
      }),
      VueDevTools({
        openInEditorHost: `http://localhost:${env.VITE_APP_PORT}`,
      }),
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "stats.html",
      }),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // 10kb
        algorithm: "gzip",
        ext: ".gz",
      }),
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
        "@fortawesome/fontawesome-svg-core",
      ],
    },
    // 生产环境移除 console 和 debugger
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    // 构建配置
    build: {
      chunkSizeWarningLimit: 4000, // 消除打包大小超过500kb警告
      minify: "esbuild",
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          // 手动分割第三方库到独立 chunk
          manualChunks: {
            // Vue 核心
            "vue-core": ["vue", "vue-router", "pinia", "vue-i18n"],
            // Element Plus 组件库
            "element-plus": ["element-plus", "@element-plus/icons-vue"],
            // 3D 相关
            three: ["three"],
            // 图表
            echarts: ["echarts"],
            // 代码编辑器
            codemirror: [
              "codemirror",
              "@codemirror/lang-javascript",
              "@codemirror/lang-json",
              "@codemirror/lint",
              "@codemirror/theme-one-dark",
              "vue-codemirror",
            ],
            // FontAwesome 图标
            fontawesome: [
              "@fortawesome/fontawesome-svg-core",
              "@fortawesome/free-solid-svg-icons",
              "@fortawesome/vue-fontawesome",
            ],
          },
          // 用于从入口点创建的块的打包输出格式[name]表示文件名,[hash]表示该文件内容hash值
          entryFileNames: "js/[name].[hash].js",
          // 用于命名代码拆分时创建的共享块的输出命名
          chunkFileNames: "js/[name].[hash].js",
          // 用于输出静态资源的命名，[ext]表示文件扩展名
          assetFileNames: (assetInfo: any) => {
            const info = assetInfo.name.split(".");
            let extType = info[info.length - 1];
            // console.log('文件信息', assetInfo.name)
            if (
              /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)
            ) {
              extType = "media";
            } else if (/\.(png|jpe?g|gif|svg)(\?.*)?$/.test(assetInfo.name)) {
              extType = "img";
            } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
              extType = "fonts";
            }
            return `${extType}/[name].[hash].[ext]`;
          },
        },
      },
    },
    define: {
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },
  };
});
