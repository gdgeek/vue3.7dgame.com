// import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import VueIframe from "vue-iframes";
import { mouseEffect, particleEffect } from "@/mouse";
import VueForm from "@lljj/vue3-form-element";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css"; // 导入 Element Plus 样式

import { ability } from "@/ability";
//import { UpdateAbility } from '@/utils/ability';

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

//UpdateAbility(ability, [], 0);
const app = createApp(App);
function getCurrentUrl() {
  let currentUrl = window.location.href;
  const index = currentUrl.indexOf("?");

  // 如果找到了问号，截取问号之前的部分
  if (index !== -1) {
    currentUrl = currentUrl.substring(0, index);
  }

  if (currentUrl.endsWith("/")) {
    currentUrl = currentUrl.slice(0, -1);
  }
  //alert(currentUrl)
  return currentUrl;
}

app.use(VueAppleLogin, {
  clientId: "com.mrpp.www",
  scope: "name email",
  redirectURI: getCurrentUrl(),
  state: "test",
  usePopup: true,
});

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

// 添加 CASL 插件

app.mount("#app");
