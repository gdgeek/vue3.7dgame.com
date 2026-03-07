/**
 * Unit tests for src/api/v1/scene-package.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@/store/modules/token", () => ({
  default: { getToken: vi.fn() },
}));
vi.mock("@/environment", () => ({
  default: { api: "https://api.example.com" },
}));

describe("getVerseExportJson()", () => {
  let request: ReturnType<typeof vi.fn>;
  let getVerseExportJson: typeof import("@/api/v1/scene-package").getVerseExportJson;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ getVerseExportJson } = await import("@/api/v1/scene-package"));
  });

  it("calls GET /v1/scene-package/verses/{id}/export", async () => {
    await getVerseExportJson(42);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/scene-package/verses/42/export",
        method: "get",
      })
    );
  });

  it("uses the verseId in the URL path", async () => {
    await getVerseExportJson(99);
    expect(request.mock.calls[0][0].url).toContain("/99/");
  });

  it("returns the request result", async () => {
    const mockResp = { data: { verse: {}, metas: [] } };
    request.mockResolvedValue(mockResp);
    const result = await getVerseExportJson(1);
    expect(result).toEqual(mockResp);
  });

  it("different IDs produce different URLs", async () => {
    await getVerseExportJson(1);
    const url1: string = request.mock.calls[0][0].url;
    vi.clearAllMocks();
    await getVerseExportJson(2);
    const url2: string = request.mock.calls[0][0].url;
    expect(url1).not.toBe(url2);
  });
});

describe("getVerseExportZip()", () => {
  let axiosGet: ReturnType<typeof vi.fn>;
  let token: { getToken: ReturnType<typeof vi.fn> };
  let getVerseExportZip: typeof import("@/api/v1/scene-package").getVerseExportZip;

  beforeEach(async () => {
    vi.clearAllMocks();
    axiosGet = (await import("axios")).default.get as ReturnType<typeof vi.fn>;
    axiosGet.mockResolvedValue({ data: new Blob() });
    token = (await import("@/store/modules/token")).default as never;
    ({ getVerseExportZip } = await import("@/api/v1/scene-package"));
  });

  it("calls axios.get with the export-zip URL", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(5);
    const url: string = axiosGet.mock.calls[0][0];
    expect(url).toContain("/v1/scene-package/verses/5/export-zip");
    expect(url).toContain("api.example.com");
  });

  it("sets responseType to 'blob'", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(5);
    expect(axiosGet.mock.calls[0][1].responseType).toBe("blob");
  });

  it("sets Authorization header with Bearer token when token is present", async () => {
    token.getToken.mockReturnValue({ accessToken: "my-access-token" });
    await getVerseExportZip(5);
    expect(axiosGet.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer my-access-token"
    );
  });

  it("sets empty Authorization when token is null", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(5);
    expect(axiosGet.mock.calls[0][1].headers.Authorization).toBe("");
  });

  it("sets Accept header to application/zip", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(5);
    expect(axiosGet.mock.calls[0][1].headers.Accept).toBe("application/zip");
  });

  it("sets timeout to 120000", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(7);
    expect(axiosGet.mock.calls[0][1].timeout).toBe(120000);
  });

  it("includes verseId in the URL for a different ID", async () => {
    token.getToken.mockReturnValue(null);
    await getVerseExportZip(123);
    const url: string = axiosGet.mock.calls[0][0];
    expect(url).toContain("/123/export-zip");
  });
});

describe("postVerseImportJson()", () => {
  let request: ReturnType<typeof vi.fn>;
  let postVerseImportJson: typeof import("@/api/v1/scene-package").postVerseImportJson;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ postVerseImportJson } = await import("@/api/v1/scene-package"));
  });

  it("calls POST /v1/scene-package/verses/import", async () => {
    await postVerseImportJson({ verse: {} as never, metas: [] });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/scene-package/verses/import",
        method: "post",
      })
    );
  });

  it("sends the payload as request data", async () => {
    const payload = { verse: { uuid: "abc" } as never, metas: [] };
    await postVerseImportJson(payload);
    expect(request.mock.calls[0][0].data).toEqual(payload);
  });

  it("returns the request result", async () => {
    const mockResp = { data: { id: 1 } };
    request.mockResolvedValue(mockResp);
    const result = await postVerseImportJson({ verse: {} as never, metas: [] });
    expect(result).toEqual(mockResp);
  });
});

describe("postVerseImportZip()", () => {
  let request: ReturnType<typeof vi.fn>;
  let postVerseImportZip: typeof import("@/api/v1/scene-package").postVerseImportZip;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ postVerseImportZip } = await import("@/api/v1/scene-package"));
  });

  it("calls POST /v1/scene-package/verses/import-zip", async () => {
    const file = new File(["data"], "scene.zip");
    await postVerseImportZip(file);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/scene-package/verses/import-zip",
        method: "post",
      })
    );
  });

  it("sends FormData containing the file", async () => {
    const file = new File(["data"], "scene.zip");
    await postVerseImportZip(file);
    const data = request.mock.calls[0][0].data;
    expect(data).toBeInstanceOf(FormData);
    expect(data.get("file")).toBe(file);
  });

  it("sets Content-Type to multipart/form-data", async () => {
    const file = new File(["data"], "scene.zip");
    await postVerseImportZip(file);
    expect(request.mock.calls[0][0].headers["Content-Type"]).toBe(
      "multipart/form-data"
    );
  });

  it("sets request timeout to 120000", async () => {
    const file = new File(["data"], "scene.zip");
    await postVerseImportZip(file);
    expect(request.mock.calls[0][0].timeout).toBe(120000);
  });

  it("returns the request result", async () => {
    const mockResp = { data: { id: 5 } };
    request.mockResolvedValue(mockResp);
    const file = new File(["data"], "scene.zip");
    const result = await postVerseImportZip(file);
    expect(result).toEqual(mockResp);
  });
});
