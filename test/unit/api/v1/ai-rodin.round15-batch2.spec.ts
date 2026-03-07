import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/ai-rodin round15 batch2", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/ai-rodin");

  beforeAll(() => {
    vi.stubEnv("VITE_APP_AI_API", "https://ai.example.test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/ai-rodin");
  });

  it("schedule returns 0 for empty jobs", () => {
    expect(api.schedule([])).toBe(0);
  });

  it("schedule counts done and generating states", () => {
    const v = api.schedule([{ status: "done" }, { status: "generating" }]);
    expect(v).toBe(0.75);
  });

  it("schedule ignores unsupported status", () => {
    const v = api.schedule([{ status: "queued" }]);
    expect(v).toBe(0);
  });

  it("file sends GET with id query", async () => {
    await api.file(11);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get", url: expect.stringContaining("/file?id=11") })
    );
  });

  it("rodin serializes query", async () => {
    await api.rodin({ prompt: "robot", user_id: 7 });
    const arg = request.mock.calls[0][0];
    expect(arg.method).toBe("get");
    expect(arg.url).toContain("/rodin?");
    expect(arg.url).toContain("prompt=robot");
    expect(arg.url).toContain("user_id=7");
  });

  it("check and download use AI base URL", async () => {
    await api.check(20);
    await api.download(21);
    expect(request.mock.calls[0][0].url.startsWith("https://ai.example.test/check")).toBe(true);
    expect(request.mock.calls[1][0].url.startsWith("https://ai.example.test/download")).toBe(true);
  });

  it("get uses default expand", async () => {
    await api.get(3);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get", url: expect.stringContaining("/v1/ai-rodin/3?expand=resource%2Cstep") })
    );
  });

  it("del and list build request correctly", async () => {
    await api.del(4);
    await api.list("-created_at", "dragon", 2, "resource");
    expect(request.mock.calls[0][0]).toEqual(expect.objectContaining({ url: "/v1/ai-rodin/4", method: "delete" }));
    const listArg = request.mock.calls[1][0];
    expect(listArg.method).toBe("get");
    expect(listArg.url).toContain("/v1/ai-rodin?");
    expect(listArg.url).toContain("AiRodinSearch%5Bname%5D=dragon");
    expect(listArg.url).toContain("page=2");
    expect(listArg.url).toContain("expand=resource");
  });
});
