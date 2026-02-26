/**
 * Unit tests for:
 *   - src/api/v1/edu-class.ts   (full CRUD + teacher/student/group operations)
 *   - src/api/v1/edu-school.ts  (CRUD + principal endpoint)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// edu-class API
// ============================================================
describe("EduClass API", () => {
  let request: ReturnType<typeof vi.fn>;
  let classApi: typeof import("@/api/v1/edu-class");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    classApi = await import("@/api/v1/edu-class");
  });

  // -----------------------------------------------------------------------
  // getClasses
  // -----------------------------------------------------------------------
  describe("getClasses()", () => {
    it("calls GET /v1/edu-class", async () => {
      await classApi.getClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-class");
      expect(method).toBe("get");
    });

    it("omits ClassSearch when search is empty", async () => {
      await classApi.getClasses("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ClassSearch");
    });

    it("includes ClassSearch[name] when search provided", async () => {
      await classApi.getClasses("-created_at", "Math");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("ClassSearch");
      expect(url).toContain("Math");
    });

    it("omits school_id when null", async () => {
      await classApi.getClasses("-created_at", "", 1, "image", null);
      expect(request.mock.calls[0][0].url).not.toContain("school_id");
    });

    it("includes school_id when provided", async () => {
      await classApi.getClasses("-created_at", "", 1, "image", 42);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("school_id=42");
    });

    it("omits page when page === 1", async () => {
      await classApi.getClasses("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await classApi.getClasses("-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });
  });

  // -----------------------------------------------------------------------
  // getClass
  // -----------------------------------------------------------------------
  describe("getClass()", () => {
    it("calls GET /v1/edu-class/{id}", async () => {
      await classApi.getClass(5);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-class/5");
    });

    it("includes expand when provided", async () => {
      await classApi.getClass(5, "image");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image");
    });

    it("omits expand when empty", async () => {
      await classApi.getClass(5, "");
      expect(request.mock.calls[0][0].url).not.toContain("expand=");
    });
  });

  // -----------------------------------------------------------------------
  // createClass / updateClass / deleteClass
  // -----------------------------------------------------------------------
  describe("createClass()", () => {
    it("calls POST /v1/edu-class", async () => {
      await classApi.createClass({ name: "Math 101" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class", method: "post" })
      );
    });
  });

  describe("updateClass()", () => {
    it("calls PUT /v1/edu-class/{id}", async () => {
      await classApi.updateClass(7, { name: "Updated" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class/7", method: "put" })
      );
    });
  });

  describe("deleteClass()", () => {
    it("calls DELETE /v1/edu-class/{id}", async () => {
      await classApi.deleteClass(3);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-class/3", method: "delete" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Teacher/student role endpoints
  // -----------------------------------------------------------------------
  describe("getMyTeacherClasses()", () => {
    it("calls GET /v1/edu-class/teacher-me", async () => {
      await classApi.getMyTeacherClasses();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-class/teacher-me");
    });
  });

  describe("getMyStudentClasses()", () => {
    it("calls GET /v1/edu-class/by-student", async () => {
      await classApi.getMyStudentClasses();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-class/by-student");
    });
  });

  describe("applyToClass()", () => {
    it("calls POST /v1/edu-class/apply with class_id", async () => {
      await classApi.applyToClass(10);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/apply",
          method: "post",
          data: { class_id: 10 },
        })
      );
    });
  });

  describe("leaveClass()", () => {
    it("calls POST /v1/edu-class/leave with class_id", async () => {
      await classApi.leaveClass(10);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/leave",
          method: "post",
          data: { class_id: 10 },
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Group operations
  // -----------------------------------------------------------------------
  describe("searchClasses()", () => {
    it("calls GET /v1/edu-class", async () => {
      await classApi.searchClasses();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-class");
      expect(method).toBe("get");
    });

    it("includes ClassSearch[name] when search provided", async () => {
      await classApi.searchClasses("-created_at", "Science");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("ClassSearch");
      expect(url).toContain("Science");
    });

    it("omits ClassSearch when search is empty", async () => {
      await classApi.searchClasses("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ClassSearch");
    });

    it("includes page when page > 1", async () => {
      await classApi.searchClasses("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 1", async () => {
      await classApi.searchClasses("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  describe("getClassGroups()", () => {
    it("calls GET /v1/edu-class/{id}/groups", async () => {
      await classApi.getClassGroups(2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-class/2/groups");
    });

    it("includes expand when expand param is provided", async () => {
      await classApi.getClassGroups(2, "-created_at", "", 1, "verse");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=verse");
    });

    it("includes GroupSearch when search provided", async () => {
      await classApi.getClassGroups(2, "-created_at", "team");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("GroupSearch");
      expect(url).toContain("team");
    });

    it("includes page param when page > 1", async () => {
      await classApi.getClassGroups(2, "-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });
  });

  describe("createClassGroup()", () => {
    it("calls POST /v1/edu-class/{id}/group", async () => {
      await classApi.createClassGroup(5, { name: "Group A" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/5/group",
          method: "post",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Teacher management
  // -----------------------------------------------------------------------
  describe("addTeacherToClass()", () => {
    it("calls POST /v1/edu-class/{id}/teacher", async () => {
      await classApi.addTeacherToClass(3, 7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/3/teacher",
          method: "post",
          data: { user_id: 7 },
        })
      );
    });
  });

  describe("removeTeacherFromClass()", () => {
    it("calls DELETE /v1/edu-class/{id}/teacher", async () => {
      await classApi.removeTeacherFromClass(3, 7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-class/3/teacher",
          method: "delete",
          data: { user_id: 7 },
        })
      );
    });
  });

  describe("getClassesByTeacher()", () => {
    it("calls GET /v1/edu-class/by-teacher with user_id", async () => {
      await classApi.getClassesByTeacher(12);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-class/by-teacher");
      expect(url).toContain("user_id=12");
    });

    it("includes page param when page > 1", async () => {
      await classApi.getClassesByTeacher(12, "-created_at", 2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });
  });
});

// ============================================================
// edu-school API
// ============================================================
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

  describe("getSchools()", () => {
    it("calls GET /v1/edu-school", async () => {
      await schoolApi.getSchools();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-school");
      expect(method).toBe("get");
    });

    it("includes search in query when non-empty", async () => {
      await schoolApi.getSchools("-created_at", "MIT");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("search=MIT");
    });

    it("omits search when empty", async () => {
      await schoolApi.getSchools("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("search=");
    });

    it("includes page when page > 1", async () => {
      await schoolApi.getSchools("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 1", async () => {
      await schoolApi.getSchools("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  describe("getSchool()", () => {
    it("calls GET /v1/edu-school/{id}", async () => {
      await schoolApi.getSchool(8);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-school/8");
    });
  });

  describe("createSchool()", () => {
    it("calls POST /v1/edu-school", async () => {
      await schoolApi.createSchool({ name: "New School" } as Parameters<
        typeof schoolApi.createSchool
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school", method: "post" })
      );
    });
  });

  describe("updateSchool()", () => {
    it("calls PUT /v1/edu-school/{id}", async () => {
      await schoolApi.updateSchool(4, { name: "Updated" } as Parameters<
        typeof schoolApi.updateSchool
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school/4", method: "put" })
      );
    });
  });

  describe("deleteSchool()", () => {
    it("calls DELETE /v1/edu-school/{id}", async () => {
      await schoolApi.deleteSchool(2);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-school/2", method: "delete" })
      );
    });
  });

  describe("getPrincipalSchools()", () => {
    it("calls GET /v1/edu-school/principal", async () => {
      await schoolApi.getPrincipalSchools();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-school/principal");
    });

    it("includes search when provided", async () => {
      await schoolApi.getPrincipalSchools("-created_at", "Elite");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("Elite");
    });
  });
});
