import type { App } from "vue";
import { createI18n } from "vue-i18n";
import { useAppStoreHook } from "@/store/modules/app";
// 本地语言包
import enLocale from "./package/en-US";
import zhCnLocale from "./package/zh-CN";
import jaLocale from "./package/ja-JP";
import thLocale from "./package/th-TH";
import zhTwLocale from "./package/zh-TW";

const appStore = useAppStoreHook();

const messages = {
  "zh-CN": {
    ...zhCnLocale,
  },
  "en-US": {
    ...enLocale,
  },
  "ja-JP": {
    ...jaLocale,
  },
  "th-TH": {
    ...thLocale,
  },
  "zh-TW": {
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
