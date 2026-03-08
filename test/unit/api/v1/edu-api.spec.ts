import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-school", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/edu-school");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/edu-school");
  });

  it("getSchools includes default query", async () => {
    await api.getSchools();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-school?");
    expect(url).toContain("sort=-created_at");
    expect(url).toContain("expand=image%2Cprincipal");
  });

  it("getSchools includes search and page", async () => {
    await api.getSchools("name", "foo", 3, "image");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("search=foo");
    expect(url).toContain("page=3");
  });

  it("getSchool default expand included", async () => {
    await api.getSchool(7);
    expect(request.mock.calls[0][0].url).toContain(
      "/v1/edu-school/7?expand=image%2Cprincipal"
    );
  });

  it("getSchool omits expand when empty", async () => {
    await api.getSchool(7, "");
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/edu-school/7", method: "get" })
    );
  });

  it("createSchool posts payload", async () => {
    const data = { name: "s" } as Parameters<typeof api.createSchool>[0];
    await api.createSchool(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-school",
      method: "post",
      data,
    });
  });

  it("updateSchool puts payload", async () => {
    const data = { name: "s2" } as Parameters<typeof api.updateSchool>[1];
    await api.updateSchool(5, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-school/5",
      method: "put",
      data,
    });
  });

  it("deleteSchool hits delete endpoint", async () => {
    await api.deleteSchool(9);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-school/9",
      method: "delete",
    });
  });

  it("getPrincipalSchools uses principal endpoint", async () => {
    await api.getPrincipalSchools("-created_at", "bar", 2, "image");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-school/principal?");
    expect(url).toContain("search=bar");
    expect(url).toContain("page=2");
  });
});

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-class", () => {
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

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-teacher", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/edu-teacher");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/edu-teacher");
  });

  it("getTeachers default query", async () => {
    await api.getTeachers();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-teacher?");
    expect(url).toContain("sort=-created_at");
  });

  it("getTeachers includes search and page", async () => {
    await api.getTeachers("name", "alice", 2, "school");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("TeacherSearch%5Bname%5D=alice");
    expect(url).toContain("page=2");
    expect(url).toContain("expand=school");
  });

  it("getTeacher uses id endpoint", async () => {
    await api.getTeacher(12);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-teacher/12",
      method: "get",
    });
  });

  it("getTeacherMe uses /me and subject search", async () => {
    await api.getTeacherMe("-created_at", "physics", 3, "class,school");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-teacher/me?");
    expect(url).toContain("TeacherSearch%5Bsubject%5D=physics");
    expect(url).toContain("page=3");
  });

  it("createTeacher posts payload", async () => {
    const data = { user_id: 1 } as Parameters<typeof api.createTeacher>[0];
    await api.createTeacher(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-teacher",
      method: "post",
      data,
    });
  });

  it("updateTeacher puts payload", async () => {
    const data = { title: "Senior" } as Parameters<typeof api.updateTeacher>[1];
    await api.updateTeacher(8, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-teacher/8",
      method: "put",
      data,
    });
  });

  it("deleteTeacher calls delete endpoint", async () => {
    await api.deleteTeacher(9);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-teacher/9",
      method: "delete",
    });
  });

  it("search omitted when empty", async () => {
    await api.getTeacherMe("-created_at", "", 1, "class");
    expect(request.mock.calls[0][0].url).not.toContain(
      "TeacherSearch%5Bsubject%5D"
    );
  });
});

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-student", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/edu-student");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/edu-student");
  });

  it("getStudents default query", async () => {
    await api.getStudents();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-student?");
    expect(url).toContain("sort=-created_at");
  });

  it("getStudents includes search and page", async () => {
    await api.getStudents("name", "tom", 2, "class");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("StudentSearch%5Bname%5D=tom");
    expect(url).toContain("page=2");
    expect(url).toContain("expand=class");
  });

  it("getStudent uses view query endpoint", async () => {
    await api.getStudent(12);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-student/view?id=12",
      method: "get",
    });
  });

  it("createStudent posts payload", async () => {
    const data = { user_id: 1 } as Parameters<typeof api.createStudent>[0];
    await api.createStudent(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-student",
      method: "post",
      data,
    });
  });

  it("updateStudent uses PUT with id", async () => {
    const data = { note: "n" } as Parameters<typeof api.updateStudent>[1];
    await api.updateStudent(2, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-student/2",
      method: "put",
      data,
    });
  });

  it("deleteStudent uses DELETE with id", async () => {
    await api.deleteStudent(3);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/edu-student/3",
      method: "delete",
    });
  });

  it("getStudentMe hits /me endpoint", async () => {
    await api.getStudentMe("-created_at", "eng", 3, "class,school");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/edu-student/me?");
    expect(url).toContain("StudentSearch%5Bname%5D=eng");
    expect(url).toContain("page=3");
  });

  it("getMyStudentRecords and joinClass behave correctly", async () => {
    await api.getMyStudentRecords("-created_at", 2, "image,school");
    await api.joinClass({ class_id: 5 });
    expect(request.mock.calls[0][0].url).toContain("/v1/edu-student?");
    expect(request.mock.calls[0][0].url).toContain("page=2");
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: "/v1/edu-student/join",
        method: "post",
        data: { class_id: 5 },
      })
    );
  });
});
