/**
 * Unit tests for:
 *   - src/api/v1/meta-resource.ts  (CRUD + conditional query logic)
 *   - src/api/v1/phototype.ts      (CRUD + expand query logic)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// meta-resource API
// ============================================================
describe("MetaResource API", () => {
  let request: ReturnType<typeof vi.fn>;
  let metaResourceApi: typeof import("@/api/v1/meta-resource");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    metaResourceApi = await import("@/api/v1/meta-resource");
  });

  describe("postMetaResource()", () => {
    it("calls POST /v1/meta-resources", async () => {
      await metaResourceApi.postMetaResource({ meta_id: 1, resource_id: 2 } as Parameters<
        typeof metaResourceApi.postMetaResource
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/meta-resources", method: "post" })
      );
    });
  });

  describe("getMetaResources()", () => {
    it("calls GET /v1/meta-resources/resources", async () => {
      await metaResourceApi.getMetaResources(5, "model");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/meta-resources/resources");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes meta_id and type in query", async () => {
      await metaResourceApi.getMetaResources(42, "texture");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("meta_id=42");
      expect(url).toContain("type=texture");
    });

    it("omits ResourceSearch when search is empty", async () => {
      await metaResourceApi.getMetaResources(1, "model", "-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ResourceSearch");
    });

    it("includes ResourceSearch[name] when search provided", async () => {
      await metaResourceApi.getMetaResources(1, "model", "-created_at", "robot");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("ResourceSearch");
      expect(url).toContain("robot");
    });

    it("omits page when page <= 1", async () => {
      await metaResourceApi.getMetaResources(1, "model", "-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await metaResourceApi.getMetaResources(1, "model", "-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("includes sort in query", async () => {
      await metaResourceApi.getMetaResources(1, "model", "-updated_at");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=-updated_at");
    });
  });

  describe("putMetaResource()", () => {
    it("calls PUT /v1/meta-resources/{id}", async () => {
      await metaResourceApi.putMetaResource(7, { name: "updated" } as Parameters<
        typeof metaResourceApi.putMetaResource
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/meta-resources/7",
          method: "put",
        })
      );
    });

    it("accepts string id", async () => {
      await metaResourceApi.putMetaResource("abc", {} as Parameters<
        typeof metaResourceApi.putMetaResource
      >[1]);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/meta-resources/abc");
    });
  });

  describe("deleteMetaResource()", () => {
    it("calls DELETE /v1/meta-resources/{id}", async () => {
      await metaResourceApi.deleteMetaResource(4);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/meta-resources/4",
          method: "delete",
        })
      );
    });

    it("accepts string id", async () => {
      await metaResourceApi.deleteMetaResource("xyz");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/meta-resources/xyz");
    });
  });
});

// ============================================================
// phototype API
// ============================================================
describe("Phototype API", () => {
  let request: ReturnType<typeof vi.fn>;
  let phApi: typeof import("@/api/v1/phototype");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    phApi = await import("@/api/v1/phototype");
  });

  describe("postPhototype()", () => {
    it("calls POST /v1/phototypes", async () => {
      await phApi.postPhototype({ title: "New" } as Parameters<
        typeof phApi.postPhototype
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/phototypes", method: "post" })
      );
    });
  });

  describe("getPhototype()", () => {
    it("calls GET /v1/phototypes/{id}", async () => {
      await phApi.getPhototype(3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/phototypes/3");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes default expand in query", async () => {
      await phApi.getPhototype(3, "resource,image");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=");
    });

    it("omits expand when empty string provided", async () => {
      await phApi.getPhototype(3, "");
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("expand=");
    });
  });

  describe("getPhototypes()", () => {
    it("calls GET /v1/phototypes", async () => {
      await phApi.getPhototypes();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/phototypes");
    });

    it("omits PhototypeSearch when search is empty", async () => {
      await phApi.getPhototypes("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("PhototypeSearch");
    });

    it("includes PhototypeSearch[title] when search provided", async () => {
      await phApi.getPhototypes("-created_at", "castle");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("PhototypeSearch");
      expect(url).toContain("castle");
    });

    it("omits page when page <= 1", async () => {
      await phApi.getPhototypes("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await phApi.getPhototypes("-created_at", "", 5);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=5");
    });
  });

  describe("putPhototype()", () => {
    it("calls PUT /v1/phototypes/{id}", async () => {
      await phApi.putPhototype(6, { title: "Updated" } as Parameters<
        typeof phApi.putPhototype
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/v1/phototypes/6"),
          method: "put",
        })
      );
    });

    it("includes expand in URL", async () => {
      await phApi.putPhototype(6, { title: "t" } as Parameters<
        typeof phApi.putPhototype
      >[1], "resource,image");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=");
    });
  });

  describe("deletePhototype()", () => {
    it("calls DELETE /v1/phototypes/{id}", async () => {
      await phApi.deletePhototype(9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/phototypes/9",
          method: "delete",
        })
      );
    });

    it("accepts string id", async () => {
      await phApi.deletePhototype("abc");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/phototypes/abc");
    });
  });
});
