/**
 * Unit tests for src/api/v1/edu-school.ts
 * Covers: getSchools, getSchool, createSchool, updateSchool,
 *         deleteSchool, getPrincipalSchools
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("EduSchool API", () => {
  let request: ReturnType<typeof vi.fn>;
  let schoolApi: typeof import("@/api/v1/edu-school");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    schoolApi = await import("@/api/v1/edu-school");
  });

  // -----------------------------------------------------------------------
  // getSchools
  // -----------------------------------------------------------------------
  describe("getSchools()", () => {
    it("calls GET /v1/edu-school", async () => {
      await schoolApi.getSchools();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-school");
      expect(method).toBe("get");
    });

    it("includes default expand=image,principal", async () => {
      await schoolApi.getSchools();
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("omits search when search is empty", async () => {
      await schoolApi.getSchools("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("search=");
    });

    it("includes search when search is provided", async () => {
      await schoolApi.getSchools("-created_at", "sunshine");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("search=");
      expect(url).toContain("sunshine");
    });

    it("omits page when page === 1", async () => {
      await schoolApi.getSchools("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await schoolApi.getSchools("-created_at", "", 3);
      expect(request.mock.calls[0][0].url).toContain("page=3");
    });

    it("includes sort in query", async () => {
      await schoolApi.getSchools("-updated_at");
      expect(request.mock.calls[0][0].url).toContain("sort=-updated_at");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, name: "School A" }] };
      request.mockResolvedValue(mockResp);
      const result = await schoolApi.getSchools();
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // getSchool
  // -----------------------------------------------------------------------
  describe("getSchool()", () => {
    it("calls GET /v1/edu-school/{id}", async () => {
      await schoolApi.getSchool(5);
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-school/5");
      expect(method).toBe("get");
    });

    it("includes expand in query when provided", async () => {
      await schoolApi.getSchool(5, "image,principal");
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("omits expand when expand is empty string", async () => {
      await schoolApi.getSchool(5, "");
      expect(request.mock.calls[0][0].url).not.toContain("expand=");
    });

    it("different IDs produce different URLs", async () => {
      await schoolApi.getSchool(1);
      const url1: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      request.mockResolvedValue({ data: {} });
      await schoolApi.getSchool(2);
      const url2: string = request.mock.calls[0][0].url;
      expect(url1).not.toBe(url2);
    });
  });

  // -----------------------------------------------------------------------
  // createSchool
  // -----------------------------------------------------------------------
  describe("createSchool()", () => {
    it("calls POST /v1/edu-school", async () => {
      await schoolApi.createSchool({ name: "New School" } as Parameters<
        typeof schoolApi.createSchool
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school", method: "post" })
      );
    });

    it("sends data payload", async () => {
      const data = { name: "Academy" };
      await schoolApi.createSchool(data as Parameters<
        typeof schoolApi.createSchool
      >[0]);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 10, name: "Academy" } };
      request.mockResolvedValue(mockResp);
      const result = await schoolApi.createSchool({ name: "Academy" } as Parameters<
        typeof schoolApi.createSchool
      >[0]);
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // updateSchool
  // -----------------------------------------------------------------------
  describe("updateSchool()", () => {
    it("calls PUT /v1/edu-school/{id}", async () => {
      await schoolApi.updateSchool(3, { name: "Updated" } as Parameters<
        typeof schoolApi.updateSchool
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school/3", method: "put" })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "Renamed School" };
      await schoolApi.updateSchool(3, data as Parameters<
        typeof schoolApi.updateSchool
      >[1]);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  // -----------------------------------------------------------------------
  // deleteSchool
  // -----------------------------------------------------------------------
  describe("deleteSchool()", () => {
    it("calls DELETE /v1/edu-school/{id}", async () => {
      await schoolApi.deleteSchool(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school/7", method: "delete" })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await schoolApi.deleteSchool(7);
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // getPrincipalSchools
  // -----------------------------------------------------------------------
  describe("getPrincipalSchools()", () => {
    it("calls GET /v1/edu-school/principal", async () => {
      await schoolApi.getPrincipalSchools();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-school/principal");
      expect(method).toBe("get");
    });

    it("includes default expand", async () => {
      await schoolApi.getPrincipalSchools();
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("omits search when search is empty", async () => {
      await schoolApi.getPrincipalSchools("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("search=");
    });

    it("includes search when search is provided", async () => {
      await schoolApi.getPrincipalSchools("-created_at", "harvard");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("harvard");
    });

    it("omits page when page === 1", async () => {
      await schoolApi.getPrincipalSchools("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await schoolApi.getPrincipalSchools("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });
  });
});
