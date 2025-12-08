import type { App } from "vue";
import { createI18n } from "vue-i18n";
import { useAppStoreHook } from "@/store/modules/app";
// 本地语言包
import zhCnLocale from "./package/zh-CN";

const appStore = useAppStoreHook();

const messages = {
  "zh-CN": {
    ...zhCnLocale,
  },
};

const i18n = createI18n({
  legacy: false,
  locale: appStore.language as string,
  messages: messages,
  globalInjection: true,
});

// 全局注册 i18n
export function setupI18n(app: App<Element>) {
  app.use(i18n);
}

/**
 * 异步加载语言包
 * @param locale 语言标识
 */
export const loadLanguageAsync = async (locale: string) => {
  // 检查语言是否已经加载（不仅在 availableLocales 中，还要有实际的消息内容）
  const messages = i18n.global.getLocaleMessage(locale);
  const hasMessages = messages && Object.keys(messages).length > 0;

  if (hasMessages) {
    if (i18n.global.locale.value !== locale) {
      (i18n.global.locale as any).value = locale;
      await appStore.changeLanguage(locale);
    }
    return Promise.resolve();
  }

  // 动态加载语言包（排除已静态导入的 zh-CN）
  const modules = import.meta.glob(["./package/*.ts", "!./package/zh-CN.ts"]);

  // 查找匹配的路径
  const targetPath = Object.keys(modules).find((path) => {
    const fileName = path.split("/").pop()?.replace(".ts", "");
    return fileName?.toLowerCase() === locale.toLowerCase();
  });

  if (targetPath && modules[targetPath]) {
    return (modules[targetPath]() as Promise<any>).then(async (messages) => {
      // 使用正确的文件名作为 locale
      const correctLocale =
        targetPath.split("/").pop()?.replace(".ts", "") || locale;

      i18n.global.setLocaleMessage(correctLocale, messages.default);
      (i18n.global.locale as any).value = correctLocale;
      await appStore.changeLanguage(correctLocale);
      return Promise.resolve();
    });
  } else {
    // 回退到简体中文
    console.warn(
      `Language file not found for locale: ${locale}, falling back to zh-CN`
    );
    if (i18n.global.locale.value !== "zh-CN") {
      (i18n.global.locale as any).value = "zh-CN";
      await appStore.changeLanguage("zh-CN");
    }
    return Promise.resolve();
  }
};

export default i18n;
