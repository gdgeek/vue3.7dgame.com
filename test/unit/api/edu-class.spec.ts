/**
 * Unit tests for src/api/v1/edu-class.ts
 * Covers all 15 exported functions:
 *   getClasses, getClass, createClass, updateClass, deleteClass,
 *   getMyTeacherClasses, getMyStudentClasses, applyToClass, leaveClass,
 *   searchClasses, getClassGroups, createClassGroup,
 *   addTeacherToClass, removeTeacherFromClass, getClassesByTeacher
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Edu-Class API", () => {
  let request: ReturnType<typeof vi.fn>;
  let eduClassApi: typeof import("@/api/v1/edu-class");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    eduClassApi = await import("@/api/v1/edu-class");
  });

  // -------------------------------------------------------------------------
  // getClasses()
  // -------------------------------------------------------------------------
  describe("getClasses()", () => {
    it("calls GET /v1/edu-class", async () => {
      await eduClassApi.getClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class");
    });

    it("includes default sort and expand", async () => {
      await eduClassApi.getClasses();
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("sort=");
      expect(url).toContain("expand=");
    });

    it("includes ClassSearch[name] when search is provided", async () => {
      await eduClassApi.getClasses("-created_at", "math");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("ClassSearch");
      expect(url).toContain("math");
    });

    it("omits ClassSearch[name] when search is empty", async () => {
      await eduClassApi.getClasses("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ClassSearch");
    });

    it("includes school_id when provided", async () => {
      await eduClassApi.getClasses("-created_at", "", 1, "image", 99);
      expect(request.mock.calls[0][0].url).toContain("school_id=99");
    });

    it("omits school_id when null", async () => {
      await eduClassApi.getClasses("-created_at", "", 1, "image", null);
      expect(request.mock.calls[0][0].url).not.toContain("school_id");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.getClasses("-created_at", "", 3);
      expect(request.mock.calls[0][0].url).toContain("page=3");
    });

    it("omits page when page === 1", async () => {
      await eduClassApi.getClasses("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, name: "Class A" }] };
      request.mockResolvedValue(mockResp);
      const result = await eduClassApi.getClasses();
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // getClass()
  // -------------------------------------------------------------------------
  describe("getClass()", () => {
    it("calls GET /v1/edu-class/{id}", async () => {
      await eduClassApi.getClass(5);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/v1/edu-class/5"),
          method: "get",
        })
      );
    });

    it("includes expand param when provided", async () => {
      await eduClassApi.getClass(5, "image,eduTeachers");
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("omits expand when empty string", async () => {
      await eduClassApi.getClass(5, "");
      expect(request.mock.calls[0][0].url).not.toContain("expand=");
    });
  });

  // -------------------------------------------------------------------------
  // createClass()
  // -------------------------------------------------------------------------
  describe("createClass()", () => {
    it("calls POST /v1/edu-class with data", async () => {
      const data = { name: "New Class", school_id: 1 };
      await eduClassApi.createClass(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class", method: "post", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 10, name: "New Class" } };
      request.mockResolvedValue(mockResp);
      const result = await eduClassApi.createClass({ name: "New Class" });
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // updateClass()
  // -------------------------------------------------------------------------
  describe("updateClass()", () => {
    it("calls PUT /v1/edu-class/{id}", async () => {
      const data = { name: "Updated Class" };
      await eduClassApi.updateClass(3, data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class/3", method: "put", data })
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteClass()
  // -------------------------------------------------------------------------
  describe("deleteClass()", () => {
    it("calls DELETE /v1/edu-class/{id}", async () => {
      await eduClassApi.deleteClass(8);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class/8", method: "delete" })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await eduClassApi.deleteClass(8);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // getMyTeacherClasses()
  // -------------------------------------------------------------------------
  describe("getMyTeacherClasses()", () => {
    it("calls GET /v1/edu-class/teacher-me", async () => {
      await eduClassApi.getMyTeacherClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class/teacher-me");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.getMyTeacherClasses("-created_at", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 1", async () => {
      await eduClassApi.getMyTeacherClasses("-created_at", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  // -------------------------------------------------------------------------
  // getMyStudentClasses()
  // -------------------------------------------------------------------------
  describe("getMyStudentClasses()", () => {
    it("calls GET /v1/edu-class/by-student", async () => {
      await eduClassApi.getMyStudentClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class/by-student");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.getMyStudentClasses("-created_at", 3);
      expect(request.mock.calls[0][0].url).toContain("page=3");
    });
  });

  // -------------------------------------------------------------------------
  // applyToClass()
  // -------------------------------------------------------------------------
  describe("applyToClass()", () => {
    it("calls POST /v1/edu-class/apply with class_id", async () => {
      await eduClassApi.applyToClass(42);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/apply",
          method: "post",
          data: { class_id: 42 },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // leaveClass()
  // -------------------------------------------------------------------------
  describe("leaveClass()", () => {
    it("calls POST /v1/edu-class/leave with class_id", async () => {
      await eduClassApi.leaveClass(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/leave",
          method: "post",
          data: { class_id: 7 },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // searchClasses()
  // -------------------------------------------------------------------------
  describe("searchClasses()", () => {
    it("calls GET /v1/edu-class", async () => {
      await eduClassApi.searchClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class");
    });

    it("includes ClassSearch[name] when search provided", async () => {
      await eduClassApi.searchClasses("-created_at", "science");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("ClassSearch");
      expect(url).toContain("science");
    });

    it("omits ClassSearch[name] when search is empty", async () => {
      await eduClassApi.searchClasses("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ClassSearch");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.searchClasses("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });
  });

  // -------------------------------------------------------------------------
  // getClassGroups()
  // -------------------------------------------------------------------------
  describe("getClassGroups()", () => {
    it("calls GET /v1/edu-class/{classId}/groups", async () => {
      await eduClassApi.getClassGroups(11);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class/11/groups");
    });

    it("includes GroupSearch[name] when search is provided", async () => {
      await eduClassApi.getClassGroups(11, "-created_at", "alpha");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("GroupSearch");
      expect(url).toContain("alpha");
    });

    it("omits GroupSearch when search is empty", async () => {
      await eduClassApi.getClassGroups(11, "-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("GroupSearch");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.getClassGroups(11, "-created_at", "", 4);
      expect(request.mock.calls[0][0].url).toContain("page=4");
    });

    it("omits expand when empty string", async () => {
      await eduClassApi.getClassGroups(11, "-created_at", "", 1, "");
      expect(request.mock.calls[0][0].url).not.toContain("expand=");
    });

    it("includes expand when provided", async () => {
      await eduClassApi.getClassGroups(11, "-created_at", "", 1, "image");
      expect(request.mock.calls[0][0].url).toContain("expand=image");
    });
  });

  // -------------------------------------------------------------------------
  // createClassGroup()
  // -------------------------------------------------------------------------
  describe("createClassGroup()", () => {
    it("calls POST /v1/edu-class/{classId}/group", async () => {
      await eduClassApi.createClassGroup(12, { name: "Team A" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/12/group",
          method: "post",
          data: { name: "Team A" },
        })
      );
    });

    it("uses empty object as default data", async () => {
      await eduClassApi.createClassGroup(12);
      expect(request.mock.calls[0][0].data).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // addTeacherToClass()
  // -------------------------------------------------------------------------
  describe("addTeacherToClass()", () => {
    it("calls POST /v1/edu-class/{classId}/teacher with user_id", async () => {
      await eduClassApi.addTeacherToClass(20, 55);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/20/teacher",
          method: "post",
          data: { user_id: 55 },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // removeTeacherFromClass()
  // -------------------------------------------------------------------------
  describe("removeTeacherFromClass()", () => {
    it("calls DELETE /v1/edu-class/{classId}/teacher with user_id", async () => {
      await eduClassApi.removeTeacherFromClass(20, 55);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/20/teacher",
          method: "delete",
          data: { user_id: 55 },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // getClassesByTeacher()
  // -------------------------------------------------------------------------
  describe("getClassesByTeacher()", () => {
    it("calls GET /v1/edu-class/by-teacher", async () => {
      await eduClassApi.getClassesByTeacher(33);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/edu-class/by-teacher");
    });

    it("includes user_id in query", async () => {
      await eduClassApi.getClassesByTeacher(33);
      expect(request.mock.calls[0][0].url).toContain("user_id=33");
    });

    it("includes page when page > 1", async () => {
      await eduClassApi.getClassesByTeacher(33, "-created_at", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 1", async () => {
      await eduClassApi.getClassesByTeacher(33, "-created_at", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1 }] };
      request.mockResolvedValue(mockResp);
      const result = await eduClassApi.getClassesByTeacher(33);
      expect(result).toEqual(mockResp);
    });
  });
});
