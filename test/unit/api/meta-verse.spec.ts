/**
 * Unit tests for src/api/v1/meta-verse.ts
 * Covers: createVerseFromResource — orchestration, data transforms, error propagation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/v1/meta", () => ({
  postMeta: vi.fn(),
  putMeta: vi.fn(),
}));
vi.mock("@/api/v1/verse", () => ({
  postVerse: vi.fn(),
  putVerse: vi.fn(),
}));
vi.mock("@/api/v1/meta-resource", () => ({
  postMetaResource: vi.fn(),
}));
vi.mock("uuid", () => ({ v4: () => "uuid-test-1234" }));

describe("createVerseFromResource()", () => {
  let metaApi: typeof import("@/api/v1/meta");
  let verseApi: typeof import("@/api/v1/verse");
  let metaResourceApi: typeof import("@/api/v1/meta-resource");
  let metaVerseApi: typeof import("@/api/v1/meta-verse");

  const mockResource = {
    id: 10,
    name: "my-model",
    image_id: 20,
    info: JSON.stringify({
      center: { x: 1, y: 2, z: 3 },
      size: { x: 4, y: 2, z: 4 },
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    metaApi = await import("@/api/v1/meta");
    verseApi = await import("@/api/v1/verse");
    metaResourceApi = await import("@/api/v1/meta-resource");
    metaVerseApi = await import("@/api/v1/meta-verse");

    (verseApi.postVerse as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 100 },
    });
    (metaApi.postMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 200 },
    });
    (metaResourceApi.postMetaResource as ReturnType<typeof vi.fn>).mockResolvedValue(
      { data: {} }
    );
    (verseApi.putVerse as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 100, updated: true },
    });
    (metaApi.putMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 200, updated: true },
    });
  });

  it("resolves with the updated verse and meta objects", async () => {
    const result = await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    expect(result.verse).toEqual({ id: 100, updated: true });
    expect(result.meta).toEqual({ id: 200, updated: true });
  });

  it("calls postVerse with name, uuid, version=3, image_id", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const arg = (verseApi.postVerse as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(arg.name).toBe("Test Scene");
    expect(arg.uuid).toBe("uuid-test-1234");
    expect(arg.version).toBe(3);
    expect(arg.image_id).toBe(20);
  });

  it("postVerse description references resource name", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const arg = (verseApi.postVerse as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(arg.description).toContain("my-model");
  });

  it("calls postMeta with verse_id from postVerse response", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const arg = (metaApi.postMeta as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.verse_id).toBe(100);
    expect(arg.image_id).toBe(20);
  });

  it("postMeta title includes type and resource name", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const arg = (metaApi.postMeta as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.title).toBe("Polygen:my-model");
  });

  it("calls postMetaResource with meta_id, resource_id, type='model'", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const arg = (metaResourceApi.postMetaResource as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(arg.meta_id).toBe(200);
    expect(arg.resource_id).toBe(10);
    expect(arg.type).toBe("model");
  });

  it("calls putVerse with verse id and stringified JSON data", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const callArgs = (verseApi.putVerse as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[0]).toBe(100);
    const data = JSON.parse(callArgs[1].data);
    expect(data.type).toBe("Verse");
  });

  it("putVerse data contains meta_id from postMeta response", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const callArgs = (verseApi.putVerse as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const data = JSON.parse(callArgs[1].data);
    expect(data.children.modules[0].parameters.meta_id).toBe(200);
  });

  it("putVerse module type matches the type argument", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const data = JSON.parse(
      (verseApi.putVerse as ReturnType<typeof vi.fn>).mock.calls[0][1].data
    );
    expect(data.children.modules[0].parameters.title).toBe("Polygen");
  });

  it("calls putMeta with correct meta id", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const callArgs = (metaApi.putMeta as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[0]).toBe(200);
  });

  it("putMeta data has correct scale: r = 0.5 / size.y", async () => {
    // size.y = 2 → r = 0.5/2 = 0.25
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const data = JSON.parse(
      (metaApi.putMeta as ReturnType<typeof vi.fn>).mock.calls[0][1].data
    );
    const entity = data.children.entities[0];
    expect(entity.parameters.transform.scale).toEqual({
      x: 0.25,
      y: 0.25,
      z: 0.25,
    });
  });

  it("putMeta data has correct position: -center * r", async () => {
    // center={x:1,y:2,z:3}, r=0.25 → position={x:-0.25,y:-0.5,z:-0.75}
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const data = JSON.parse(
      (metaApi.putMeta as ReturnType<typeof vi.fn>).mock.calls[0][1].data
    );
    const entity = data.children.entities[0];
    expect(entity.parameters.transform.position).toEqual({
      x: -0.25,
      y: -0.5,
      z: -0.75,
    });
  });

  it("putMeta entity type matches type argument", async () => {
    await metaVerseApi.createVerseFromResource(
      "Voxel",
      "Voxel Scene",
      mockResource
    );
    const data = JSON.parse(
      (metaApi.putMeta as ReturnType<typeof vi.fn>).mock.calls[0][1].data
    );
    expect(data.children.entities[0].type).toBe("Voxel");
  });

  it("putMeta data type is MetaRoot", async () => {
    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );
    const data = JSON.parse(
      (metaApi.putMeta as ReturnType<typeof vi.fn>).mock.calls[0][1].data
    );
    expect(data.type).toBe("MetaRoot");
  });

  it("rejects when postVerse fails", async () => {
    (verseApi.postVerse as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network error")
    );
    await expect(
      metaVerseApi.createVerseFromResource("Polygen", "Test Scene", mockResource)
    ).rejects.toThrow("network error");
  });

  it("rejects when postMeta fails", async () => {
    (metaApi.postMeta as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("meta error")
    );
    await expect(
      metaVerseApi.createVerseFromResource("Polygen", "Test Scene", mockResource)
    ).rejects.toThrow("meta error");
  });

  it("rejects when putVerse fails", async () => {
    (verseApi.putVerse as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("put verse error")
    );
    await expect(
      metaVerseApi.createVerseFromResource("Polygen", "Test Scene", mockResource)
    ).rejects.toThrow("put verse error");
  });

  it("putVerse data string is valid JSON", async () => {
    await metaVerseApi.createVerseFromResource("Polygen", "Test Scene", mockResource);
    const callArgs = (verseApi.putVerse as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(() => JSON.parse(callArgs[1].data)).not.toThrow();
  });

  it("postMeta is called exactly once", async () => {
    await metaVerseApi.createVerseFromResource("Polygen", "Test Scene", mockResource);
    expect(metaApi.postMeta).toHaveBeenCalledTimes(1);
  });

  it("all API calls are made in sequence (total 5 calls)", async () => {
    const order: string[] = [];
    (verseApi.postVerse as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push("postVerse");
      return Promise.resolve({ data: { id: 100 } });
    });
    (metaApi.postMeta as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push("postMeta");
      return Promise.resolve({ data: { id: 200 } });
    });
    (metaResourceApi.postMetaResource as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        order.push("postMetaResource");
        return Promise.resolve({ data: {} });
      }
    );
    (verseApi.putVerse as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push("putVerse");
      return Promise.resolve({ data: { id: 100 } });
    });
    (metaApi.putMeta as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push("putMeta");
      return Promise.resolve({ data: { id: 200 } });
    });

    await metaVerseApi.createVerseFromResource(
      "Polygen",
      "Test Scene",
      mockResource
    );

    expect(order).toEqual([
      "postVerse",
      "postMeta",
      "postMetaResource",
      "putVerse",
      "putMeta",
    ]);
  });
});
