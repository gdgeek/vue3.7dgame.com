import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/meta-resource", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/meta-resource");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/meta-resource");
  });

  it("postMetaResource sends POST payload", async () => {
    const data = { meta_id: 1, resource_id: 2, type: "model" } as any;
    await api.postMetaResource(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/meta-resources",
      method: "post",
      data,
    });
  });

  it("getMetaResources includes required query params", async () => {
    await api.getMetaResources(9, "model");
    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("get");
    expect(cfg.url).toContain("/v1/meta-resources/resources?");
    expect(cfg.url).toContain("meta_id=9");
    expect(cfg.url).toContain("type=model");
    expect(cfg.url).toContain("sort=-created_at");
  });

  it("getMetaResources includes expand", async () => {
    await api.getMetaResources(1, "model", "-created_at", "", 0, "image");
    expect(request.mock.calls[0][0].url).toContain("expand=image");
  });

  it("getMetaResources adds search when provided", async () => {
    await api.getMetaResources(1, "model", "-created_at", "robot");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("ResourceSearch%5Bname%5D=robot");
  });

  it("getMetaResources omits search when empty", async () => {
    await api.getMetaResources(1, "model", "-created_at", "");
    expect(request.mock.calls[0][0].url).not.toContain("ResourceSearch");
  });

  it("getMetaResources includes page only when > 1", async () => {
    await api.getMetaResources(1, "model", "-created_at", "", 3);
    expect(request.mock.calls[0][0].url).toContain("page=3");
  });

  it("getMetaResources omits page when <= 1", async () => {
    await api.getMetaResources(1, "model", "-created_at", "", 1);
    expect(request.mock.calls[0][0].url).not.toContain("page=");
  });

  it("putMetaResource sends PUT to id route", async () => {
    const data = { type: "model" } as any;
    await api.putMetaResource("abc", data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/meta-resources/abc",
      method: "put",
      data,
    });
  });

  it("deleteMetaResource sends DELETE to id route", async () => {
    await api.deleteMetaResource(7);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/meta-resources/7",
      method: "delete",
    });
  });
});
