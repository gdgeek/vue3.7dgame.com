import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGetMetas = vi.fn();
vi.mock("@/api/v1/meta", () => ({
  getMetas: (...args: unknown[]) => mockGetMetas(...args),
}));

vi.mock("@/composables/usePageData", () => ({
  usePageData: (options: { fetchFn: (...args: unknown[]) => unknown }) => ({
    items: { value: [] },
    loading: { value: false },
    pagination: { current: 1, count: 1, size: 20, total: 0 },
    viewMode: { value: "grid" },
    totalPages: { value: 1 },
    refresh: vi.fn(),
    handleSearch: vi.fn(),
    handleSortChange: vi.fn(),
    handlePageChange: vi.fn(),
    handleViewChange: vi.fn(),
    _fetchFn: options.fetchFn,
  }),
}));

describe("useMetaList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getResourceCount", () => {
    it("returns 0 for undefined item", async () => {
      const { getResourceCount } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      expect(getResourceCount(undefined)).toBe(0);
    });

    it("returns 0 when resources is not an array", async () => {
      const { getResourceCount } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      expect(getResourceCount({ resources: null })).toBe(0);
      expect(getResourceCount({ resources: "string" })).toBe(0);
    });

    it("returns correct count for array resources", async () => {
      const { getResourceCount } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      expect(getResourceCount({ resources: [1, 2, 3] })).toBe(3);
      expect(getResourceCount({ resources: [] })).toBe(0);
    });
  });

  describe("logMetaStructure", () => {
    it("logs info for non-object payload", async () => {
      const { logMetaStructure } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      const { logger } = await import("@/utils/logger");
      logMetaStructure("list", null);
      expect(logger.info).toHaveBeenCalledWith(
        "[MetaStructure]",
        expect.objectContaining({ scope: "list", payloadType: "object" })
      );
    });

    it("logs list structure with count and keys", async () => {
      const { logMetaStructure } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      const { logger } = await import("@/utils/logger");
      const items = [{ id: 1, title: "test", author: null, image: null }];
      logMetaStructure("list", items);
      expect(logger.info).toHaveBeenCalledWith(
        "[MetaStructure]",
        expect.objectContaining({ scope: "list", count: 1 })
      );
    });

    it("logs detail structure with shape", async () => {
      const { logMetaStructure } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      const { logger } = await import("@/utils/logger");
      const detail = { id: 1, title: "test" };
      logMetaStructure("detail", detail);
      expect(logger.info).toHaveBeenCalledWith(
        "[MetaStructure]",
        expect.objectContaining({
          scope: "detail",
          shape: expect.objectContaining({ idType: "number" }),
        })
      );
    });
  });

  describe("useMetaList", () => {
    it("returns page data and getResourceCount", async () => {
      const { useMetaList } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      const result = useMetaList();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("loading");
      expect(result).toHaveProperty("refresh");
      expect(result).toHaveProperty("getResourceCount");
      expect(typeof result.getResourceCount).toBe("function");
    });

    it("calls getMetas with expand including resources", async () => {
      mockGetMetas.mockResolvedValue({
        data: [],
        headers: {},
      });

      const { useMetaList } = await import(
        "@/views/meta/list/composables/useMetaList"
      );
      const result = useMetaList();

      // Access the internal fetchFn through the mocked usePageData
      const fetchFn = (
        result as unknown as { _fetchFn: (...args: unknown[]) => unknown }
      )._fetchFn;
      if (fetchFn) {
        await fetchFn({ sort: "-created_at", search: "", page: 1 });
        expect(mockGetMetas).toHaveBeenCalledWith(
          "-created_at",
          "",
          1,
          "image,author,resources"
        );
      }
    });
  });
});
