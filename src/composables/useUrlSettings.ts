/**
 * URL 参数持久化 composable
 * 将 lang 和 theme 同步到 URL query 参数，刷新不丢失
 *
 * URL 参数优先级高于 localStorage，适用于分享链接场景
 * 示例: ?lang=en-US&theme=cyber-dark
 *
 * 关键：在 Vue Router 初始化之前就捕获原始 URL 参数，
 * 因为 router 的 redirect 会丢掉 query string
 */
import { watch } from "vue";
import { useAppStoreHook } from "@/store/modules/app";
import { loadLanguageAsync } from "@/lang";
import { useTheme } from "@/composables/useTheme";
import { getTheme } from "@/styles/themes";

const URL_PARAM_LANG = "lang";
const URL_PARAM_THEME = "theme";

/**
 * 在模块加载时立即捕获原始 URL 参数
 * 这发生在 Vue Router 初始化之前，所以不会被 redirect 丢掉
 */
const initialParams = new URLSearchParams(window.location.search);
const savedLang = initialParams.get(URL_PARAM_LANG);
const savedTheme = initialParams.get(URL_PARAM_THEME);

/**
 * 更新 URL query 参数（不刷新页面）
 * 保留其他已有的 query 参数
 */
function setUrlParams(updates: Record<string, string>) {
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
 */
export async function initUrlSettings(): Promise<void> {
  const appStore = useAppStoreHook();
  const { setTheme, initTheme, currentThemeName } = useTheme();

  // 应用 URL 中的语言（如果有效）
  if (savedLang && savedLang !== appStore.language) {
    await loadLanguageAsync(savedLang);
  }

  // 应用 URL 中的主题（如果有效）
  if (
    savedTheme &&
    getTheme(savedTheme) &&
    savedTheme !== currentThemeName.value
  ) {
    setTheme(savedTheme);
  }

  // 始终调用 initTheme 确保主题 CSS 变量被应用
  // 即使主题名没变（如刷新时 localStorage 已正确），也需要重新应用 CSS 变量
  initTheme();
}

/**
 * 启动 watcher，设置变更时自动同步到 URL
 * 同时在路由 afterEach 中保持参数不丢失
 */
export function watchUrlSettings(): void {
  const appStore = useAppStoreHook();
  const { currentThemeName } = useTheme();

  // 初始同步：确保当前设置写入 URL
  setUrlParams({
    [URL_PARAM_LANG]: appStore.language,
    [URL_PARAM_THEME]: currentThemeName.value,
  });

  // 监听语言变化
  watch(
    () => appStore.language,
    (lang) => {
      setUrlParams({ [URL_PARAM_LANG]: lang });
    }
  );

  // 监听主题变化
  watch(currentThemeName, (theme) => {
    setUrlParams({ [URL_PARAM_THEME]: theme });
  });
}

/**
 * 安装路由守卫，确保路由切换后 URL 参数不丢失
 * 在 router 实例上注册 afterEach
 */
export function installRouterGuard(router: {
  afterEach: (guard: () => void) => void;
}): void {
  const appStore = useAppStoreHook();
  const { currentThemeName } = useTheme();

  router.afterEach(() => {
    // 路由切换后，检查 URL 是否还有我们的参数，没有就补回去
    const params = new URLSearchParams(window.location.search);
    const needsUpdate =
      params.get(URL_PARAM_LANG) !== appStore.language ||
      params.get(URL_PARAM_THEME) !== currentThemeName.value;

    if (needsUpdate) {
      setUrlParams({
        [URL_PARAM_LANG]: appStore.language,
        [URL_PARAM_THEME]: currentThemeName.value,
      });
    }
  });
}
