import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: vi.fn(() => "uuid-xyz") }));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) =>
    url.startsWith("http://") ? url.replace("http://", "https://") : url
  ),
}));

describe("api/v1/resources/index", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/resources/index");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/resources/index");
  });

  it("getResources includes type/sort/expand", async () => {
    await api.getResources("voxel", "-created_at", "", 0, "image,author");
    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("get");
    expect(cfg.url).toContain("/v1/resources?");
    expect(cfg.url).toContain("type=voxel");
    expect(cfg.url).toContain("sort=-created_at");
    expect(cfg.url).toContain("expand=image%2Cauthor");
  });

  it("getResources includes search and page conditions", async () => {
    await api.getResources("picture", "-created_at", "cat", 2);
    const url = request.mock.calls[0][0].url;
    expect(url).toContain("ResourceSearch%5Bname%5D=cat");
    expect(url).toContain("page=2");
  });

  it("typed list getters call proper type", async () => {
    await api.getVoxels();
    expect(request.mock.calls[0][0].url).toContain("type=voxel");
    await api.getPolygens();
    expect(request.mock.calls[1][0].url).toContain("type=polygen");
    await api.getPictures();
    expect(request.mock.calls[2][0].url).toContain("type=picture");
  });

  it("post helpers inject type and uuid", async () => {
    await api.postVideo({ name: "clip" });
    const payload = request.mock.calls[0][0].data;
    expect(payload.type).toBe("video");
    expect(payload.uuid).toBe("uuid-xyz");
  });

  it("put helper targets /v1/resources/:id", async () => {
    const data = { name: "updated" };
    await api.putAudio(12, data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/resources/12",
      method: "put",
      data,
    });
  });

  it("delete helper targets /v1/resources/:id", async () => {
    await api.deleteParticle("p9");
    expect(request).toHaveBeenCalledWith({
      url: "/v1/resources/p9",
      method: "delete",
    });
  });

  it("getPolygen rewrites file url to https", async () => {
    request.mockResolvedValue({ data: { file: { url: "http://cdn/a.glb" } } });
    const result = (await api.getPolygen(1)) as any;
    expect(result.data.file.url).toBe("https://cdn/a.glb");
  });

  it("getPicture keeps url when file missing", async () => {
    request.mockResolvedValue({ data: { id: 1 } });
    const result = (await api.getPicture(1)) as any;
    expect(result.data).toEqual({ id: 1 });
  });

  it("getAudio passes type and custom expand", async () => {
    await api.getAudio(88, "file,author");
    const cfg = request.mock.calls[0][0];
    expect(cfg.url).toContain("/v1/resources/88?");
    expect(cfg.url).toContain("type=audio");
    expect(cfg.url).toContain("expand=file%2Cauthor");
  });

  it("resource getter propagates request rejection", async () => {
    request.mockRejectedValue(new Error("network"));
    await expect(api.getVoxel(9)).rejects.toThrow("network");
  });
});
/**
 * Unit tests for src/api/v1/resources/model.ts
 * Covers: Author, ResourceInfo, VoxelInfo, ApiResponse type shapes
 */
import type {
  Author,
  ResourceInfo,
  VoxelInfo,
  ApiResponse,
} from "@/api/v1/resources/model";

// ── Helper factories ──────────────────────────────────────────────────────────

function makeAuthor(overrides: Partial<Author> = {}): Author {
  return {
    id: 1,
    nickname: "Alice",
    email: "alice@example.com",
    username: "alice",
    ...overrides,
  };
}

function makeFileType() {
  return {
    id: 10,
    md5: "abc123",
    type: "glb",
    url: "https://cdn.example.com/model.glb",
    filename: "model.glb",
    size: 204800,
    key: "models/model.glb",
  };
}

function makeResourceInfo(overrides: Partial<ResourceInfo> = {}): ResourceInfo {
  return {
    id: 42,
    uuid: "uuid-0001",
    type: "polygen",
    file: makeFileType(),
    created_at: "2024-01-01T00:00:00Z",
    info: "{}",
    ...overrides,
  };
}

