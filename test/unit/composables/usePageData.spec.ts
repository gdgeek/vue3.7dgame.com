import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { usePageData } from "@/composables/usePageData";
import type { FetchParams, FetchResponse } from "@/types/api";

// usePageData 内部使用 onMounted，需要 Vue 组件上下文才能触发
// 此辅助函数将 composable 挂载到临时组件中
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  return { result, unmount: () => app.unmount() };
}

// 创建符合 FetchResponse 接口的 mock 响应
function makeFetchResponse<T>(
  data: T[],
  headers: Record<string, string> = {}
): FetchResponse<T> {
  return {
    data,
    headers: {
      "x-pagination-current-page": "1",
      "x-pagination-page-count": "1",
      "x-pagination-per-page": "20",
      "x-pagination-total-count": "0",
      ...headers,
    },
  };
}

type Item = { id: number; name: string };

describe("usePageData composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初始状态", () => {
    it("应设置正确的默认值", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData({ fetchFn, immediate: false })
      );

      expect(result.items.value).toBeNull();
      expect(result.loading.value).toBe(false);
      expect(result.sorted.value).toBe("-created_at");
      expect(result.searched.value).toBe("");
      expect(result.tags.value).toEqual([]);
      expect(result.viewMode.value).toBe("grid");
      expect(result.pagination.current).toBe(1);
      expect(result.pagination.count).toBe(1);
      expect(result.pagination.total).toBe(0);
      unmount();
    });

    it("支持自定义 defaultSort", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData({ fetchFn, defaultSort: "created_at", immediate: false })
      );

      expect(result.sorted.value).toBe("created_at");
      unmount();
    });

    it("支持自定义 pageSize", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData({ fetchFn, pageSize: 50, immediate: false })
      );

      expect(result.pagination.size).toBe(50);
      unmount();
    });
  });

  describe("refresh() 数据加载", () => {
    it("加载成功后设置 items 和更新分页信息", async () => {
      const items: Item[] = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ];
      const fetchFn = vi.fn().mockResolvedValue(
        makeFetchResponse(items, {
          "x-pagination-current-page": "2",
          "x-pagination-page-count": "5",
          "x-pagination-per-page": "10",
          "x-pagination-total-count": "42",
        })
      );

      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      await result.refresh();

      expect(result.items.value).toEqual(items);
      expect(result.pagination.current).toBe(2);
      expect(result.pagination.count).toBe(5);
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.total).toBe(42);
      expect(result.loading.value).toBe(false);
      unmount();
    });

    it("加载过程中 loading 为 true", async () => {
      let resolve!: (v: FetchResponse<Item>) => void;
      const fetchFn = vi.fn(
        () => new Promise<FetchResponse<Item>>((r) => (resolve = r))
      );

      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      const refreshPromise = result.refresh();
      expect(result.loading.value).toBe(true);

      resolve(makeFetchResponse<Item>([]));
      await refreshPromise;
      expect(result.loading.value).toBe(false);
      unmount();
    });

    it("加载失败时 items 设为空数组，loading 设为 false", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      await result.refresh();

      expect(result.items.value).toEqual([]);
      expect(result.loading.value).toBe(false);
      consoleSpy.mockRestore();
      unmount();
    });

    it("携带正确的参数调用 fetchFn", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));

      const { result, unmount } = withSetup(() =>
        usePageData<Item>({
          fetchFn,
          defaultSort: "name",
          immediate: false,
        })
      );

      await result.refresh();

      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining<Partial<FetchParams>>({
          sort: "name",
          search: "",
          page: 1,
        })
      );
      unmount();
    });

    it("有 tags 时将 tags 加入请求参数", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.tags.value = [1, 2, 3];
      await result.refresh();

      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [1, 2, 3] })
      );
      unmount();
    });

    it("无 tags 时不在参数中传递 tags 字段", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      await result.refresh();

      const calledParams = fetchFn.mock.calls[0][0] as FetchParams;
      expect(calledParams.tags).toBeUndefined();
      unmount();
    });
  });

  describe("totalPages 计算属性", () => {
    it("应等于 pagination.count", async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        makeFetchResponse<Item>([], {
          "x-pagination-page-count": "7",
        })
      );
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      await result.refresh();
      expect(result.totalPages.value).toBe(7);
      unmount();
    });

    it("count 为 0 时 totalPages 返回 1", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.pagination.count = 0;
      expect(result.totalPages.value).toBe(1);
      unmount();
    });
  });

  describe("handleSearch()", () => {
    it("更新 searched 并重置页码为 1，然后触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.pagination.current = 3;
      result.handleSearch("hello");
      await nextTick();

      expect(result.searched.value).toBe("hello");
      expect(result.pagination.current).toBe(1);
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({ search: "hello", page: 1 })
      );
      unmount();
    });
  });

  describe("handleSortChange()", () => {
    it("更新 sorted 并触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.handleSortChange("name");
      await nextTick();

      expect(result.sorted.value).toBe("name");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "name" })
      );
      unmount();
    });
  });

  describe("handlePageChange()", () => {
    it("更新当前页码并触发 refresh", async () => {
      // 让 mock 响应携带 page=4，避免 refresh 完成后将 current 覆盖回 1
      const fetchFn = vi
        .fn()
        .mockResolvedValue(
          makeFetchResponse<Item>([], { "x-pagination-current-page": "4" })
        );
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.handlePageChange(4);
      await nextTick();

      expect(result.pagination.current).toBe(4);
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({ page: 4 })
      );
      unmount();
    });
  });

  describe("handleViewChange()", () => {
    it("切换视图模式为 list", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      expect(result.viewMode.value).toBe("grid");
      result.handleViewChange("list");
      expect(result.viewMode.value).toBe("list");
      unmount();
    });

    it("切换视图模式为 grid", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.handleViewChange("list");
      result.handleViewChange("grid");
      expect(result.viewMode.value).toBe("grid");
      unmount();
    });

    it("切换视图模式不触发 refresh", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.handleViewChange("list");
      expect(fetchFn).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe("handleTagsChange()", () => {
    it("更新 tags，重置页码为 1，触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      result.pagination.current = 5;
      result.handleTagsChange([10, 20]);
      await nextTick();

      expect(result.tags.value).toEqual([10, 20]);
      expect(result.pagination.current).toBe(1);
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [10, 20], page: 1 })
      );
      unmount();
    });
  });

  describe("immediate 选项", () => {
    it("immediate: true 时挂载后自动调用 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      withSetup(() => usePageData<Item>({ fetchFn, immediate: true }));

      await nextTick();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("immediate: false 时挂载后不自动调用 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeFetchResponse<Item>([]));
      withSetup(() => usePageData<Item>({ fetchFn, immediate: false }));

      await nextTick();
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe("分页响应头缺失时的降级行为", () => {
    it("分页响应头缺失时使用默认值", async () => {
      const fetchFn = vi.fn().mockResolvedValue({
        data: [],
        headers: {}, // 无分页头
      } as FetchResponse<Item>);

      const { result, unmount } = withSetup(() =>
        usePageData<Item>({ fetchFn, immediate: false })
      );

      await result.refresh();

      expect(result.pagination.current).toBe(1);
      expect(result.pagination.count).toBe(1);
      expect(result.pagination.total).toBe(0);
      unmount();
    });
  });
});
