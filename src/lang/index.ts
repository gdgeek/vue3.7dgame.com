import type { App } from "vue";
import { createI18n } from "vue-i18n";
import { useAppStoreHook } from "@/store/modules/app";
// 本地语言包（模块化结构）
import zhCnLocale from "./zh-CN";

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

  // Helper function to refresh domain info after language change
  const refreshDomainInfo = async () => {
    const { useDomainStore } = await import("@/store/modules/domain");
    const domainStore = useDomainStore();
    await domainStore.refreshFromAPI();
  };

  if (hasMessages) {
    if (i18n.global.locale.value !== locale) {
      (i18n.global.locale as any).value = locale;
      await appStore.changeLanguage(locale);
      // Refresh domain info with new language
      await refreshDomainInfo();
    }
    return Promise.resolve();
  }

  // 动态加载语言包（使用模块化目录结构，排除已静态导入的 zh-CN）
  const modules = import.meta.glob(["./**/index.ts", "!./zh-CN/index.ts"]);

  // 查找匹配的语言目录
  const targetPath = Object.keys(modules).find((path) => {
    // 路径格式: ./en-US/index.ts -> en-US
    const langDir = path.split("/")[1];
    return langDir?.toLowerCase() === locale.toLowerCase();
  });

  if (targetPath && modules[targetPath]) {
    return (modules[targetPath]() as Promise<any>).then(async (messages) => {
      // 从路径 ./en-US/index.ts 提取 locale 名称 en-US
      const correctLocale = targetPath.split("/")[1] || locale;

      i18n.global.setLocaleMessage(correctLocale, messages.default);
      (i18n.global.locale as any).value = correctLocale;
      await appStore.changeLanguage(correctLocale);
      // Refresh domain info with new language
      await refreshDomainInfo();
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
      // Refresh domain info with new language
      await refreshDomainInfo();
    }
    return Promise.resolve();
  }
};

export default i18n;
