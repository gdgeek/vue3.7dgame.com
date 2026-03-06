/**
 * group2.spec.ts
 *
 * Covers uncovered lines not reached by group.spec.ts and
 * meta-resource-phototype.spec.ts:
 *   - src/api/v1/group.ts lines 121-125: getGroupOptions()
 *   - src/api/v1/phototype.ts lines 43,45-46: sort="title" and sort="-title" branches
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("group2 — getGroupOptions (lines 121-125)", () => {
  let request: ReturnType<typeof vi.fn>;
  let groupApi: typeof import("@/api/v1/group");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    groupApi = await import("@/api/v1/group");
  });

  it("calls OPTIONS /v1/group", async () => {
    await groupApi.getGroupOptions();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/group", method: "options" })
    );
  });

  it("returns the request result", async () => {
    const mockResp = { data: { Allow: "GET,POST,OPTIONS" } };
    request.mockResolvedValue(mockResp);
    const result = await groupApi.getGroupOptions();
    expect(result).toEqual(mockResp);
  });

  it("only sends url and method (no extra params)", async () => {
    await groupApi.getGroupOptions();
    const call = request.mock.calls[0][0];
    expect(call.url).toBe("/v1/group");
    expect(call.method).toBe("options");
  });

  it("rejects when request fails", async () => {
    request.mockRejectedValue(new Error("network error"));
    await expect(groupApi.getGroupOptions()).rejects.toThrow("network error");
  });
});

describe("phototype — sort='title' and sort='-title' branches (lines 43,45-46)", () => {
  let request: ReturnType<typeof vi.fn>;
  let phApi: typeof import("@/api/v1/phototype");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: [] });
    phApi = await import("@/api/v1/phototype");
  });

  it("sort='title' includes sort=title in the URL (line 43)", async () => {
    await phApi.getPhototypes("title");
    const call = request.mock.calls[0][0];
    const url: string = call.url || "";
    expect(url).toContain("sort=title");
  });

  it("sort='-title' includes sort=-title in the URL (lines 45-46)", async () => {
    await phApi.getPhototypes("-title");
    const call = request.mock.calls[0][0];
    const url: string = call.url || "";
    expect(url).toContain("sort=-title");
  });

  it("sort='title' with page=2 includes page=2 in URL", async () => {
    await phApi.getPhototypes("title", "castle", 2);
    const call = request.mock.calls[0][0];
    const url: string = call.url || "";
    expect(url).toContain("page=2");
    expect(url).toContain("sort=title");
  });

  it("sort='-title' with search includes search term in URL", async () => {
    await phApi.getPhototypes("-title", "dragon");
    const call = request.mock.calls[0][0];
    const url: string = call.url || "";
    expect(url).toContain("sort=-title");
    expect(url).toContain("dragon");
  });

  it("sort='title' returns the request result", async () => {
    const mockResp = { data: [{ id: 1, title: "Test" }] };
    request.mockResolvedValue(mockResp);
    const result = await phApi.getPhototypes("title");
    expect(result).toEqual(mockResp);
  });

  it("sort='-title' returns the request result", async () => {
    const mockResp = { data: [{ id: 2, title: "Zed" }] };
    request.mockResolvedValue(mockResp);
    const result = await phApi.getPhototypes("-title");
    expect(result).toEqual(mockResp);
  });
});
