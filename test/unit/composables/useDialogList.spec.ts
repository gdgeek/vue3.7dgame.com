import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import {
  useDialogList,
  parsePaginationHeaders,
} from "@/composables/useDialogList";

// useDialogList 不依赖 Vue 组件生命周期，直接调用即可
// （与 usePageData 不同，它不使用 onMounted）
function setupDialogList<T>(
  fetchFn: (
    sorted: string,
    searched: string,
    page: number
  ) => Promise<{ data: T[]; headers?: Record<string, unknown> }>
) {
  return useDialogList<T>(fetchFn);
}

type Item = { id: number; name: string };

// 辅助：构建带分页头的 mock 响应
function makeResponse<T>(
  data: T[],
  headers: Record<string, string> = {}
): { data: T[]; headers: Record<string, unknown> } {
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

// 辅助：构建不含分页头的 mock 响应（模拟 VerseDialog）
function makeResponseNoHeaders<T>(data: T[]): { data: T[] } {
  return { data };
}

// ============================================================
// parsePaginationHeaders（纯函数，无需组件上下文）
// ============================================================
describe("parsePaginationHeaders", () => {
  it("正确解析四个分页响应头", () => {
    const result = parsePaginationHeaders({
      "x-pagination-current-page": "3",
      "x-pagination-page-count": "10",
      "x-pagination-per-page": "15",
      "x-pagination-total-count": "142",
    });

    expect(result.current).toBe(3);
    expect(result.count).toBe(10);
    expect(result.size).toBe(15);
    expect(result.total).toBe(142);
  });

  it("缺少响应头时使用默认值", () => {
    const result = parsePaginationHeaders({});

    expect(result.current).toBe(1);
    expect(result.count).toBe(1);
    expect(result.size).toBe(20);
    expect(result.total).toBe(0);
  });

  it("响应头值为字符串数字时能正确 parseInt", () => {
    const result = parsePaginationHeaders({
      "x-pagination-current-page": "007",
      "x-pagination-page-count": "100",
    });
    expect(result.current).toBe(7);
    expect(result.count).toBe(100);
  });

  it("仅部分响应头存在时，缺失的使用默认值", () => {
    const result = parsePaginationHeaders({
      "x-pagination-current-page": "2",
    });

    expect(result.current).toBe(2);
    expect(result.count).toBe(1); // default
    expect(result.size).toBe(20); // default
    expect(result.total).toBe(0); // default
  });
});

// ============================================================
// useDialogList composable
// ============================================================
describe("useDialogList composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------
  describe("初始状态", () => {
    it("dialogVisible 默认为 false", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { dialogVisible } = setupDialogList<Item>(fetchFn);
      expect(dialogVisible.value).toBe(false);
    });

    it("active 具有正确的默认值", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { active } = setupDialogList<Item>(fetchFn);

      expect(active.value.items).toEqual([]);
      expect(active.value.sorted).toBe("-created_at");
      expect(active.value.searched).toBe("");
      expect(active.value.pagination.current).toBe(1);
      expect(active.value.pagination.count).toBe(1);
      expect(active.value.pagination.size).toBe(20);
      expect(active.value.pagination.total).toBe(20);
    });
  });

  // ----------------------------------------------------------
  // refresh()
  // ----------------------------------------------------------
  describe("refresh()", () => {
    it("调用 fetchFn 时传入当前 sorted/searched/page", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { refresh, active } = setupDialogList<Item>(fetchFn);

      active.value.sorted = "name";
      active.value.searched = "hello";
      active.value.pagination.current = 3;

      await refresh();

      expect(fetchFn).toHaveBeenCalledWith("name", "hello", 3);
    });

    it("加载完成后 items 更新为响应数据", async () => {
      const items: Item[] = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ];
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(items));
      const { refresh, active } = setupDialogList<Item>(fetchFn);

      await refresh();

      expect(active.value.items).toEqual(items);
    });

    it("响应头包含分页信息时更新 pagination", async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        makeResponse<Item>([], {
          "x-pagination-current-page": "2",
          "x-pagination-page-count": "8",
          "x-pagination-per-page": "10",
          "x-pagination-total-count": "75",
        })
      );
      const { refresh, active } = setupDialogList<Item>(fetchFn);

      await refresh();

      expect(active.value.pagination.current).toBe(2);
      expect(active.value.pagination.count).toBe(8);
      expect(active.value.pagination.size).toBe(10);
      expect(active.value.pagination.total).toBe(75);
    });

    it("响应头不含分页信息时 pagination 保持原值不变", async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(makeResponseNoHeaders<Item>([]));
      const { refresh, active } = setupDialogList<Item>(fetchFn);

      // 设置非默认值，验证不被覆盖
      active.value.pagination.current = 5;
      active.value.pagination.count = 10;

      await refresh();

      expect(active.value.pagination.current).toBe(5);
      expect(active.value.pagination.count).toBe(10);
    });
  });

  // ----------------------------------------------------------
  // resetState()
  // ----------------------------------------------------------
  describe("resetState()", () => {
    it("将 active 恢复为初始默认状态", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { resetState, active } = setupDialogList<Item>(fetchFn);

      // 修改状态
      active.value.sorted = "name";
      active.value.searched = "test";
      active.value.items = [{ id: 1, name: "X" }];
      active.value.pagination.current = 5;

      resetState();

      expect(active.value.sorted).toBe("-created_at");
      expect(active.value.searched).toBe("");
      expect(active.value.items).toEqual([]);
      expect(active.value.pagination.current).toBe(1);
    });

    it("resetState 不调用 fetchFn", () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { resetState } = setupDialogList<Item>(fetchFn);

      resetState();
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // openDialog()
  // ----------------------------------------------------------
  describe("openDialog()", () => {
    it("调用后将 dialogVisible 设为 true", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { openDialog, dialogVisible } = setupDialogList<Item>(fetchFn);

      await openDialog();

      expect(dialogVisible.value).toBe(true);
    });

    it("调用后先重置状态，再调用 fetchFn", async () => {
      const items: Item[] = [{ id: 99, name: "fresh" }];
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(items));
      const { openDialog, active } = setupDialogList<Item>(fetchFn);

      // 先设置脏状态
      active.value.sorted = "old";
      active.value.searched = "dirty";

      await openDialog();

      // 验证 fetchFn 被调用时已使用重置后的默认值
      expect(fetchFn).toHaveBeenCalledWith("-created_at", "", 1);
      expect(active.value.items).toEqual(items);
    });

    it("openDialog 前后 dialogVisible 从 false 变为 true", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { openDialog, dialogVisible } = setupDialogList<Item>(fetchFn);

      expect(dialogVisible.value).toBe(false);
      await openDialog();
      expect(dialogVisible.value).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // sort()
  // ----------------------------------------------------------
  describe("sort()", () => {
    it("更新 sorted 并触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { sort, active } = setupDialogList<Item>(fetchFn);

      sort("name");
      await nextTick();

      expect(active.value.sorted).toBe("name");
      expect(fetchFn).toHaveBeenCalledWith("name", "", 1);
    });

    it("sort 支持带符号的排序字符串（如 -created_at）", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { sort, active } = setupDialogList<Item>(fetchFn);

      sort("-updated_at");
      await nextTick();

      expect(active.value.sorted).toBe("-updated_at");
    });
  });

  // ----------------------------------------------------------
  // search()
  // ----------------------------------------------------------
  describe("search()", () => {
    it("更新 searched 并触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { search, active } = setupDialogList<Item>(fetchFn);

      search("keyword");
      await nextTick();

      expect(active.value.searched).toBe("keyword");
      expect(fetchFn).toHaveBeenCalledWith("-created_at", "keyword", 1);
    });
  });

  // ----------------------------------------------------------
  // clearSearched()
  // ----------------------------------------------------------
  describe("clearSearched()", () => {
    it("将 searched 清空并触发 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { search, clearSearched, active } = setupDialogList<Item>(fetchFn);

      search("some keyword");
      await nextTick();
      expect(active.value.searched).toBe("some keyword");

      clearSearched();
      await nextTick();

      expect(active.value.searched).toBe("");
      // 最后一次调用使用空字符串
      expect(fetchFn).toHaveBeenLastCalledWith("-created_at", "", 1);
    });
  });

  // ----------------------------------------------------------
  // handleCurrentChange()
  // ----------------------------------------------------------
  describe("handleCurrentChange()", () => {
    it("更新当前页码并触发 refresh", async () => {
      // 让 mock 响应携带 page=4，避免 refresh 完成后将 current 覆盖回 1
      const fetchFn = vi
        .fn()
        .mockResolvedValue(
          makeResponse<Item>([], { "x-pagination-current-page": "4" })
        );
      const { handleCurrentChange, active } = setupDialogList<Item>(fetchFn);

      handleCurrentChange(4);
      await nextTick();

      expect(active.value.pagination.current).toBe(4);
      expect(fetchFn).toHaveBeenCalledWith("-created_at", "", 4);
    });

    it("翻到第一页时 page 传入 1", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { handleCurrentChange } = setupDialogList<Item>(fetchFn);

      handleCurrentChange(1);
      await nextTick();

      expect(fetchFn).toHaveBeenCalledWith("-created_at", "", 1);
    });
  });

  // ----------------------------------------------------------
  // 组合场景
  // ----------------------------------------------------------
  describe("组合场景", () => {
    it("搜索后翻页，page 使用新 searched 参数", async () => {
      // 第一次调用（search）→ 返回 page=1；第二次调用（handleCurrentChange）→ 返回 page=3
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(
          makeResponse<Item>([], { "x-pagination-current-page": "1" })
        )
        .mockResolvedValueOnce(
          makeResponse<Item>([], { "x-pagination-current-page": "3" })
        );
      const { search, handleCurrentChange, active } =
        setupDialogList<Item>(fetchFn);

      search("vue");
      await nextTick();

      handleCurrentChange(3);
      await nextTick();

      expect(active.value.searched).toBe("vue");
      expect(active.value.pagination.current).toBe(3);
      expect(fetchFn).toHaveBeenLastCalledWith("-created_at", "vue", 3);
    });

    it("openDialog 后再 sort 使用新排序调 refresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { openDialog, sort } = setupDialogList<Item>(fetchFn);

      await openDialog();
      sort("title");
      await nextTick();

      expect(fetchFn).toHaveBeenLastCalledWith("title", "", 1);
    });

    it("多次 openDialog 每次都重置状态", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse<Item>([]));
      const { openDialog, sort, active } = setupDialogList<Item>(fetchFn);

      await openDialog();
      sort("name");
      await nextTick();
      expect(active.value.sorted).toBe("name");

      // 再次 open 应重置
      await openDialog();
      expect(active.value.sorted).toBe("-created_at");
    });
  });
});
