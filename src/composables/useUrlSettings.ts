/**
 * URL 参数持久化 composable
 * 将 lang 和 theme 同步到 URL query 参数，刷新不丢失
 *
 * URL 参数优先级高于 localStorage，适用于分享链接场景
 * 示例: ?lang=en-US&theme=cyber-dark
 *
 * URL 参数和用户已保存的选择优先于域名提供的默认值。
 */
import { watch } from "vue";
import { useAppStoreHook } from "@/store/modules/app";
import { loadLanguageAsync } from "@/lang";
import { useTheme } from "@/composables/useTheme";
import { getTheme } from "@/styles/themes";
import { LanguageEnum } from "@/enums/LanguageEnum";

const URL_PARAM_LANG = "lang";
const URL_PARAM_THEME = "theme";
const SUPPORTED_LANGUAGES = new Set<string>([
  LanguageEnum.ZH_CN,
  LanguageEnum.EN,
  LanguageEnum.JA,
  LanguageEnum.TH,
  LanguageEnum.ZH_TW,
]);

// 在模块加载时立即捕获原始 URL 参数（Vue Router redirect 之前）
const initialParams = new URLSearchParams(window.location.search);
const savedLang = initialParams.get(URL_PARAM_LANG);
const savedTheme = initialParams.get(URL_PARAM_THEME);

/**
 * 更新 URL query 参数（不刷新页面）
 */
function setUrlParams(updates: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

/**
 * 初始化：从捕获的 URL 参数应用设置
 * 应在 app mount 之前调用
 *
 * 注意：此时 domain info 可能尚未加载，所以先应用并保存 URL 参数，
 * 让后续加载的域名默认值不会覆盖用户明确传入的选择。
 */
export async function initUrlSettings(): Promise<void> {
  const { setTheme, initTheme } = useTheme();

  // 应用 URL 中的语言（如果有效）
  if (savedLang && SUPPORTED_LANGUAGES.has(savedLang)) {
    await loadLanguageAsync(savedLang);
  }

  // 应用 URL 中的主题（如果有效）
  if (savedTheme && getTheme(savedTheme)) {
    setTheme(savedTheme);
  }

  // 始终调用 initTheme 确保主题 CSS 变量被应用
  initTheme();
}

/**
 * 启动 watcher，设置变更时自动同步到 URL
 */
export function watchUrlSettings(): void {
  const appStore = useAppStoreHook();
  const { currentThemeName } = useTheme();

  syncToUrl(appStore, currentThemeName.value);

  // 监听语言变化
  watch(
    () => appStore.language,
    () => syncToUrl(appStore, currentThemeName.value)
  );

  // 监听主题变化
  watch(currentThemeName, (theme) => syncToUrl(appStore, theme));
}

/**
 * 同步当前设置到 URL
 */
function syncToUrl(
  appStore: ReturnType<typeof useAppStoreHook>,
  theme: string
) {
  setUrlParams({
    [URL_PARAM_LANG]: appStore.language,
    [URL_PARAM_THEME]: theme,
  });
}

/**
 * 安装路由守卫，确保路由切换后 URL 参数不丢失
 */
export function installRouterGuard(router: {
  afterEach: (guard: () => void) => void;
}): void {
  const appStore = useAppStoreHook();
  const { currentThemeName } = useTheme();

  router.afterEach(() => {
    syncToUrl(appStore, currentThemeName.value);
  });
}
