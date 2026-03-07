import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-class round15 batch2", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/edu-class");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/edu-class");
  });

  it("getClasses uses default query", async () => {
    await api.getClasses();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-class?");
    expect(url).toContain("sort=-created_at");
    expect(url).toContain("expand=image%2CeduTeachers%2CeduStudents");
  });

  it("getClasses adds search school and page", async () => {
    await api.getClasses("name", "math", 2, "image", 8);
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("ClassSearch%5Bname%5D=math");
    expect(url).toContain("school_id=8");
    expect(url).toContain("page=2");
  });

  it("getClass omits expand when empty", async () => {
    await api.getClass(1, "");
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-class/1", method: "get" })
    );
  });

  it("getClass includes expand when provided", async () => {
    await api.getClass(1, "image");
    expect(request.mock.calls[0][0].url).toContain("expand=image");
  });

  it("create update delete class hit correct endpoints", async () => {
    await api.createClass({ name: "c" });
    await api.updateClass(2, { name: "u" });
    await api.deleteClass(3);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-class", method: "post" })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-class/2", method: "put" })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-class/3", method: "delete" })
    );
  });

  it("teacher and student class lists use dedicated endpoints", async () => {
    await api.getMyTeacherClasses("-created_at", 1, "image");
    await api.getMyStudentClasses("-created_at", 2, "image,school");
    expect(request.mock.calls[0][0].url).toContain("/v1/edu-class/teacher-me");
    expect(request.mock.calls[1][0].url).toContain("/v1/edu-class/by-student");
    expect(request.mock.calls[1][0].url).toContain("page=2");
  });

  it("apply and leave send class_id payload", async () => {
    await api.applyToClass(9);
    await api.leaveClass(9);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        url: "/v1/edu-class/apply",
        method: "post",
        data: { class_id: 9 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: "/v1/edu-class/leave",
        method: "post",
        data: { class_id: 9 },
      })
    );
  });

  it("group and teacher operations build correct urls", async () => {
    await api.getClassGroups(5, "-created_at", "g1", 2, "owner");
    await api.createClassGroup(5, { name: "g" });
    await api.addTeacherToClass(5, 10);
    await api.removeTeacherFromClass(5, 10);
    await api.getClassesByTeacher(10, "-created_at", 3, "image");
    expect(request.mock.calls[0][0].url).toContain("/v1/edu-class/5/groups");
    expect(request.mock.calls[0][0].url).toContain("GroupSearch%5Bname%5D=g1");
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-class/5/group", method: "post" })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        url: "/v1/edu-class/5/teacher",
        method: "post",
        data: { user_id: 10 },
      })
    );
    expect(request.mock.calls[3][0]).toEqual(
      expect.objectContaining({
        url: "/v1/edu-class/5/teacher",
        method: "delete",
        data: { user_id: 10 },
      })
    );
    expect(request.mock.calls[4][0].url).toContain("/v1/edu-class/by-teacher");
  });
});
