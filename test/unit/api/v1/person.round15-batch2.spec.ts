import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/person", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/person");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/person");
  });

  it("postPerson posts data", async () => {
    const data = { username: "u" };
    await api.postPerson(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/people", method: "post", data });
  });

  it("deletePerson deletes by id", async () => {
    await api.deletePerson(2);
    expect(request).toHaveBeenCalledWith({ url: "/v1/people/2", method: "delete" });
  });

  it("putPerson updates auth", async () => {
    const data = { id: 1, auth: "admin" };
    await api.putPerson(data);
    expect(request).toHaveBeenCalledWith({ url: "/v1/people/auth", method: "put", data });
  });

  it("getPerson includes default sort/expand", async () => {
    await api.getPerson();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/people?");
    expect(url).toContain("sort=-created_at");
    expect(url).toContain("expand=");
  });

  it("getPerson includes search conditionally", async () => {
    await api.getPerson("-created_at", "john");
    expect(request.mock.calls[0][0].url).toContain("PersonSearch%5Busername%5D=john");
  });

  it("getPerson omits search when empty", async () => {
    await api.getPerson("-created_at", "");
    expect(request.mock.calls[0][0].url).not.toContain("PersonSearch");
  });

  it("getPerson includes page when > 1", async () => {
    await api.getPerson("-created_at", "", 3);
    expect(request.mock.calls[0][0].url).toContain("page=3");
  });

  it("getPerson omits page when <= 1", async () => {
    await api.getPerson("-created_at", "", 1);
    expect(request.mock.calls[0][0].url).not.toContain("page=");
  });
});
