import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/meta", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/meta");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/meta");
  });

  it("postMeta posts to /v1/metas", async () => {
    const data = { title: "m" } as any;
    await api.postMeta(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/metas", method: "post", data });
  });

  it("putMetaCode puts to code endpoint", async () => {
    await api.putMetaCode(8, { code: "{}" } as any);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/metas/8/code",
      data: { code: "{}" },
      method: "put",
    });
  });

  it("putMetaCode accepts null", async () => {
    await api.putMetaCode("x", null);
    expect(request.mock.calls[0][0].url).toBe("/v1/metas/x/code");
    expect(request.mock.calls[0][0].data).toBeNull();
  });

  it("getMeta appends query params", async () => {
    await api.getMeta(3, { expand: "author,image" });
    expect(request.mock.calls[0][0]).toEqual({
      url: expect.stringContaining("/v1/metas/3?expand=author%2Cimage"),
      method: "get",
    });
  });

  it("getMetas converts sort name to title", async () => {
    await api.getMetas("name");
    expect(request.mock.calls[0][0].url).toContain("sort=title");
  });

  it("getMetas converts sort -name to -title", async () => {
    await api.getMetas("-name");
    expect(request.mock.calls[0][0].url).toContain("sort=-title");
  });

  it("getMetas includes fields/search/page when provided", async () => {
    await api.getMetas("-created_at", "keyword", 2, "image", "id,title");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("fields=id%2Ctitle");
    expect(url).toContain("MetaSearch%5Btitle%5D=keyword");
    expect(url).toContain("page=2");
    expect(url).toContain("expand=image");
  });

  it("putMeta sends PUT payload", async () => {
    const data = { data: "{}" } as any;
    await api.putMeta(11, data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/metas/11", method: "put", data });
  });

  it("deleteMeta sends DELETE", async () => {
    await api.deleteMeta("abc");
    expect(request).toHaveBeenCalledWith({ url: "/v1/metas/abc", method: "delete" });
  });
});