// ── Author ────────────────────────────────────────────────────────────────────

describe("Author type", () => {
  it("holds required string fields", () => {
    const a = makeAuthor();
    expect(a.id).toBe(1);
    expect(a.nickname).toBe("Alice");
    expect(a.username).toBe("alice");
  });

  it("email can be a string", () => {
    const a = makeAuthor({ email: "test@test.com" });
    expect(a.email).toBe("test@test.com");
  });

  it("email can be null", () => {
    const a = makeAuthor({ email: null });
    expect(a.email).toBeNull();
  });

  it("id is a number", () => {
    const a = makeAuthor({ id: 999 });
    expect(typeof a.id).toBe("number");
  });

  it("nickname is a string", () => {
    const a = makeAuthor({ nickname: "Bob" });
    expect(typeof a.nickname).toBe("string");
  });
});

// ── ResourceInfo ──────────────────────────────────────────────────────────────

describe("ResourceInfo type", () => {
  it("holds required fields: id, uuid, type, file, created_at, info", () => {
    const r = makeResourceInfo();
    expect(r.id).toBe(42);
    expect(r.uuid).toBe("uuid-0001");
    expect(r.type).toBe("polygen");
    expect(r.file).toBeDefined();
    expect(r.created_at).toBe("2024-01-01T00:00:00Z");
    expect(r.info).toBe("{}");
  });

  it("name is optional — can be omitted", () => {
    const r = makeResourceInfo();
    expect(r.name).toBeUndefined();
  });

  it("name can be set to a string", () => {
    const r = makeResourceInfo({ name: "My Model" });
    expect(r.name).toBe("My Model");
  });

  it("image_id is optional — can be a number", () => {
    const r = makeResourceInfo({ image_id: 7 });
    expect(r.image_id).toBe(7);
  });

  it("image is optional — can be a FileType object", () => {
    const img = makeFileType();
    const r = makeResourceInfo({ image: img });
    expect(r.image).toBe(img);
  });

  it("updated_at is optional — can be a string", () => {
    const r = makeResourceInfo({ updated_at: "2024-06-01T00:00:00Z" });
    expect(r.updated_at).toBe("2024-06-01T00:00:00Z");
  });

  it("author is optional — can be an Author object", () => {
    const author = makeAuthor();
    const r = makeResourceInfo({ author });
    expect(r.author).toBe(author);
    expect(r.author?.nickname).toBe("Alice");
  });

  it("file URL is accessible via file.url", () => {
    const r = makeResourceInfo();
    expect(r.file.url).toBe("https://cdn.example.com/model.glb");
  });
});

// ── VoxelInfo ─────────────────────────────────────────────────────────────────

describe("VoxelInfo type", () => {
  it("is compatible with an empty object", () => {
    const v: VoxelInfo = {};
    expect(v).toEqual({});
  });
});

// ── ApiResponse ───────────────────────────────────────────────────────────────

describe("ApiResponse<T> type", () => {
  it("wraps a ResourceInfo in .data", () => {
    const r = makeResourceInfo();
    const resp: ApiResponse<ResourceInfo> = { data: r };
    expect(resp.data.id).toBe(42);
  });

  it("wraps an array of ResourceInfo in .data", () => {
    const r1 = makeResourceInfo({ id: 1 });
    const r2 = makeResourceInfo({ id: 2 });
    const resp: ApiResponse<ResourceInfo[]> = { data: [r1, r2] };
    expect(resp.data).toHaveLength(2);
    expect(resp.data[0].id).toBe(1);
    expect(resp.data[1].id).toBe(2);
  });

  it("wraps a primitive in .data", () => {
    const resp: ApiResponse<string> = { data: "hello" };
    expect(resp.data).toBe("hello");
  });

  it("wraps null in .data", () => {
    const resp: ApiResponse<null> = { data: null };
    expect(resp.data).toBeNull();
  });
});
