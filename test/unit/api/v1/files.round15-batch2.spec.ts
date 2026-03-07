import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/files round15 batch2", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/files");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/files");
  });

  it("postFile exists", () => {
    expect(typeof api.postFile).toBe("function");
  });

  it("postFile sends POST method", async () => {
    await api.postFile({} as Parameters<typeof api.postFile>[0]);
    expect(request.mock.calls[0][0].method).toBe("post");
  });

  it("postFile sends /v1/files URL", async () => {
    await api.postFile({} as Parameters<typeof api.postFile>[0]);
    expect(request.mock.calls[0][0].url).toBe("/v1/files");
  });

  it("postFile forwards object payload", async () => {
    const data = { name: "a.png", size: 1 } as Parameters<typeof api.postFile>[0];
    await api.postFile(data);
    expect(request.mock.calls[0][0].data).toBe(data);
  });

  it("postFile forwards FormData payload", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "x.txt");
    await api.postFile(formData as unknown as Parameters<typeof api.postFile>[0]);
    expect(request.mock.calls[0][0].data).toBe(formData);
  });

  it("postFile triggers exactly one request", async () => {
    await api.postFile({} as Parameters<typeof api.postFile>[0]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("postFile returns request promise value", async () => {
    const payload = { data: { id: 1 } };
    request.mockResolvedValue(payload);
    await expect(api.postFile({} as Parameters<typeof api.postFile>[0])).resolves.toEqual(payload);
  });

  it("multiple postFile calls keep last payload", async () => {
    await api.postFile({ name: "1" } as Parameters<typeof api.postFile>[0]);
    await api.postFile({ name: "2" } as Parameters<typeof api.postFile>[0]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].data).toEqual({ name: "2" });
  });
});
