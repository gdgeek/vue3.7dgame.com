/**
 * Unit tests for:
 *   - src/api/v1/edu-student.ts
 *   - src/api/v1/edu-teacher.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// edu-student API
// ============================================================
describe("EduStudent API", () => {
  let request: ReturnType<typeof vi.fn>;
  let studentApi: typeof import("@/api/v1/edu-student");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    studentApi = await import("@/api/v1/edu-student");
  });

  describe("getStudents()", () => {
    it("calls GET /v1/edu-student", async () => {
      await studentApi.getStudents();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-student");
      expect(method).toBe("get");
    });

    it("omits StudentSearch when search is empty", async () => {
      await studentApi.getStudents("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("StudentSearch");
    });

    it("includes StudentSearch[name] when search provided", async () => {
      await studentApi.getStudents("-created_at", "alice");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("StudentSearch");
      expect(url).toContain("alice");
    });

    it("omits page when page === 1", async () => {
      await studentApi.getStudents("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await studentApi.getStudents("-created_at", "", 3);
      expect(request.mock.calls[0][0].url).toContain("page=3");
    });
  });

  describe("getStudent()", () => {
    it("calls GET /v1/edu-student/view?id={id}", async () => {
      await studentApi.getStudent(5);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-student/view?id=5",
          method: "get",
        })
      );
    });
  });

  describe("createStudent()", () => {
    it("calls POST /v1/edu-student", async () => {
      await studentApi.createStudent({ name: "Bob" } as Parameters<
        typeof studentApi.createStudent
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-student", method: "post" })
      );
    });
  });

  describe("deleteStudent()", () => {
    it("calls DELETE /v1/edu-student/{id}", async () => {
      await studentApi.deleteStudent(8);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-student/8",
          method: "delete",
        })
      );
    });
  });

  describe("updateStudent()", () => {
    it("calls PUT /v1/edu-student/{id}", async () => {
      await studentApi.updateStudent(4, { name: "Updated" } as Parameters<
        typeof studentApi.updateStudent
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-student/4", method: "put" })
      );
    });
  });

  describe("getMyStudentRecords()", () => {
    it("calls GET /v1/edu-student", async () => {
      await studentApi.getMyStudentRecords();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-student");
    });
  });

  describe("getStudentMe()", () => {
    it("calls GET /v1/edu-student/me", async () => {
      await studentApi.getStudentMe();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-student/me");
    });

    it("includes StudentSearch[name] when search is provided", async () => {
      await studentApi.getStudentMe("-created_at", "alice");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("StudentSearch");
      expect(url).toContain("alice");
    });

    it("includes page when page > 1", async () => {
      await studentApi.getStudentMe("-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });
  });

  describe("getMyStudentRecords() — page > 1", () => {
    it("includes page when page > 1", async () => {
      await studentApi.getMyStudentRecords("-created_at", 2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });
  });

  describe("joinClass()", () => {
    it("calls POST /v1/edu-student/join with class_id", async () => {
      await studentApi.joinClass({ class_id: 12 });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-student/join",
          method: "post",
          data: { class_id: 12 },
        })
      );
    });
  });
});

// ============================================================
// edu-teacher API
// ============================================================
describe("EduTeacher API", () => {
  let request: ReturnType<typeof vi.fn>;
  let teacherApi: typeof import("@/api/v1/edu-teacher");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    teacherApi = await import("@/api/v1/edu-teacher");
  });

  describe("getTeachers()", () => {
    it("calls GET /v1/edu-teacher", async () => {
      await teacherApi.getTeachers();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/edu-teacher");
      expect(method).toBe("get");
    });

    it("omits TeacherSearch when search is empty", async () => {
      await teacherApi.getTeachers("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("TeacherSearch");
    });

    it("includes TeacherSearch[name] when search provided", async () => {
      await teacherApi.getTeachers("-created_at", "Alice");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("TeacherSearch");
      expect(url).toContain("Alice");
    });

    it("omits page when page === 1", async () => {
      await teacherApi.getTeachers("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await teacherApi.getTeachers("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });
  });

  describe("getTeacher()", () => {
    it("calls GET /v1/edu-teacher/{id}", async () => {
      await teacherApi.getTeacher(3);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-teacher/3", method: "get" })
      );
    });
  });

  describe("getTeacherMe()", () => {
    it("calls GET /v1/edu-teacher/me", async () => {
      await teacherApi.getTeacherMe();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/edu-teacher/me");
    });

    it("includes TeacherSearch[subject] when search is provided", async () => {
      await teacherApi.getTeacherMe("-created_at", "math");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("TeacherSearch");
      expect(url).toContain("math");
    });

    it("includes page when page > 1", async () => {
      await teacherApi.getTeacherMe("-created_at", "", 4);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=4");
    });
  });

  describe("createTeacher()", () => {
    it("calls POST /v1/edu-teacher", async () => {
      await teacherApi.createTeacher({ name: "Prof X" } as Parameters<
        typeof teacherApi.createTeacher
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-teacher", method: "post" })
      );
    });
  });

  describe("deleteTeacher()", () => {
    it("calls DELETE /v1/edu-teacher/{id}", async () => {
      await teacherApi.deleteTeacher(6);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/edu-teacher/6",
          method: "delete",
        })
      );
    });
  });

  describe("updateTeacher()", () => {
    it("calls PUT /v1/edu-teacher/{id}", async () => {
      await teacherApi.updateTeacher(2, { name: "Updated" } as Parameters<
        typeof teacherApi.updateTeacher
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/edu-teacher/2", method: "put" })
      );
    });
  });
});
