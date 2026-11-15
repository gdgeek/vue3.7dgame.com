import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "@/utils/request";
import { getOrganizationVerses, getOrganizationVerse } from "@/api/v1/verse";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("organization scenes API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the read-only organization list and retains pagination headers", async () => {
    const response = {
      data: [{ id: 7 }],
      headers: { "x-pagination-total-count": "31" },
    };
    vi.mocked(request).mockResolvedValue(response);
    expect(
      await getOrganizationVerses({
        search: "组织 & XR",
        page: 2,
        perPage: 24,
        sort: "-id",
        tags: [3],
        expand: "image,author,tags",
      })
    ).toBe(response);
    const options = vi.mocked(request).mock.calls[0][0];
    const url = new URL(options.url!, "http://localhost");
    expect(url.pathname).toBe("/v1/verses/organization");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      expand: "image,author,tags",
      sort: "-id",
      "VerseSearch[name]": "组织 & XR",
      page: "2",
      "per-page": "24",
      tags: "3",
    });
    expect(options.method).toBe("get");
    expect(options.data).toBeUndefined();
  });

  it("reads private scene information using the dedicated organization scope", async () => {
    await getOrganizationVerse(17);
    const options = vi.mocked(request).mock.calls[0][0];
    const url = new URL(options.url!, "http://localhost");
    expect(url.pathname).toBe("/v1/verses/organization/17");
    expect(url.searchParams.get("expand")).toBe("image,author,tags");
    expect(options.method).toBe("get");
  });
});
