import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: vi.fn(() => "uuid-xyz") }));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) =>
    url.startsWith("http://") ? url.replace("http://", "https://") : url
  ),
}));

describe("api/v1/resources/index", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/resources/index");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/resources/index");
  });

  it("getResources includes type/sort/expand", async () => {
    await api.getResources("voxel", "-created_at", "", 0, "image,author");
    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("get");
    expect(cfg.url).toContain("/v1/resources?");
    expect(cfg.url).toContain("type=voxel");
    expect(cfg.url).toContain("sort=-created_at");
    expect(cfg.url).toContain("expand=image%2Cauthor");
  });

  it("getResources includes search and page conditions", async () => {
    await api.getResources("picture", "-created_at", "cat", 2);
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("ResourceSearch%5Bname%5D=cat");
    expect(url).toContain("page=2");
  });

  it("typed list getters call proper type", async () => {
    await api.getVoxels();
    expect(request.mock.calls[0][0].url).toContain("type=voxel");
    await api.getPolygens();
    expect(request.mock.calls[1][0].url).toContain("type=polygen");
    await api.getPictures();
    expect(request.mock.calls[2][0].url).toContain("type=picture");
  });

  it("post helpers inject type and uuid", async () => {
    await api.postVideo({ name: "clip" });
    const payload = request.mock.calls[0][0].data;
    expect(payload.type).toBe("video");
    expect(payload.uuid).toBe("uuid-xyz");
  });

  it("put helper targets /v1/resources/:id", async () => {
    const data = { name: "updated" };
    await api.putAudio(12, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/resources/12",
      method: "put",
      data,
    });
  });

  it("delete helper targets /v1/resources/:id", async () => {
    await api.deleteParticle("p9");
    expect(request).toHaveBeenCalledWith({
      url: "/v1/resources/p9",
      method: "delete",
    });
  });

  it("getPolygen rewrites file url to https", async () => {
    request.mockResolvedValue({ data: { file: { url: "http://cdn/a.glb" } } });
    const result = (await api.getPolygen(1)) as any;
    expect(result.data.file.url).toBe("https://cdn/a.glb");
  });

  it("getPicture keeps url when file missing", async () => {
    request.mockResolvedValue({ data: { id: 1 } });
    const result = (await api.getPicture(1)) as any;
    expect(result.data).toEqual({ id: 1 });
  });

  it("getAudio passes type and custom expand", async () => {
    await api.getAudio(88, "file,author");
    const cfg = request.mock.calls[0][0];
    expect(cfg.url).toContain("/v1/resources/88?");
    expect(cfg.url).toContain("type=audio");
    expect(cfg.url).toContain("expand=file%2Cauthor");
  });

  it("resource getter propagates request rejection", async () => {
    request.mockRejectedValue(new Error("network"));
    await expect(api.getVoxel(9)).rejects.toThrow("network");
  });
});
