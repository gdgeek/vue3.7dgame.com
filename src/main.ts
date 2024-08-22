import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import ability from "./ability";
import VueIframe from "vue-iframes";

import highlightDirective from "./directive/highlight";

library.add(fas);

// 本地SVG图标
import "virtual:svg-icons-register";

// 样式
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";
import "animate.css";
import router from "./router";
// 更新页面标题
const updateTitle = (title: string) => {
  document.title = `${title} - 7D Game`;
};

// 监听路由变化更新页面标题
router.beforeEach((to) => {
  const metaTitle = to.meta.title as string;
  if (metaTitle) {
    updateTitle(metaTitle);
  } else {
    updateTitle("");
  }
});

const app = createApp(App);
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.directive("highlight", highlightDirective);
app.use(setupPlugins);
// app.use(ability);
app.use(VueIframe);
app.mount("#app");
