import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v1/meta", () => ({ postMeta: vi.fn(), putMeta: vi.fn() }));
vi.mock("@/api/v1/verse", () => ({ postVerse: vi.fn(), putVerse: vi.fn() }));
vi.mock("@/api/v1/meta-resource", () => ({ postMetaResource: vi.fn() }));
vi.mock("uuid", () => ({ v4: vi.fn(() => "uuid-fixed") }));

describe("api/v1/meta-verse", () => {
  let metaApi: typeof import("@/api/v1/meta");
  let verseApi: typeof import("@/api/v1/verse");
  let metaResourceApi: typeof import("@/api/v1/meta-resource");
  let api: typeof import("@/api/v1/meta-verse");

  const resource = {
    id: 2,
    name: "tree-model",
    image_id: 10,
    info: JSON.stringify({
      center: { x: 1, y: 2, z: 3 },
      size: { x: 4, y: 2, z: 8 },
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    metaApi = await import("@/api/v1/meta");
    verseApi = await import("@/api/v1/verse");
    metaResourceApi = await import("@/api/v1/meta-resource");
    api = await import("@/api/v1/meta-verse");

    (verseApi.postVerse as any).mockResolvedValue({ data: { id: 100 } });
    (metaApi.postMeta as any).mockResolvedValue({ data: { id: 200 } });
    (metaResourceApi.postMetaResource as any).mockResolvedValue({ data: {} });
    (verseApi.putVerse as any).mockResolvedValue({
      data: { id: 100, updated: true },
    });
    (metaApi.putMeta as any).mockResolvedValue({
      data: { id: 200, updated: true },
    });
  });

  it("resolves updated verse/meta", async () => {
    const result = await api.createVerseFromResource(
      "Polygen",
      "Demo",
      resource as any
    );
    expect(result).toEqual({
      verse: { id: 100, updated: true },
      meta: { id: 200, updated: true },
    });
  });

  it("creates verse with uuid/version/image", async () => {
    await api.createVerseFromResource("Polygen", "Demo", resource as any);
    const payload = (verseApi.postVerse as any).mock.calls[0][0];
    expect(payload.uuid).toBe("uuid-fixed");
    expect(payload.version).toBe(3);
    expect(payload.image_id).toBe(10);
  });

  it("creates meta from created verse", async () => {
    await api.createVerseFromResource("Polygen", "Demo", resource as any);
    expect(metaApi.postMeta).toHaveBeenCalledWith({
      title: "Polygen:tree-model",
      verse_id: 100,
      image_id: 10,
    });
  });

  it("links meta-resource relation", async () => {
    await api.createVerseFromResource("Polygen", "Demo", resource as any);
    expect(metaResourceApi.postMetaResource).toHaveBeenCalledWith({
      meta_id: 200,
      resource_id: 2,
      type: "model",
    });
  });

  it("updates verse with module meta_id", async () => {
    await api.createVerseFromResource("Polygen", "Demo", resource as any);
    const [, arg] = (verseApi.putVerse as any).mock.calls[0];
    const data = JSON.parse(arg.data);
    expect(data.type).toBe("Verse");
    expect(data.children.modules[0].parameters.meta_id).toBe(200);
    expect(data.children.modules[0].parameters.title).toBe("Polygen");
  });

  it("updates meta with transformed scale/position", async () => {
    await api.createVerseFromResource("Polygen", "Demo", resource as any);
    const [, arg] = (metaApi.putMeta as any).mock.calls[0];
    const data = JSON.parse(arg.data);
    const entity = data.children.entities[0];
    expect(entity.parameters.transform.scale).toEqual({
      x: 0.25,
      y: 0.25,
      z: 0.25,
    });
    expect(entity.parameters.transform.position).toEqual({
      x: -0.25,
      y: -0.5,
      z: -0.75,
    });
  });

  it("uses incoming entity type", async () => {
    await api.createVerseFromResource("Voxel", "Demo", resource as any);
    const [, arg] = (metaApi.putMeta as any).mock.calls[0];
    const data = JSON.parse(arg.data);
    expect(data.children.entities[0].type).toBe("Voxel");
  });

  it("rejects when initial verse creation fails", async () => {
    (verseApi.postVerse as any).mockRejectedValue(new Error("post verse fail"));
    await expect(
      api.createVerseFromResource("Polygen", "Demo", resource as any)
    ).rejects.toThrow("post verse fail");
  });

  it("rejects when meta update fails", async () => {
    (metaApi.putMeta as any).mockRejectedValue(new Error("put meta fail"));
    await expect(
      api.createVerseFromResource("Polygen", "Demo", resource as any)
    ).rejects.toThrow("put meta fail");
  });
});
