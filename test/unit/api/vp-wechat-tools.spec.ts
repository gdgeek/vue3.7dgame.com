/**
 * Unit tests for:
 *   - src/api/v1/vp-guide.ts
 *   - src/api/v1/vp-map.ts
 *   - src/api/v1/wechat.ts
 *   - src/api/v1/tools.ts
 *   - src/api/v1/ai-rodin.ts  (schedule pure function + CRUD requests)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// vp-guide API
// ============================================================
describe("VpGuide API", () => {
  let request: ReturnType<typeof vi.fn>;
  let vpGuideApi: typeof import("@/api/v1/vp-guide");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    vpGuideApi = await import("@/api/v1/vp-guide");
  });

  it("postVpGuide calls POST /v1/vp-guides", async () => {
    await vpGuideApi.postVpGuide({ title: "Guide 1" });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-guides", method: "post" })
    );
  });

  it("getVpGuide calls GET /v1/vp-guides/{id}", async () => {
    await vpGuideApi.getVpGuide(3);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-guides/3", method: "get" })
    );
  });

  it("getVpGuides calls GET /v1/vp-guides with sort=order", async () => {
    await vpGuideApi.getVpGuides();
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/vp-guides");
    expect(url).toContain("sort=order");
  });

  it("getVpGuides omits page when page <= 1", async () => {
    await vpGuideApi.getVpGuides(1);
    expect(request.mock.calls[0][0].url).not.toContain("page=");
  });

  it("getVpGuides includes page when page > 1", async () => {
    await vpGuideApi.getVpGuides(3);
    expect(request.mock.calls[0][0].url).toContain("page=3");
  });

  it("getVerses (vp-guide) calls GET /v1/vp-guides/verses", async () => {
    await vpGuideApi.getVerses({});
    expect(request.mock.calls[0][0].url).toContain("/v1/vp-guides/verses");
  });

  it("getVerses includes search when non-empty", async () => {
    await vpGuideApi.getVerses({ search: "robot" });
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("VerseSearch");
    expect(url).toContain("robot");
  });

  it("putVpGuide calls PUT /v1/vp-guides/{id}", async () => {
    await vpGuideApi.putVpGuide(5, { title: "Updated" });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-guides/5", method: "put" })
    );
  });

  it("deleteVpGuide calls DELETE /v1/vp-guides/{id}", async () => {
    await vpGuideApi.deleteVpGuide(7);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-guides/7", method: "delete" })
    );
  });
});

// ============================================================
// vp-map API
// ============================================================
describe("VpMap API", () => {
  let request: ReturnType<typeof vi.fn>;
  let vpMapApi: typeof import("@/api/v1/vp-map");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    vpMapApi = await import("@/api/v1/vp-map");
  });

  it("postVpMap calls POST /v1/vp-maps", async () => {
    await vpMapApi.postVpMap({ name: "Map 1" } as Parameters<
      typeof vpMapApi.postVpMap
    >[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-maps", method: "post" })
    );
  });

  it("deleteVpMap calls DELETE /v1/vp-maps/{id}", async () => {
    await vpMapApi.deleteVpMap(4);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/vp-maps/4", method: "delete" })
    );
  });

  it("getVpMaps calls GET /v1/vp-maps", async () => {
    await vpMapApi.getVpMaps();
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/vp-maps");
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("getVpMaps omits page when page === 1", async () => {
    await vpMapApi.getVpMaps(1);
    expect(request.mock.calls[0][0].url).not.toContain("page=");
  });

  it("getVpMaps includes page when page > 1", async () => {
    await vpMapApi.getVpMaps(2);
    expect(request.mock.calls[0][0].url).toContain("page=2");
  });
});

// ============================================================
// wechat API
// ============================================================
describe("Wechat API", () => {
  let request: ReturnType<typeof vi.fn>;
  let wechatApi: typeof import("@/api/v1/wechat");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    wechatApi = await import("@/api/v1/wechat");
  });

  it("login calls POST /v1/wechat/login", async () => {
    await wechatApi.login({ code: "wx-code" } as Parameters<
      typeof wechatApi.login
    >[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/wechat/login", method: "post" })
    );
  });

  it("link calls POST /v1/wechat/link", async () => {
    await wechatApi.link({ code: "link-code" } as Parameters<
      typeof wechatApi.link
    >[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/wechat/link", method: "post" })
    );
  });

  it("register calls POST /v1/wechat/register", async () => {
    await wechatApi.register({ code: "reg-code" } as Parameters<
      typeof wechatApi.register
    >[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/wechat/register", method: "post" })
    );
  });
});

// ============================================================
// tools API
// ============================================================
describe("Tools API", () => {
  let request: ReturnType<typeof vi.fn>;
  let getUserLinked: typeof import("@/api/v1/tools").getUserLinked;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    getUserLinked = (await import("@/api/v1/tools")).getUserLinked;
  });

  it("getUserLinked calls GET /v1/tools/user-linked", async () => {
    await getUserLinked();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/tools/user-linked",
        method: "get",
      })
    );
  });
});

// ============================================================
// ai-rodin: schedule() pure function
// ============================================================
describe("AiRodin — schedule() pure function", () => {
  let aiRodinApi: typeof import("@/api/v1/ai-rodin");

  beforeEach(async () => {
    vi.clearAllMocks();
    const request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    aiRodinApi = await import("@/api/v1/ai-rodin");
  });

  it("returns 0 for empty job list", () => {
    expect(aiRodinApi.schedule([])).toBeNaN(); // 0/0 = NaN
  });

  it("returns 0 for all unknown-status jobs", () => {
    const jobs = [{ status: "pending" }, { status: "waiting" }];
    expect(aiRodinApi.schedule(jobs)).toBe(0 / 4); // count=0, max=4 → 0
  });

  it("returns 0.5 for a single 'generating' job (1/2)", () => {
    expect(aiRodinApi.schedule([{ status: "generating" }])).toBe(0.5);
  });

  it("returns 1 for a single 'done' job (2/2)", () => {
    expect(aiRodinApi.schedule([{ status: "done" }])).toBe(1);
  });

  it("is case-insensitive for status (GENERATING → 0.5)", () => {
    expect(aiRodinApi.schedule([{ status: "GENERATING" }])).toBe(0.5);
  });

  it("is case-insensitive for status (Done → 1)", () => {
    expect(aiRodinApi.schedule([{ status: "Done" }])).toBe(1);
  });

  it("returns 0.75 for 1 done + 1 generating out of 2 jobs", () => {
    // done=2, generating=1 → count=3, max=4
    const jobs = [{ status: "done" }, { status: "generating" }];
    expect(aiRodinApi.schedule(jobs)).toBe(3 / 4);
  });

  it("mixed: 2 done, 1 generating, 1 unknown → 5/8", () => {
    const jobs = [
      { status: "done" },
      { status: "done" },
      { status: "generating" },
      { status: "unknown" },
    ];
    // count = 2+2+1 = 5, max = 8
    expect(aiRodinApi.schedule(jobs)).toBe(5 / 8);
  });

  it("all done → returns 1", () => {
    const jobs = [{ status: "done" }, { status: "done" }, { status: "done" }];
    expect(aiRodinApi.schedule(jobs)).toBe(1);
  });

  it("all generating → returns 0.5", () => {
    const jobs = [
      { status: "generating" },
      { status: "generating" },
    ];
    // count=2, max=4 → 0.5
    expect(aiRodinApi.schedule(jobs)).toBe(0.5);
  });
});

// ============================================================
// ai-rodin: HTTP request methods
// ============================================================
describe("AiRodin API — HTTP methods", () => {
  let request: ReturnType<typeof vi.fn>;
  let aiRodinApi: typeof import("@/api/v1/ai-rodin");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    aiRodinApi = await import("@/api/v1/ai-rodin");
  });

  it("get() calls GET /v1/ai-rodin/{id}", async () => {
    await aiRodinApi.get(10);
    const { url, method } = request.mock.calls[0][0];
    expect(url).toContain("/v1/ai-rodin/10");
    expect(method).toBe("get");
  });

  it("del() calls DELETE /v1/ai-rodin/{id}", async () => {
    await aiRodinApi.del(5);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/ai-rodin/5", method: "delete" })
    );
  });

  it("list() calls GET /v1/ai-rodin", async () => {
    await aiRodinApi.list();
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/ai-rodin");
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("list() includes AiRodinSearch when search provided", async () => {
    await aiRodinApi.list("-created_at", "dragon");
    const url: string = request.mock.calls[0][0].url;
    expect(url).toContain("AiRodinSearch");
    expect(url).toContain("dragon");
  });

  it("list() includes page when page > 0", async () => {
    await aiRodinApi.list("-created_at", "", 2);
    expect(request.mock.calls[0][0].url).toContain("page=2");
  });

  it("file() calls GET with id query param", async () => {
    await aiRodinApi.file(42);
    const arg = request.mock.calls[0][0];
    expect(arg.url).toContain("id=42");
    expect(arg.method).toBe("get");
  });

  it("rodin() calls GET with query params", async () => {
    await aiRodinApi.rodin({ task_uuid: "abc" });
    const arg = request.mock.calls[0][0];
    expect(arg.url).toContain("task_uuid=abc");
    expect(arg.method).toBe("get");
  });

  it("check() calls GET with id query param", async () => {
    await aiRodinApi.check(7);
    const arg = request.mock.calls[0][0];
    expect(arg.url).toContain("id=7");
    expect(arg.method).toBe("get");
  });

  it("download() calls GET with id query param", async () => {
    await aiRodinApi.download(99);
    const arg = request.mock.calls[0][0];
    expect(arg.url).toContain("id=99");
    expect(arg.method).toBe("get");
  });
});
