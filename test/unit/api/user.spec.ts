/**
 * Unit tests for src/api/v1/user.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

describe("User API", () => {
  let request: ReturnType<typeof vi.fn>;
  let getUserCreation: typeof import("@/api/v1/user").getUserCreation;
  let putUserData: typeof import("@/api/v1/user").putUserData;
  let info: typeof import("@/api/v1/user").info;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    const mod = await import("@/api/v1/user");
    getUserCreation = mod.getUserCreation;
    putUserData = mod.putUserData;
    info = mod.info;
  });

  // -----------------------------------------------------------------------
  // getUserCreation
  // -----------------------------------------------------------------------
  describe("getUserCreation()", () => {
    it("calls GET /v1/user/creation with expand query", async () => {
      request.mockResolvedValue({ data: {} });
      await getUserCreation();
      const callArg = request.mock.calls[0][0];
      expect(callArg.method).toBe("get");
      expect(callArg.url).toContain("/v1/user/creation");
      expect(callArg.url).toContain("expand=");
    });

    it("expand includes pictureCount", async () => {
      request.mockResolvedValue({ data: {} });
      await getUserCreation();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("pictureCount");
    });

    it("expand includes verseCount", async () => {
      request.mockResolvedValue({ data: {} });
      await getUserCreation();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("verseCount");
    });
  });

  // -----------------------------------------------------------------------
  // putUserData
  // -----------------------------------------------------------------------
  describe("putUserData()", () => {
    it("calls PUT /v1/user/update with provided data", async () => {
      request.mockResolvedValue({ data: {} });
      const payload = { nickname: "Alice" };
      await putUserData(payload);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/user/update",
          method: "put",
          data: payload,
        })
      );
    });

    it("calls logger.error with the data (side-effect behavior)", async () => {
      const { logger } = await import("@/utils/logger");
      request.mockResolvedValue({ data: {} });
      await putUserData({ name: "test" });
      expect(logger.error).toHaveBeenCalledWith({ name: "test" });
    });
  });

  // -----------------------------------------------------------------------
  // info
  // -----------------------------------------------------------------------
  describe("info()", () => {
    it("calls GET /v1/user/info", async () => {
      request.mockResolvedValue({ data: { id: 1, username: "alice" } });
      await info();
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/user/info",
          method: "get",
        })
      );
    });

    it("uses GET method (no body)", async () => {
      request.mockResolvedValue({ data: {} });
      await info();
      const callArg = request.mock.calls[0][0];
      expect(callArg.data).toBeUndefined();
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 42, username: "bob" } };
      request.mockResolvedValue(mockResp);
      const result = await info();
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------
  describe("getUserCreation() — expand string", () => {
    it("URL contains 'polygenCount' in expand", async () => {
      request.mockResolvedValue({ data: {} });
      await getUserCreation();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("polygenCount");
    });
  });

  describe("putUserData() — method", () => {
    it("uses PUT method", async () => {
      request.mockResolvedValue({ data: {} });
      await putUserData({ nickname: "Charlie" });
      expect(request.mock.calls[0][0].method).toBe("put");
    });
  });

  describe("getUserCreation() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { pictureCount: 5, verseCount: 3 } };
      request.mockResolvedValue(mockResp);
      const result = await getUserCreation();
      expect(result).toEqual(mockResp);
    });
  });

  describe("putUserData() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, nickname: "Alice" } };
      request.mockResolvedValue(mockResp);
      const result = await putUserData({ nickname: "Alice" });
      expect(result).toEqual(mockResp);
    });
  });

  describe("info() — idempotent", () => {
    it("calling info twice makes two requests", async () => {
      request.mockResolvedValue({ data: {} });
      await info();
      await info();
      expect(request).toHaveBeenCalledTimes(2);
    });
  });
});
