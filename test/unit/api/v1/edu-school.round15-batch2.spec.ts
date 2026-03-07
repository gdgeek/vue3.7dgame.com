import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/edu-school round15 batch2", () => {
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
