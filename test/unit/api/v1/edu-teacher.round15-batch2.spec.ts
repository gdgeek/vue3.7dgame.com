import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-teacher round15 batch2", () => {
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
