/**
 * Unit tests for src/api/v1/ai-rodin.ts
 * Covers: schedule (pure logic), file, rodin, check, download (AI endpoint helpers),
 *         get / del / list (REST CRUD on /v1/ai-rodin).
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("AI-Rodin API", () => {
  let request: ReturnType<typeof vi.fn>;
  let aiRodinApi: typeof import("@/api/v1/ai-rodin");

  // Stub the AI base URL so that url-building code doesn't produce 'undefined'
  beforeAll(() => {
    vi.stubEnv("VITE_APP_AI_API", "https://ai.test.com");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    aiRodinApi = await import("@/api/v1/ai-rodin");
  });

  // -------------------------------------------------------------------------
  // schedule() — pure computation, no HTTP
  // -------------------------------------------------------------------------
  describe("schedule()", () => {
    it("returns 0 for an empty job list", () => {
      expect(aiRodinApi.schedule([])).toBe(0);
    });

    it("returns 1 when all jobs are done", () => {
      const jobs = [{ status: "done" }, { status: "done" }];
      expect(aiRodinApi.schedule(jobs)).toBe(1);
    });

    it("returns 0.5 when all jobs are generating", () => {
      const jobs = [{ status: "generating" }, { status: "generating" }];
      expect(aiRodinApi.schedule(jobs)).toBe(0.5);
    });

    it("is case-insensitive (DONE → done)", () => {
      expect(aiRodinApi.schedule([{ status: "DONE" }])).toBe(1);
    });

    it("is case-insensitive (GENERATING → generating)", () => {
      expect(aiRodinApi.schedule([{ status: "GENERATING" }])).toBe(0.5);
    });

    it("ignores unknown statuses (counts as 0)", () => {
      // 1 unknown job: count=0, max=2 → 0
      expect(aiRodinApi.schedule([{ status: "pending" }])).toBe(0);
    });

    it("calculates mixed statuses correctly", () => {
      // done(+2) + generating(+1) + unknown(+0) = 3, max = 3*2 = 6 → 0.5
      const jobs = [{ status: "done" }, { status: "generating" }, { status: "queued" }];
      expect(aiRodinApi.schedule(jobs)).toBeCloseTo(3 / 6);
    });
  });

  // -------------------------------------------------------------------------
  // file() — GET /file?id=…
  // -------------------------------------------------------------------------
  describe("file()", () => {
    it("calls GET with id in the query string", async () => {
      await aiRodinApi.file(42);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/file");
      expect(url).toContain("id=42");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: "42", status: "done" } };
      request.mockResolvedValue(mockResp);
      const result = await aiRodinApi.file(42);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // rodin() — GET /rodin?<query>
  // -------------------------------------------------------------------------
  describe("rodin()", () => {
    it("calls GET with all query params serialised", async () => {
      await aiRodinApi.rodin({ scene_id: "s1", user_id: 7 });
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/rodin");
      expect(url).toContain("scene_id=s1");
      expect(url).toContain("user_id=7");
    });
  });

  // -------------------------------------------------------------------------
  // check() — GET /check?id=…
  // -------------------------------------------------------------------------
  describe("check()", () => {
    it("calls GET /check with id param", async () => {
      await aiRodinApi.check(99);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/check");
      expect(url).toContain("id=99");
    });
  });

  // -------------------------------------------------------------------------
  // download() — GET /download?id=…
  // -------------------------------------------------------------------------
  describe("download()", () => {
    it("calls GET /download with id param", async () => {
      await aiRodinApi.download(5);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/download");
      expect(url).toContain("id=5");
    });
  });

  // -------------------------------------------------------------------------
  // get() — GET /v1/ai-rodin/{id}
  // -------------------------------------------------------------------------
  describe("get()", () => {
    it("calls GET /v1/ai-rodin/{id}", async () => {
      await aiRodinApi.get(10);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/ai-rodin/10");
    });

    it("includes default expand param", async () => {
      await aiRodinApi.get(10);
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("uses custom expand when provided", async () => {
      await aiRodinApi.get(10, "resource");
      expect(request.mock.calls[0][0].url).toContain("expand=resource");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 10 } };
      request.mockResolvedValue(mockResp);
      const result = await aiRodinApi.get(10);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // del() — DELETE /v1/ai-rodin/{id}
  // -------------------------------------------------------------------------
  describe("del()", () => {
    it("calls DELETE /v1/ai-rodin/{id}", async () => {
      await aiRodinApi.del(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/ai-rodin/7", method: "delete" })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await aiRodinApi.del(7);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // list() — GET /v1/ai-rodin (with optional search, page, expand)
  // -------------------------------------------------------------------------
  describe("list()", () => {
    it("calls GET /v1/ai-rodin", async () => {
      await aiRodinApi.list();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/ai-rodin");
    });

    it("includes default sort param", async () => {
      await aiRodinApi.list();
      expect(request.mock.calls[0][0].url).toContain("sort=");
    });

    it("includes AiRodinSearch[name] when search is provided", async () => {
      await aiRodinApi.list("-created_at", "dragon");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("AiRodinSearch");
      expect(url).toContain("dragon");
    });

    it("omits AiRodinSearch when search is empty", async () => {
      await aiRodinApi.list("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("AiRodinSearch");
    });

    it("includes page when page > 0", async () => {
      await aiRodinApi.list("-created_at", "", 3);
      expect(request.mock.calls[0][0].url).toContain("page=3");
    });

    it("omits page when page === 0", async () => {
      await aiRodinApi.list("-created_at", "", 0);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes custom expand", async () => {
      await aiRodinApi.list("-created_at", "", 0, "step");
      expect(request.mock.calls[0][0].url).toContain("expand=step");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1 }] };
      request.mockResolvedValue(mockResp);
      const result = await aiRodinApi.list();
      expect(result).toEqual(mockResp);
    });
  });
});
