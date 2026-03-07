/**
 * Unit tests for src/api/v1/group.ts
 * Covers all exported functions and query-building logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Group API", () => {
  let request: ReturnType<typeof vi.fn>;
  let groupApi: typeof import("@/api/v1/group");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    groupApi = await import("@/api/v1/group");
  });

  // -----------------------------------------------------------------------
  // getGroups
  // -----------------------------------------------------------------------
  describe("getGroups()", () => {
    it("calls GET /v1/group", async () => {
      await groupApi.getGroups();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/group");
      expect(method).toBe("get");
    });

    it("includes default sort=-created_at", async () => {
      await groupApi.getGroups();
      expect(request.mock.calls[0][0].url).toContain("sort=-created_at");
    });

    it("includes default expand=image,user", async () => {
      await groupApi.getGroups();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=");
    });

    it("omits GroupSearch when search is empty", async () => {
      await groupApi.getGroups("-created_at", "");
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("GroupSearch");
    });

    it("includes GroupSearch when search is non-empty", async () => {
      await groupApi.getGroups("-created_at", "my group");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("GroupSearch");
      expect(url).toContain("my%20group");
    });

    it("omits page param when page === 1 (default)", async () => {
      await groupApi.getGroups("-created_at", "", 1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await groupApi.getGroups("-created_at", "", 2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });

    it("includes per-page when not default (20)", async () => {
      await groupApi.getGroups("-created_at", "", 1, 50);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("per-page=50");
    });

    it("omits per-page when it equals default (20)", async () => {
      await groupApi.getGroups("-created_at", "", 1, 20);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("per-page");
    });

    it("appends additional filter params", async () => {
      await groupApi.getGroups("-created_at", "", 1, 20, "image", {
        status: "active",
      });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("status=active");
    });

    it("ignores filter params with empty/null values", async () => {
      await groupApi.getGroups("-created_at", "", 1, 20, "image", {
        status: "",
      });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("status");
    });
  });

  // -----------------------------------------------------------------------
  // getGroup
  // -----------------------------------------------------------------------
  describe("getGroup()", () => {
    it("calls GET /v1/group/{id}", async () => {
      await groupApi.getGroup(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/v1/group/7"),
          method: "get",
        })
      );
    });

    it("includes expand query param", async () => {
      await groupApi.getGroup(7, "image");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image");
    });
  });

  // -----------------------------------------------------------------------
  // createGroup
  // -----------------------------------------------------------------------
  describe("createGroup()", () => {
    it("calls POST /v1/group with data", async () => {
      const data = { name: "New Group" } as Parameters<
        typeof groupApi.createGroup
      >[0];
      await groupApi.createGroup(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/group",
          method: "post",
          data,
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateGroup
  // -----------------------------------------------------------------------
  describe("updateGroup()", () => {
    it("calls PUT /v1/group/{id}", async () => {
      await groupApi.updateGroup(3, { name: "Updated" } as Parameters<
        typeof groupApi.updateGroup
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/3", method: "put" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // patchGroup
  // -----------------------------------------------------------------------
  describe("patchGroup()", () => {
    it("calls PATCH /v1/group/{id}", async () => {
      await groupApi.patchGroup(4, { name: "Patched" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/4", method: "patch" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteGroup
  // -----------------------------------------------------------------------
  describe("deleteGroup()", () => {
    it("calls DELETE /v1/group/{id}", async () => {
      await groupApi.deleteGroup(8);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/8", method: "delete" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // joinGroup / leaveGroup
  // -----------------------------------------------------------------------
  describe("joinGroup()", () => {
    it("calls POST /v1/group/{id}/join", async () => {
      await groupApi.joinGroup(10);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/10/join", method: "post" })
      );
    });
  });

  describe("leaveGroup()", () => {
    it("calls POST /v1/group/{id}/leave", async () => {
      await groupApi.leaveGroup(10);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/10/leave", method: "post" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // createGroupVerse
  // -----------------------------------------------------------------------
  describe("createGroupVerse()", () => {
    it("calls POST /v1/group/{id}/verse", async () => {
      const data = { name: "Scene" } as Parameters<
        typeof groupApi.createGroupVerse
      >[1];
      await groupApi.createGroupVerse(5, data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/group/5/verse", method: "post" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // getGroupVerses
  // -----------------------------------------------------------------------
  describe("getGroupVerses()", () => {
    it("calls GET /v1/group/{id}/verses", async () => {
      await groupApi.getGroupVerses(2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/group/2/verses");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("omits page param when page === 1", async () => {
      await groupApi.getGroupVerses(2, "-created_at", 1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=");
    });

    it("includes page param when page > 1", async () => {
      await groupApi.getGroupVerses(2, "-created_at", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("includes per-page when perPage is not 20", async () => {
      await groupApi.getGroupVerses(2, "-created_at", 1, 50);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("per-page=50");
    });

    it("includes search when search string is provided", async () => {
      await groupApi.getGroupVerses(
        2,
        "-created_at",
        1,
        20,
        "verse.image,verse.author",
        "keyword"
      );
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("search=keyword");
    });
  });

  // -----------------------------------------------------------------------
  // deleteGroupVerse
  // -----------------------------------------------------------------------
  describe("deleteGroupVerse()", () => {
    it("calls DELETE /v1/group/{groupId}/verse/{verseId}", async () => {
      await groupApi.deleteGroupVerse(1, 9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/group/1/verse/9",
          method: "delete",
        })
      );
    });

    it("uses the correct groupId and verseId in the URL", async () => {
      await groupApi.deleteGroupVerse(42, 77);
      expect(request.mock.calls[0][0].url).toBe("/v1/group/42/verse/77");
    });
  });

  describe("createGroup() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, name: "New Group" } };
      request.mockResolvedValue(mockResp);
      const result = await groupApi.createGroup({
        name: "New Group",
      } as Parameters<typeof groupApi.createGroup>[0]);
      expect(result).toEqual(mockResp);
    });
  });

  describe("joinGroup() — different IDs", () => {
    it("uses the correct ID in the URL", async () => {
      await groupApi.joinGroup(99);
      expect(request.mock.calls[0][0].url).toBe("/v1/group/99/join");
    });
  });

  describe("deleteGroup() — correct ID", () => {
    it("uses the correct ID in the DELETE URL", async () => {
      await groupApi.deleteGroup(55);
      expect(request.mock.calls[0][0].url).toBe("/v1/group/55");
    });
  });
});
