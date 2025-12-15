import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
// 按需导入图标，而不是全量导入 fas（可减少约 750KB）
import {
  faThumbsUp,
  faUser,
  faPlus,
  faInfo,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import VueIframe from "vue-iframes";
import { VueAppleLoginConfig } from "@/utils/helper";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { ability } from "@/ability";

import { abilitiesPlugin } from "@casl/vue";

import highlightDirective from "./directive/highlight";
import VueAppleLogin from "vue-apple-login";
// 只注册实际使用的图标
library.add(faThumbsUp, faUser, faPlus, faInfo, faBoxOpen);

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
import { useAppStore, store } from "./store";
import { useDomainStore } from "./store/modules/domain";
const router = useRouter();
const domainStore = useDomainStore(store);

// 更新页面标题
const updateTitle = (title: string) => {
  const domain = domainStore.domain || window.location.hostname;
  document.title = title ? `${translateRouteTitle(title)} - ${domain}` : domain;
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

const appStore = useAppStore(store);

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

//const time = new Date().getTime();
app.use(VueAppleLogin, VueAppleLoginConfig);

app.use(abilitiesPlugin, ability, {
  useGlobalProperties: true,
});
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.directive("highlight", highlightDirective);
app.use(setupPlugins);
app.use(VueIframe);
//app.use(ElementPlus);
import { loadLanguageAsync } from "@/lang";

// 加载当前语言包
loadLanguageAsync(appStore.language).then(() => {
  app.mount("#app");
  // 确保路由就绪后，再更新页面标题（修复刷新时标题多语言不生效的问题）
  router.isReady().then(() => {
    const metaTitle = router.currentRoute.value.meta.title as string;
    if (metaTitle) {
      updateTitle(metaTitle);
    }
  });
});
