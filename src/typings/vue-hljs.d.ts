declare module "vue-hljs" {
  import { Plugin } from "vue";
  import hljs from "highlight.js";

  const vueHljs: {
    install(app: any, options?: { hljs?: typeof hljs }): void;
  };

  export default vueHljs;
}
