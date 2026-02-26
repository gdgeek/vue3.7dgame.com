/**
 * Unit tests for smaller API modules:
 *   - src/api/v1/upload.ts
 *   - src/api/v1/files.ts
 *   - src/api/v1/person.ts
 *   - src/api/v1/multilanguage-verse.ts
 *   - src/api/v1/multilanguage-verses.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

// ============================================================
// upload API
// ============================================================
describe("Upload API", () => {
  let request: ReturnType<typeof vi.fn>;
  let uploadFile: typeof import("@/api/v1/upload").uploadFile;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    uploadFile = (await import("@/api/v1/upload")).uploadFile;
  });

  it("calls POST /v1/upload/file", async () => {
    await uploadFile({ name: "file.png" });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/upload/file", method: "post" })
    );
  });

  it("forwards data payload", async () => {
    const payload = { name: "photo.jpg", size: 1024 };
    await uploadFile(payload);
    expect(request.mock.calls[0][0].data).toEqual(payload);
  });

  it("calls logger.error with 'uploadFile' label", async () => {
    const { logger } = await import("@/utils/logger");
    await uploadFile("test-data");
    expect(logger.error).toHaveBeenCalledWith("uploadFile");
  });

  it("calls logger.error with the actual data", async () => {
    const { logger } = await import("@/utils/logger");
    const payload = { key: "value" };
    await uploadFile(payload);
    expect(logger.error).toHaveBeenCalledWith(payload);
  });
});

// ============================================================
// files API
// ============================================================
describe("Files API", () => {
  let request: ReturnType<typeof vi.fn>;
  let filesApi: typeof import("@/api/v1/files").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    filesApi = (await import("@/api/v1/files")).default;
  });

  it("calls POST /v1/files", async () => {
    await filesApi.post({ url: "https://example.com/a.png" } as Parameters<
      typeof filesApi.post
    >[0]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/files", method: "post" })
    );
  });

  it("sends the file data as body", async () => {
    const data = { url: "https://example.com/b.jpg", name: "img" } as Parameters<
      typeof filesApi.post
    >[0];
    await filesApi.post(data);
    expect(request.mock.calls[0][0].data).toEqual(data);
  });
});

// ============================================================
// person API
// ============================================================
describe("Person API", () => {
  let request: ReturnType<typeof vi.fn>;
  let personApi: typeof import("@/api/v1/person");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: [] });
    personApi = await import("@/api/v1/person");
  });

  describe("postPerson()", () => {
    it("calls POST /v1/people", async () => {
      await personApi.postPerson({ username: "alice" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/people", method: "post" })
      );
    });
  });

  describe("deletePerson()", () => {
    it("calls DELETE /v1/people/{id}", async () => {
      await personApi.deletePerson(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/people/7", method: "delete" })
      );
    });
  });

  describe("putPerson()", () => {
    it("calls PUT /v1/people/auth with id and auth", async () => {
      await personApi.putPerson({ id: 3, auth: "oauth2" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/people/auth",
          method: "put",
          data: { id: 3, auth: "oauth2" },
        })
      );
    });
  });

  describe("getPerson()", () => {
    it("calls GET /v1/people", async () => {
      await personApi.getPerson();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/people");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("omits PersonSearch when search is empty", async () => {
      await personApi.getPerson("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("PersonSearch");
    });

    it("includes PersonSearch[username] when search provided", async () => {
      await personApi.getPerson("-created_at", "alice");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("PersonSearch");
      expect(url).toContain("alice");
    });

    it("omits page when page === 1", async () => {
      await personApi.getPerson("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await personApi.getPerson("-created_at", "", 3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });
  });
});

// ============================================================
// multilanguage-verse API (single verse)
// ============================================================
describe("Multilanguage Verse API", () => {
  let request: ReturnType<typeof vi.fn>;
  let mlApi: typeof import("@/api/v1/multilanguage-verse");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    mlApi = await import("@/api/v1/multilanguage-verse");
  });

  it("postMultilanguageVerse calls POST /v1/multilanguage-verses", async () => {
    const data = {
      description: "test",
      language: "en-US",
      name: "Test",
      verse_id: 1,
    };
    await mlApi.postMultilanguageVerse(data);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses",
        method: "post",
        data,
      })
    );
  });

  it("getMultilanguageVerse calls GET /v1/multilanguage-verses/{id}", async () => {
    await mlApi.getMultilanguageVerse(5);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses/5",
        method: "get",
      })
    );
  });

  it("putMultilanguageVerse calls PUT /v1/multilanguage-verses/{id}", async () => {
    const data = { description: "updated", name: "Updated" };
    await mlApi.putMultilanguageVerse(3, data);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses/3",
        method: "put",
        data,
      })
    );
  });

  it("deleteMultilanguageVerse calls DELETE /v1/multilanguage-verses/{id}", async () => {
    await mlApi.deleteMultilanguageVerse(9);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses/9",
        method: "delete",
      })
    );
  });
});

// ============================================================
// multilanguage-verses API (verse language list)
// ============================================================
describe("Multilanguage Verses API", () => {
  let request: ReturnType<typeof vi.fn>;
  let mlvsApi: typeof import("@/api/v1/multilanguage-verses");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    mlvsApi = await import("@/api/v1/multilanguage-verses");
  });

  it("getlanguages calls GET /v1/verses/{id} with expand", async () => {
    await mlvsApi.getlanguages(10);
    const { url, method } = request.mock.calls[0][0];
    expect(url).toContain("/v1/verses/10");
    expect(url).toContain("expand=languages");
    expect(method).toBe("get");
  });

  it("postlanguages calls POST /v1/multilanguage-verses", async () => {
    const data = { name: "Scene EN", verse_id: 10 };
    await mlvsApi.postlanguages(data);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses",
        method: "post",
        data,
      })
    );
  });

  it("putlanguages calls PUT /v1/multilanguage-verses/{id}", async () => {
    const data = { name: "Updated", description: "desc" };
    await mlvsApi.putlanguages(4, data);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses/4",
        method: "put",
        data,
      })
    );
  });

  it("dellanguages calls DELETE /v1/multilanguage-verses/{id}", async () => {
    await mlvsApi.dellanguages(7);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/multilanguage-verses/7",
        method: "delete",
      })
    );
  });
});
