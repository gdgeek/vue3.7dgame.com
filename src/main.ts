// import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import VueIframe from "vue-iframes";
import { mouseEffect, particleEffect } from "@/mouse";

import { ability } from "@/ability";
//import { UpdateAbility } from '@/utils/ability';

import { abilitiesPlugin } from "@casl/vue";

import highlightDirective from "./directive/highlight";

library.add(fas);

// 本地SVG图标
import "virtual:svg-icons-register";
import "element-plus/theme-chalk/display.css";
// 样式
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";
import "animate.css";
import { useRouter } from "@/router";
//import { useAbility } from "@casl/vue";
const router = useRouter();
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
//UpdateAbility(ability, [], 0);
const app = createApp(App);
app.use(abilitiesPlugin, ability, {
  useGlobalProperties: true,
});
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.directive("highlight", highlightDirective);
app.directive("mouse-effect", mouseEffect);
app.directive("particle-effect", particleEffect);
app.use(setupPlugins);
app.use(VueIframe);

// 添加 CASL 插件

app.mount("#app");
