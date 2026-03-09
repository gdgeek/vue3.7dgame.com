import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/cyber", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/cyber");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/cyber");
  });

  it("exports putCyber", () => {
    expect(typeof api.putCyber).toBe("function");
  });

  it("exports postCyber", () => {
    expect(typeof api.postCyber).toBe("function");
  });

  it("putCyber calls request once", async () => {
    await api.putCyber(10, { title: "x" } as Parameters<
      typeof api.putCyber
    >[1]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("putCyber uses PUT method", async () => {
    await api.putCyber(10, {} as Parameters<typeof api.putCyber>[1]);
    expect(request.mock.calls[0][0].method).toBe("put");
  });

  it("putCyber uses id in URL", async () => {
    await api.putCyber(33, {} as Parameters<typeof api.putCyber>[1]);
    expect(request.mock.calls[0][0].url).toBe("/v1/cybers/33");
  });

  it("putCyber sends data object", async () => {
    const data = { name: "abc" } as Parameters<typeof api.putCyber>[1];
    await api.putCyber(5, data);
    expect(request.mock.calls[0][0].data).toBe(data);
  });

  it("postCyber uses POST /v1/cybers", async () => {
    await api.postCyber({ x: 1 } as Parameters<typeof api.postCyber>[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "post", url: "/v1/cybers" })
    );
  });

  it("postCyber returns request result", async () => {
    const payload = { data: { id: 7 } };
    request.mockResolvedValue(payload);
    await expect(
      api.postCyber({} as Parameters<typeof api.postCyber>[0])
    ).resolves.toEqual(payload);
  });
});
