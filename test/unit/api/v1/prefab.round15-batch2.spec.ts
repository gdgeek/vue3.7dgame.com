import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/prefab", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/prefab");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/prefab");
  });

  it("deletePrefab sends delete", async () => {
    await api.deletePrefab(1);
    expect(request).toHaveBeenCalledWith({ url: "/v1/prefabs/1", method: "delete" });
  });

  it("postPrefab posts payload", async () => {
    const data = { title: "a" } as any;
    await api.postPrefab(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/prefabs", method: "post", data });
  });

  it("getPrefab includes expand query", async () => {
    await api.getPrefab(2, "image");
    expect(request).toHaveBeenCalledWith({
      url: "/v1/prefabs/2?expand=image",
      method: "get",
    });
  });

  it("getPrefabs remaps name sort to title", async () => {
    await api.getPrefabs("name");
    expect(request.mock.calls[0][0].url).toContain("sort=title");
  });

  it("getPrefabs remaps -name sort to -title", async () => {
    await api.getPrefabs("-name");
    expect(request.mock.calls[0][0].url).toContain("sort=-title");
  });

  it("getPrefabs includes search and page", async () => {
    await api.getPrefabs("-created_at", "abc", 3, "author");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("MetaSearch%5Btitle%5D=abc");
    expect(url).toContain("page=3");
    expect(url).toContain("expand=author");
  });

  it("getPrefabs omits search/page when empty and <=1", async () => {
    await api.getPrefabs("-created_at", "", 1);
    const url = request.mock.calls[0][0].url;
    expect(url).not.toContain("MetaSearch");
    expect(url).not.toContain("page=");
  });

  it("putPrefab sends put payload", async () => {
    const data = { data: "{}" } as any;
    await api.putPrefab(8, data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/prefabs/8", method: "put", data });
  });
});
