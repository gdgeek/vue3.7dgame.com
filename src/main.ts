// import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import VueIframe from "vue-iframes";
import { mouseEffect, particleEffect } from "@/mouse";
import { VueAppleLoginConfig } from "@/utils/helper";
import VueForm from "@lljj/vue3-form-element";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

import { ability } from "@/ability";

import { abilitiesPlugin } from "@casl/vue";

import highlightDirective from "./directive/highlight";
import VueAppleLogin from "vue-apple-login";
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
import { translateRouteTitle } from "./utils/i18n";
import { useAppStore } from "./store";
const router = useRouter();

// 更新页面标题
const updateTitle = (title: string) => {
  document.title = title
    ? `${translateRouteTitle(title)} - MrPP.com`
    : "MrPP.com";
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

const appStore = useAppStore();

// 监听语言变化，自动更新页面标题
watch(
  () => appStore.language,
  () => {
    const metaTitle = router.currentRoute.value.meta.title as string;
    if (metaTitle) {
      updateTitle(metaTitle);
    }
  }
);

const app = createApp(App);

const time = new Date().getTime();
app.use(VueAppleLogin, VueAppleLoginConfig);

app.use(abilitiesPlugin, ability, {
  useGlobalProperties: true,
});
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.component("VueForm", VueForm);
app.directive("highlight", highlightDirective);
app.directive("mouse-effect", mouseEffect);
app.directive("particle-effect", particleEffect);
app.use(setupPlugins);
app.use(VueIframe);
app.use(ElementPlus);

app.mount("#app");
