import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-student round15 batch2", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/edu-student");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
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
    expect(request).toHaveBeenCalledWith({ url: "/v1/edu-student/view?id=12", method: "get" });
  });

  it("createStudent posts payload", async () => {
    const data = { user_id: 1 } as Parameters<typeof api.createStudent>[0];
    await api.createStudent(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/edu-student", method: "post", data });
  });

  it("updateStudent uses PUT with id", async () => {
    const data = { note: "n" } as Parameters<typeof api.updateStudent>[1];
    await api.updateStudent(2, data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/edu-student/2", method: "put", data });
  });

  it("deleteStudent uses DELETE with id", async () => {
    await api.deleteStudent(3);
    expect(request).toHaveBeenCalledWith({ url: "/v1/edu-student/3", method: "delete" });
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
      expect.objectContaining({ url: "/v1/edu-student/join", method: "post", data: { class_id: 5 } })
    );
  });
});
