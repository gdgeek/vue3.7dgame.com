import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/multilanguage-verse", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/multilanguage-verse");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: { ok: true } });
    api = await import("@/api/v1/multilanguage-verse");
  });

  it("postMultilanguageVerse posts to collection", async () => {
    const data = { description: "d", language: "en", name: "n", verse_id: 1 };
    await api.postMultilanguageVerse(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/multilanguage-verses",
      method: "post",
      data,
    });
  });

  it("postMultilanguageVerse returns request result", async () => {
    const resp = { data: { id: 1 } };
    request.mockResolvedValue(resp);
    await expect(api.postMultilanguageVerse({ description: "d", language: "en", name: "n", verse_id: 1 })).resolves.toEqual(resp);
  });

  it("getMultilanguageVerse requests by id", async () => {
    await api.getMultilanguageVerse(3);
    expect(request).toHaveBeenCalledWith({ url: "/v1/multilanguage-verses/3", method: "get" });
  });

  it("getMultilanguageVerse propagates rejection", async () => {
    request.mockRejectedValue(new Error("load fail"));
    await expect(api.getMultilanguageVerse(3)).rejects.toThrow("load fail");
  });

  it("putMultilanguageVerse sends put payload", async () => {
    const data = { name: "n2", description: "d2" };
    await api.putMultilanguageVerse(4, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/multilanguage-verses/4",
      method: "put",
      data,
    });
  });

  it("putMultilanguageVerse returns request result", async () => {
    const resp = { data: { id: 4, name: "n2" } };
    request.mockResolvedValue(resp);
    await expect(api.putMultilanguageVerse(4, { name: "n2", description: "d2" })).resolves.toEqual(resp);
  });

  it("deleteMultilanguageVerse sends delete", async () => {
    await api.deleteMultilanguageVerse(5);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/multilanguage-verses/5",
      method: "delete",
    });
  });

  it("deleteMultilanguageVerse returns request result", async () => {
    const resp = { data: null };
    request.mockResolvedValue(resp);
    await expect(api.deleteMultilanguageVerse(5)).resolves.toEqual(resp);
  });
});
