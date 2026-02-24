declare module "vue-hljs" {
  import type { App } from "vue";
  import hljs from "highlight.js";

  const vueHljs: {
    install(app: App, options?: { hljs?: typeof hljs }): void;
  };

  export default vueHljs;
}
