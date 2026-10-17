import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "@/utils/request";
import {
  getGlobalScenePropertyOptions,
  getSceneByProperty,
  getScenesByProperty,
} from "@/api/v1/scene-properties";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Global property scene query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(request).mockResolvedValue({ data: [] });
  });

  it("loads the dictionary without requiring an existing scene", async () => {
    await getGlobalScenePropertyOptions();
    expect(request).toHaveBeenCalledWith({
      url: "/v1/verses/global-property-options",
      method: "get",
      skipErrorMessage: true,
    });
  });

  it("sends global search and pagination in the native list format and preserves headers", async () => {
    const response = {
      data: [{ id: 7, author_id: 99 }],
      headers: { "x-pagination-total-count": "29" },
    };
    vi.mocked(request).mockResolvedValue(response);
    const actual = await getScenesByProperty(31, {
      search: "教育 & XR",
      sort: "-id",
      page: 2,
      perPage: 24,
      expand: "image,author",
      tags: [3, 4],
    });
    const config = vi.mocked(request).mock.calls[0][0];
    const url = new URL(config.url!, "http://localhost");
    expect(url.pathname).toBe("/v1/verses/by-property");
    expect(url.searchParams.get("propertyId")).toBe("31");
    expect(url.searchParams.get("VerseSearch[name]")).toBe("教育 & XR");
    expect(url.searchParams.get("per-page")).toBe("24");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("sort")).toBe("-id");
    expect(url.searchParams.get("expand")).toBe("image,author");
    expect(url.searchParams.get("tags")).toBe("3,4");
    expect(actual).toBe(response);
  });

  it.each(["image,author,tags,metas", "", "public,image,public"])(
    "uses the explicit property detail scope and always reads visibility for expand=%s",
    async (expand) => {
      await getSceneByProperty(683, 31, expand);
      const url = new URL(
        vi.mocked(request).mock.calls[0][0].url!,
        "http://localhost"
      );
      expect(url.pathname).toBe("/v1/verses/by-property/683");
      expect(url.searchParams.get("propertyId")).toBe("31");
      expect(
        url.searchParams
          .get("expand")
          ?.split(",")
          .filter((field) => field === "public")
      ).toHaveLength(1);
    }
  );
});
