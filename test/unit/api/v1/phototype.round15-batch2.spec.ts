import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/phototype", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/phototype");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/phototype");
  });

  it("postPhototype posts data", async () => {
    const data = { title: "p" } as any;
    await api.postPhototype(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/phototypes", method: "post", data });
  });

  it("getPhototype includes default expand", async () => {
    await api.getPhototype(5);
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/phototypes/5?");
    expect(url).toContain("expand=resource%2Cimage");
  });

  it("getPhototype omits expand when empty", async () => {
    await api.getPhototype(5, "");
    expect(request.mock.calls[0][0].url).toBe("/v1/phototypes/5");
  });

  it("getPhototypes includes search/page", async () => {
    await api.getPhototypes("-created_at", "stone", 4, "image");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("PhototypeSearch%5Btitle%5D=stone");
    expect(url).toContain("page=4");
    expect(url).toContain("expand=image");
  });

  it("getPhototypes omits search/page when empty and <=1", async () => {
    await api.getPhototypes("-created_at", "", 1);
    const url = request.mock.calls[0][0].url;
    expect(url).not.toContain("PhototypeSearch");
    expect(url).not.toContain("page=");
  });

  it("putPhototype uses id and expand", async () => {
    const data = { title: "new" } as any;
    await api.putPhototype("x", data, "resource");
    expect(request).toHaveBeenCalledWith({
      url: "/v1/phototypes/x?expand=resource",
      method: "put",
      data,
    });
  });

  it("putPhototype omits expand when empty", async () => {
    await api.putPhototype(9, { title: "t" } as any, "");
    expect(request.mock.calls[0][0].url).toBe("/v1/phototypes/9");
  });

  it("deletePhototype sends delete", async () => {
    await api.deletePhototype("p1");
    expect(request).toHaveBeenCalledWith({ url: "/v1/phototypes/p1", method: "delete" });
  });
});
