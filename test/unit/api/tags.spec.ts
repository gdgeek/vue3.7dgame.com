/**
 * Unit tests for src/api/v1/tags.ts
 * Covers: getTags — fetch all tags and return the response
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Tags API", () => {
  let request: ReturnType<typeof vi.fn>;
  let tagsApi: typeof import("@/api/v1/tags");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    tagsApi = await import("@/api/v1/tags");
  });

  // -------------------------------------------------------------------------
  // getTags()
  // -------------------------------------------------------------------------
  describe("getTags()", () => {
    it("calls GET /v1/tags", async () => {
      await tagsApi.getTags();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toBe("/v1/tags");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, name: "fantasy" }] };
      request.mockResolvedValue(mockResp);
      const result = await tagsApi.getTags();
      expect(result).toEqual(mockResp);
    });
  });
});
