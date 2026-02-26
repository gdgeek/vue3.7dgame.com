/**
 * Unit tests for:
 *   - src/api/v1/prefab.ts  (CRUD + sort aliasing)
 *   - src/api/v1/tags.ts    (getTags with/without type)
 *   - src/api/v1/site.ts    (PostSiteAppleId)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// Prefab API
// ============================================================
describe("Prefab API", () => {
  let request: ReturnType<typeof vi.fn>;
  let prefabApi: typeof import("@/api/v1/prefab");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    prefabApi = await import("@/api/v1/prefab");
  });

  describe("postPrefab()", () => {
    it("calls POST /v1/prefabs", async () => {
      await prefabApi.postPrefab({ title: "My Prefab" } as Parameters<
        typeof prefabApi.postPrefab
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs", method: "post" })
      );
    });
  });

  describe("getPrefab()", () => {
    it("calls GET /v1/prefabs/{id}", async () => {
      await prefabApi.getPrefab(5);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/prefabs/5");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes expand query param when provided", async () => {
      await prefabApi.getPrefab(5, "image");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image");
    });
  });

  describe("getPrefabs() — sort aliasing", () => {
    it("aliases sort='name' → 'title'", async () => {
      await prefabApi.getPrefabs("name");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=title");
      expect(url).not.toContain("sort=name");
    });

    it("aliases sort='-name' → '-title'", async () => {
      await prefabApi.getPrefabs("-name");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=-title");
    });

    it("leaves other sort values unchanged", async () => {
      await prefabApi.getPrefabs("-created_at");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=-created_at");
    });

    it("omits MetaSearch when search is empty", async () => {
      await prefabApi.getPrefabs("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("MetaSearch");
    });

    it("includes MetaSearch[title] when search is provided", async () => {
      await prefabApi.getPrefabs("-created_at", "robot");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("MetaSearch");
      expect(url).toContain("robot");
    });

    it("omits page when page <= 1", async () => {
      await prefabApi.getPrefabs("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await prefabApi.getPrefabs("-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });
  });

  describe("putPrefab()", () => {
    it("calls PUT /v1/prefabs/{id}", async () => {
      await prefabApi.putPrefab(2, { title: "Updated" } as Parameters<
        typeof prefabApi.putPrefab
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs/2", method: "put" })
      );
    });
  });

  describe("deletePrefab()", () => {
    it("calls DELETE /v1/prefabs/{id}", async () => {
      await prefabApi.deletePrefab(8);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs/8", method: "delete" })
      );
    });
  });
});

// ============================================================
// Tags API
// ============================================================
describe("Tags API", () => {
  let request: ReturnType<typeof vi.fn>;
  let tagsApi: typeof import("@/api/v1/tags");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    tagsApi = await import("@/api/v1/tags");
  });

  it("calls GET /v1/tags", async () => {
    await tagsApi.getTags();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining("/v1/tags"), method: "get" })
    );
  });

  it("omits TagsSearch when type is null (default)", async () => {
    await tagsApi.getTags(null);
    const url: string = request.mock.calls[0][0].url;
    expect(url).not.toContain("TagsSearch");
  });

  it("includes TagsSearch[type] when type is provided", async () => {
    await tagsApi.getTags("scene");
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("TagsSearch");
    expect(url).toContain("scene");
  });

  it("different type values are forwarded correctly", async () => {
    await tagsApi.getTags("prefab");
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("prefab");
  });
});

// ============================================================
// Site API
// ============================================================
describe("Site API", () => {
  let request: ReturnType<typeof vi.fn>;
  let PostSiteAppleId: typeof import("@/api/v1/site").PostSiteAppleId;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    const mod = await import("@/api/v1/site");
    PostSiteAppleId = mod.PostSiteAppleId;
  });

  it("calls POST /v1/site/apple-id", async () => {
    const payload = { identityToken: "tok", authorizationCode: "code" };
    await PostSiteAppleId(payload as Parameters<typeof PostSiteAppleId>[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/site/apple-id",
        method: "post",
        data: payload,
      })
    );
  });
});
