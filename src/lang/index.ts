import type { App } from "vue";
import { createI18n } from "vue-i18n";
import { useAppStoreHook } from "@/store/modules/app";
// 本地语言包
import enLocale from "./package/en";
import zhCnLocale from "./package/zh-cn";
import jaLocale from "./package/ja";
import thLocale from "./package/th";
import zhTwLocale from "./package/zh-tw";

const appStore = useAppStoreHook();

const messages = {
  "zh-cn": {
    ...zhCnLocale,
  },
  en: {
    ...enLocale,
  },
  ja: {
    ...jaLocale,
  },
  th: {
    ...thLocale,
  },
  "zh-tw": {
    ...zhTwLocale,
  },
};

const i18n = createI18n({
  legacy: false,
  locale: appStore.language,
  messages: messages,
  globalInjection: true,
});

// 全局注册 i18n
export function setupI18n(app: App<Element>) {
  app.use(i18n);
}

export default i18n;
