import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/group", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/group");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/group");
  });

  it("getGroups default query has sort and expand", async () => {
    await api.getGroups();
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/group?");
    expect(url).toContain("sort=-created_at");
    expect(url).toContain("expand=image%2Cuser");
  });

  it("getGroups supports search, page and per-page", async () => {
    await api.getGroups("name", "team", 2, 30, "image", { status: "active" });
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("GroupSearch%5Bname%5D=team");
    expect(url).toContain("page=2");
    expect(url).toContain("per-page=30");
    expect(url).toContain("status=active");
  });

  it("getGroup includes expand", async () => {
    await api.getGroup(9, "image");
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: "get",
        url: "/v1/group/9?expand=image",
      })
    );
  });

  it("create update patch delete use CRUD endpoints", async () => {
    await api.createGroup({ name: "g" } as Parameters<
      typeof api.createGroup
    >[0]);
    await api.updateGroup(1, { name: "u" } as Parameters<
      typeof api.updateGroup
    >[1]);
    await api.patchGroup(2, { description: "p" });
    await api.deleteGroup(3);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/group", method: "post" })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/1", method: "put" })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/2", method: "patch" })
    );
    expect(request.mock.calls[3][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/3", method: "delete" })
    );
  });

  it("options join leave call action endpoints", async () => {
    await api.getGroupOptions();
    await api.joinGroup(7);
    await api.leaveGroup(7);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/group", method: "options" })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/7/join", method: "post" })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/7/leave", method: "post" })
    );
  });

  it("createGroupVerse posts nested endpoint", async () => {
    await api.createGroupVerse(8, { title: "v" } as Parameters<
      typeof api.createGroupVerse
    >[1]);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/group/8/verse", method: "post" })
    );
  });

  it("getGroupVerses supports page per-page search", async () => {
    await api.getGroupVerses(5, "-created_at", 3, 50, "verse.image", "robot");
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("/v1/group/5/verses?");
    expect(url).toContain("page=3");
    expect(url).toContain("per-page=50");
    expect(url).toContain("search=robot");
  });

  it("deleteGroupVerse uses nested delete endpoint", async () => {
    await api.deleteGroupVerse(2, 99);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/group/2/verse/99",
      method: "delete",
    });
  });
});
