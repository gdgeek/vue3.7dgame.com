import { ref } from "vue";
import { wordpressApi } from "@/api/home/wordpress";
import type { Ref } from "vue";
import type { NewsCategory, TabItem } from "@/types/news";

export interface UseCategoriesOptions {
  includeCategories?: (number | string)[];
  excludeCategories?: (number | string)[];
  pinnedItems?: TabItem[];
}

export interface UseCategoriesReturn {
  items: Ref<TabItem[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  retry: () => Promise<void>;
}

/**
 * 将 NewsCategory 映射为 TabItem
 */
export function mapCategoryToTabItem(category: NewsCategory): TabItem {
  return {
    label: category.name,
    type: "category",
    id: category.id,
  };
}

/**
 * 过滤分类列表：
 * 1. 过滤 count === 0 的空分类
 * 2. 白名单优先于黑名单（按 id 或 slug 匹配）
 */
export function filterCategories(
  categories: NewsCategory[],
  options?: Pick<
    UseCategoriesOptions,
    "includeCategories" | "excludeCategories"
  >
): NewsCategory[] {
  // 1. Filter out empty categories (count === 0)
  let result = categories.filter((c) => (c.count ?? 1) > 0);

  // 2. Apply whitelist (takes priority over blacklist)
  if (options?.includeCategories?.length) {
    result = result.filter((c) =>
      options.includeCategories!.some(
        (item) => item === c.id || item === c.slug
      )
    );
    return result;
  }

  // 3. Apply blacklist
  if (options?.excludeCategories?.length) {
    result = result.filter(
      (c) =>
        !options.excludeCategories!.some(
          (item) => item === c.id || item === c.slug
        )
    );
  }

  return result;
}

/**
 * 组合式函数：动态获取 WordPress 分类并转换为 TabItem 列表
 * 支持 stale-while-revalidate 缓存策略、白名单/黑名单过滤、pinnedItems 置顶
 */
export function useCategories(
  options?: UseCategoriesOptions
): UseCategoriesReturn {
  const items = ref<TabItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const processCategories = (categories: NewsCategory[]): TabItem[] => {
    const filtered = filterCategories(categories, options);
    const mapped = filtered.map(mapCategoryToTabItem);
    const pinned = options?.pinnedItems ?? [];
    return [...pinned, ...mapped];
  };

  const load = async () => {
    loading.value = true;
    error.value = null;

    try {
      const { data, isStale } = await wordpressApi.getCategoriesWithCache();
      items.value = processCategories(data);

      // stale-while-revalidate: 后台静默刷新
      if (isStale) {
        wordpressApi
          .getCategories()
          .then((freshData) => {
            items.value = processCategories(freshData);
          })
          .catch(() => {
            // 后台刷新失败时静默忽略，保留缓存数据
          });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载分类失败";
    } finally {
      loading.value = false;
    }
  };

  const retry = async () => {
    await load();
  };

  // 立即加载
  load();

  return { items, loading, error, retry };
}
