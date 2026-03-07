/**
 * Unit tests for src/store/modules/tags.ts — useTagsStore
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/api/v1/tags", () => ({
  getTags: vi.fn(),
}));
vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

describe("useTagsStore", () => {
  let tagsApi: { getTags: ReturnType<typeof vi.fn> };
  let loggerMod: { logger: { error: ReturnType<typeof vi.fn> } };
  let useTagsStore: typeof import("@/store/modules/tags").useTagsStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    tagsApi = (await import("@/api/v1/tags")) as never;
    loggerMod = await import("@/utils/logger");
    ({ useTagsStore } = await import("@/store/modules/tags"));
  });

  it("tagsMap is null initially", () => {
    const store = useTagsStore();
    expect(store.tagsMap).toBeNull();
  });

  it("refreshTags calls getTags with 'Classify'", async () => {
    tagsApi.getTags.mockResolvedValue({ data: [] });
    const store = useTagsStore();
    await store.refreshTags();
    expect(tagsApi.getTags).toHaveBeenCalledWith("Classify");
  });

  it("tagsMap is populated after refreshTags", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Science",
          info: JSON.stringify({
            color: "#FF0000",
            type: "primary",
            explan: "Science tag",
          }),
          managed: 0,
        },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap).not.toBeNull();
    expect(store.tagsMap!.size).toBe(1);
  });

  it("tagsMap is keyed by item.id", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        { id: 42, name: "Art", info: JSON.stringify({}), managed: 0 },
        { id: 99, name: "Music", info: JSON.stringify({}), managed: 1 },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.has(42)).toBe(true);
    expect(store.tagsMap!.has(99)).toBe(true);
  });

  it("TagInfo.name is set from item.name", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 5, name: "Math", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(5)!.name).toBe("Math");
  });

  it("TagInfo.color is parsed from info.color", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        {
          id: 3,
          name: "T",
          info: JSON.stringify({ color: "#AABBCC" }),
          managed: 0,
        },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(3)!.color).toBe("#AABBCC");
  });

  it("TagInfo.type is parsed from info.type", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        {
          id: 4,
          name: "T",
          info: JSON.stringify({ type: "special" }),
          managed: 0,
        },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(4)!.type).toBe("special");
  });

  it("TagInfo.explan is parsed from info.explan", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        {
          id: 6,
          name: "T",
          info: JSON.stringify({ explan: "Explanation here" }),
          managed: 0,
        },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(6)!.explan).toBe("Explanation here");
  });

  it("uses default '#000000' for color when info.color is absent", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 7, name: "T", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(7)!.color).toBe("#000000");
  });

  it("uses default '无内容' for explan when info.explan is absent", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 8, name: "T", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(8)!.explan).toBe("无内容");
  });

  it("TagInfo.managed is preserved from item.managed", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 9, name: "T", info: JSON.stringify({}), managed: 1 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(9)!.managed).toBe(1);
  });

  it("tagsMap remains null on API error", async () => {
    tagsApi.getTags.mockRejectedValue(new Error("API failure"));
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap).toBeNull();
  });

  it("logger.error is called when refreshTags throws", async () => {
    const err = new Error("API failure");
    tagsApi.getTags.mockRejectedValue(err);
    const store = useTagsStore();
    await store.refreshTags();
    expect(loggerMod.logger.error).toHaveBeenCalledWith(err);
  });

  it("empty data array results in an empty Map (not null)", async () => {
    tagsApi.getTags.mockResolvedValue({ data: [] });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap).not.toBeNull();
    expect(store.tagsMap!.size).toBe(0);
  });

  it("second refreshTags call overwrites the previous tagsMap", async () => {
    tagsApi.getTags.mockResolvedValueOnce({
      data: [{ id: 1, name: "First", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.has(1)).toBe(true);

    tagsApi.getTags.mockResolvedValueOnce({
      data: [{ id: 2, name: "Second", info: JSON.stringify({}), managed: 0 }],
    });
    await store.refreshTags();
    expect(store.tagsMap!.has(1)).toBe(false);
    expect(store.tagsMap!.has(2)).toBe(true);
  });

  it("multiple tags in one call are all added to the map", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [
        {
          id: 10,
          name: "A",
          info: JSON.stringify({ color: "#111" }),
          managed: 0,
        },
        {
          id: 11,
          name: "B",
          info: JSON.stringify({ color: "#222" }),
          managed: 1,
        },
        {
          id: 12,
          name: "C",
          info: JSON.stringify({ color: "#333" }),
          managed: 0,
        },
      ],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.size).toBe(3);
    expect(store.tagsMap!.get(10)!.color).toBe("#111");
    expect(store.tagsMap!.get(11)!.managed).toBe(1);
    expect(store.tagsMap!.get(12)!.name).toBe("C");
  });

  it("managed=0 is correctly preserved (not treated as falsy)", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 20, name: "T", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap!.get(20)!.managed).toBe(0);
  });

  it("useTagsStore called twice returns the same instance", () => {
    const s1 = useTagsStore();
    const s2 = useTagsStore();
    expect(s1).toBe(s2);
  });

  it("tagsMap is a Map instance after refreshTags", async () => {
    tagsApi.getTags.mockResolvedValue({
      data: [{ id: 1, name: "T", info: JSON.stringify({}), managed: 0 }],
    });
    const store = useTagsStore();
    await store.refreshTags();
    expect(store.tagsMap).toBeInstanceOf(Map);
  });
});
