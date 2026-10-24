import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "@/utils/request";
import {
  getAllVerse,
  getAllVerses,
  getVerses,
  type AllVersesParams,
} from "@/api/v1/verse";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

const requestedUrl = () =>
  new URL(vi.mocked(request).mock.calls[0][0].url!, "http://localhost");

describe("All scenes API query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(request).mockResolvedValue({ data: [] });
  });

  it("uses the explicit all-scenes route and preserves pagination headers", async () => {
    const response = {
      data: [{ id: 7, author_id: 99 }],
      headers: { "x-pagination-total-count": "29" },
    };
    vi.mocked(request).mockResolvedValue(response);

    expect(await getAllVerses({})).toBe(response);
    expect(requestedUrl().pathname).toBe("/v1/verses/all");
    expect(vi.mocked(request).mock.calls[0][0].method).toBe("get");
  });

  it("combines scene and author searches without changing either value", async () => {
    await getAllVerses({ search: "教育 & XR", authorSearch: "开发 极客+" });

    const url = requestedUrl();
    expect(url.searchParams.get("VerseSearch[name]")).toBe("教育 & XR");
    expect(url.searchParams.get("authorSearch")).toBe("开发 极客+");
  });

  it("sends filters with the existing pagination, expansion, tag and sort format", async () => {
    const params: AllVersesParams = {
      page: 2,
      perPage: 24,
      sort: "-id",
      expand: "image,author",
      tags: [3, 4],
      propertyId: 31,
      authorId: 99,
    };
    await getAllVerses(params);

    const url = requestedUrl();
    expect(Object.fromEntries(url.searchParams)).toEqual({
      expand: "image,author",
      sort: "-id",
      page: "2",
      "per-page": "24",
      tags: "3,4",
      authorId: "99",
      propertyId: "31",
    });
    expect(vi.mocked(request).mock.calls[0][0].data).toBeUndefined();
    expect(params.authorId).toBe(99);
  });

  it.each([true, false])(
    "preserves public=%s, including private-only filtering",
    async (isPublic) => {
      await getAllVerses({ public: isPublic });
      expect(requestedUrl().searchParams.get("public")).toBe(String(isPublic));
    }
  );

  it("omits unused filters and keeps the native first-page behavior", async () => {
    await getAllVerses({
      authorSearch: "",
      authorId: undefined,
      propertyId: undefined,
      public: undefined,
      page: 1,
      perPage: 0,
      tags: [],
    });

    const query = requestedUrl().searchParams;
    for (const key of [
      "authorSearch",
      "authorId",
      "propertyId",
      "public",
      "page",
      "per-page",
      "tags",
    ]) {
      expect(query.has(key)).toBe(false);
    }
  });

  it("leaves the existing personal list route and query behavior intact", async () => {
    await getVerses({ search: "我的场景", page: 3 });

    const url = requestedUrl();
    expect(url.pathname).toBe("/v1/verses");
    expect(url.searchParams.get("VerseSearch[name]")).toBe("我的场景");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.has("authorSearch")).toBe(false);
  });
});

describe("All scenes API detail contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(request).mockResolvedValue({ data: {} });
  });

  it("uses the all-scenes detail scope with default fields and visibility", async () => {
    const response = { data: { id: 683, public: false } };
    vi.mocked(request).mockResolvedValue(response);

    expect(await getAllVerse(683)).toBe(response);
    const url = requestedUrl();
    expect(url.pathname).toBe("/v1/verses/all/683");
    expect(url.searchParams.get("expand")).toBe("metas,share,public");
    expect(url.searchParams.get("cl")).toBe("lua");
    expect(vi.mocked(request).mock.calls[0][0].method).toBe("get");
  });

  it.each([
    ["image,author,tags,metas", ["image", "author", "tags", "metas", "public"]],
    ["", ["public"]],
    [" image, public,public, author ", ["image", "public", "author"]],
  ])(
    "preserves custom expansion and includes visibility once for expand=%s",
    async (expand, fields) => {
      await getAllVerse(683, expand as string);
      expect(requestedUrl().searchParams.get("expand")?.split(",")).toEqual(
        fields
      );
    }
  );
});
