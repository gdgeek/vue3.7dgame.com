/**
 * Unit tests for src/api/v1/person.ts
 * Covers: postPerson, deletePerson, putPerson, getPerson
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Person API", () => {
  let request: ReturnType<typeof vi.fn>;
  let personApi: typeof import("@/api/v1/person");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    personApi = await import("@/api/v1/person");
  });

  // -------------------------------------------------------------------------
  // postPerson()
  // -------------------------------------------------------------------------
  describe("postPerson()", () => {
    it("calls POST /v1/people with data", async () => {
      const data = { username: "alice", role: "student" };
      await personApi.postPerson(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/people", method: "post", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, username: "alice" } };
      request.mockResolvedValue(mockResp);
      const result = await personApi.postPerson({ username: "alice" });
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // deletePerson()
  // -------------------------------------------------------------------------
  describe("deletePerson()", () => {
    it("calls DELETE /v1/people/{id}", async () => {
      await personApi.deletePerson(9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/people/9", method: "delete" })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await personApi.deletePerson(9);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // putPerson()
  // -------------------------------------------------------------------------
  describe("putPerson()", () => {
    it("calls PUT /v1/people/auth with data", async () => {
      const data = { id: 3, auth: "teacher" };
      await personApi.putPerson(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/people/auth", method: "put", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 3, auth: "teacher" } };
      request.mockResolvedValue(mockResp);
      const result = await personApi.putPerson({ id: 3, auth: "teacher" });
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // getPerson()
  // -------------------------------------------------------------------------
  describe("getPerson()", () => {
    it("calls GET /v1/people", async () => {
      await personApi.getPerson();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/people");
    });

    it("includes default sort and expand in query", async () => {
      await personApi.getPerson();
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("sort=");
      expect(url).toContain("expand=");
    });

    it("includes PersonSearch[username] when search is provided", async () => {
      await personApi.getPerson("-created_at", "bob");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("PersonSearch");
      expect(url).toContain("bob");
    });

    it("omits PersonSearch[username] when search is empty", async () => {
      await personApi.getPerson("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("PersonSearch");
    });

    it("includes page when page > 1", async () => {
      await personApi.getPerson("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 1", async () => {
      await personApi.getPerson("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes custom expand param", async () => {
      await personApi.getPerson("-created_at", "", 1, "avatar");
      expect(request.mock.calls[0][0].url).toContain("expand=avatar");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, username: "alice" }] };
      request.mockResolvedValue(mockResp);
      const result = await personApi.getPerson();
      expect(result).toEqual(mockResp);
    });
  });
});
