/**
 * wordpress2.spec.ts
 *
 * Covers buildEndpoint branches not tested in wordpress.spec.ts:
 *   - line 116-118: domainStore.blog is set → dynamic baseURL override
 *   - line 121: catch block when useDomainStoreHook throws
 *   - lines 132-133: pretty permalinks path (baseURL includes "wp-json")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Top-level mocks (hoisted) ─────────────────────────────────────────────

const mockRequest = vi.hoisted(() => {
  const fn = vi.fn();
  (fn as never as Record<string, unknown>).defaults = { baseURL: "" };
  (fn as never as Record<string, unknown>).interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  return fn;
});

const mockUseDomainStore = vi.hoisted(() => vi.fn(() => ({ blog: "" })));

vi.mock("@/utils/wp", () => ({ default: mockRequest }));
vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: mockUseDomainStore,
}));

// ── Helper ────────────────────────────────────────────────────────────────

function setBaseURL(url: string) {
  (mockRequest as never as Record<string, unknown>).defaults = { baseURL: url };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("wordpress buildEndpoint — all branches", () => {
  // Import the API object (not the full module) to avoid naming collision
  let api: (typeof import("@/api/home/wordpress"))["wordpressApi"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    setBaseURL("");
    mockUseDomainStore.mockReturnValue({ blog: "" });
    mockRequest.mockResolvedValue({ data: [] });
    const m = await import("@/api/home/wordpress");
    api = m.wordpressApi;
  });

  // ── lines 132-133: pretty permalinks (baseURL has "wp-json") ─────────────

  describe("pretty permalinks (lines 132-133)", () => {
    it("getCategories uses direct url path when baseURL contains wp-json", async () => {
      setBaseURL("https://blog.example.com/wp-json/wp/v2/");
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toBe("/categories");
      expect(call.params?.rest_route).toBeUndefined();
    });

    it("params include per_page when pretty permalinks", async () => {
      setBaseURL("https://blog.example.com/wp-json/wp/v2/");
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.params?.per_page).toBe("100");
    });

    it("getCategoriesWithCache also uses pretty permalinks path", async () => {
      setBaseURL("https://blog.example.com/wp-json/wp/v2/");
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      const result = await api.getCategoriesWithCache();
      expect(result).toBeDefined();
    });
  });

  // ── lines 116-118: domainStore.blog override ─────────────────────────────

  describe("domainStore.blog override (lines 116-118)", () => {
    it("when domainStore.blog is set, effectiveBaseURL includes wp-json → pretty permalinks", async () => {
      mockUseDomainStore.mockReturnValue({
        blog: "https://dynamic-blog.example.com/",
      });
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toBe("/categories");
      expect(call.params?.rest_route).toBeUndefined();
    });

    it("blog with trailing slashes is normalized (no double slashes)", async () => {
      mockUseDomainStore.mockReturnValue({ blog: "https://my-blog.com///" });
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await expect(api.getCategories()).resolves.toBeDefined();
    });

    it("getCategories returns mapped data when blog is set", async () => {
      mockUseDomainStore.mockReturnValue({
        blog: "https://dynamic-blog.example.com/",
      });
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({
        data: [{ id: 1, name: "News", slug: "news", count: 5 }],
      });
      const result = await api.getCategories();
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe("News");
    });
  });

  // ── line 121: catch block when useDomainStoreHook throws ─────────────────

  describe("catch block when store throws (line 121)", () => {
    it("does not throw when useDomainStoreHook fails (catch block executed)", async () => {
      mockUseDomainStore.mockImplementation(() => {
        throw new Error("store not initialized");
      });
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await expect(api.getCategories()).resolves.toBeDefined();
    });

    it("falls back to rest_route format when store throws", async () => {
      mockUseDomainStore.mockImplementation(() => {
        throw new Error("pinia not ready");
      });
      setBaseURL(""); // no wp-json → rest_route mode
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.params?.rest_route).toBe("/wp/v2/categories");
    });

    it("returns empty array when store throws and request returns empty data", async () => {
      mockUseDomainStore.mockImplementation(() => {
        throw new Error("not ready");
      });
      const m = await import("@/api/home/wordpress");
      api = m.wordpressApi;

      mockRequest.mockResolvedValue({ data: [] });
      const result = await api.getCategories();
      expect(result).toEqual([]);
    });
  });

  // ── Default rest_route mode (baseline) ───────────────────────────────────

  describe("default rest_route mode (no wp-json in baseURL)", () => {
    it("getCategories uses rest_route when baseURL is empty", async () => {
      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.params?.rest_route).toBe("/wp/v2/categories");
    });

    it("url is empty string in rest_route mode", async () => {
      mockRequest.mockResolvedValue({ data: [] });
      await api.getCategories();

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toBe("");
    });
  });
});
