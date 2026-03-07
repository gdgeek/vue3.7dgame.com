/**
 * Unit tests for src/api/v1/tags.ts
 * Covers: getTags — with and without the type filter
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
      expect(url).toContain("/v1/tags");
    });

    it("omits TagsSearch[type] when type is null (default)", async () => {
      await tagsApi.getTags();
      expect(request.mock.calls[0][0].url).not.toContain("TagsSearch");
    });

    it("omits TagsSearch[type] when called with explicit null", async () => {
      await tagsApi.getTags(null);
      expect(request.mock.calls[0][0].url).not.toContain("TagsSearch");
    });

    it("includes TagsSearch[type] when type is provided", async () => {
      await tagsApi.getTags("model");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("TagsSearch");
      expect(url).toContain("model");
    });

    it("encodes a different type value correctly", async () => {
      await tagsApi.getTags("picture");
      expect(request.mock.calls[0][0].url).toContain("picture");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, name: "fantasy" }] };
      request.mockResolvedValue(mockResp);
      const result = await tagsApi.getTags("model");
      expect(result).toEqual(mockResp);
    });
  });
});
