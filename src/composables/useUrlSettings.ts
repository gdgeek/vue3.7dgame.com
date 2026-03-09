/**
 * URL 参数持久化 composable
 * 将 lang 和 theme 同步到 URL query 参数，刷新不丢失
 *
 * URL 参数优先级高于 localStorage，适用于分享链接场景
 * 示例: ?lang=en-US&theme=cyber-dark
 *
 * 当域名通过 domain hub 锁定了语言或样式时，对应的 URL 参数不生效
 */
import { watch } from "vue";
import { useAppStoreHook } from "@/store/modules/app";
import { useDomainStoreHook } from "@/store/modules/domain";
import { loadLanguageAsync } from "@/lang";
import { useTheme } from "@/composables/useTheme";
import { getTheme } from "@/styles/themes";

const URL_PARAM_LANG = "lang";
const URL_PARAM_THEME = "theme";

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
 * 注意：此时 domain info 可能尚未加载，所以先应用 URL 参数。
 * domain fetchDefaultInfo 之后会强制覆盖被锁定的设置。
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
  initTheme();
}

/**
 * 启动 watcher，设置变更时自动同步到 URL
 * 被 domain 锁定的参数不写入 URL
 */
export function watchUrlSettings(): void {
  const appStore = useAppStoreHook();
  const domainStore = useDomainStoreHook();
  const { currentThemeName } = useTheme();

  // 初始同步：仅写入未被锁定的参数
  syncToUrl(appStore, domainStore, currentThemeName.value);

  // 监听语言变化
  watch(
    () => appStore.language,
    () => syncToUrl(appStore, domainStore, currentThemeName.value)
  );

  // 监听主题变化
  watch(currentThemeName, (theme) => syncToUrl(appStore, domainStore, theme));

  // 监听 domain 锁定状态变化（domain info 异步加载完成后触发）
  // 锁定后移除对应的 URL 参数
  watch(
    () => domainStore.isLanguageLocked,
    (locked) => {
      if (locked) {
        setUrlParams({ [URL_PARAM_LANG]: null });
      }
    }
  );

  watch(
    () => domainStore.isStyleLocked,
    (locked) => {
      if (locked) {
        setUrlParams({ [URL_PARAM_THEME]: null });
      }
    }
  );
}

/**
 * 同步当前设置到 URL，跳过被锁定的参数
 */
function syncToUrl(
  appStore: ReturnType<typeof useAppStoreHook>,
  domainStore: ReturnType<typeof useDomainStoreHook>,
  theme: string
) {
  const updates: Record<string, string | null> = {};

  if (domainStore.isLanguageLocked) {
    // 锁定时移除 URL 参数
    updates[URL_PARAM_LANG] = null;
  } else {
    updates[URL_PARAM_LANG] = appStore.language;
  }

  if (domainStore.isStyleLocked) {
    updates[URL_PARAM_THEME] = null;
  } else {
    updates[URL_PARAM_THEME] = theme;
  }

  setUrlParams(updates);
}

/**
 * 安装路由守卫，确保路由切换后 URL 参数不丢失
 */
export function installRouterGuard(router: {
  afterEach: (guard: () => void) => void;
}): void {
  const appStore = useAppStoreHook();
  const domainStore = useDomainStoreHook();
  const { currentThemeName } = useTheme();

  router.afterEach(() => {
    syncToUrl(appStore, domainStore, currentThemeName.value);
  });
}
