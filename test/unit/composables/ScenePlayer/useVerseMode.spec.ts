import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("useVerseMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const importComposable = async () => {
    const { useVerseMode } = await import(
      "@/components/ScenePlayer/composables/useVerseMode"
    );
    return useVerseMode;
  };

  describe("with undefined verse", () => {
    it("returns empty eventContainer", async () => {
      const useVerseMode = await importComposable();
      const { eventContainer } = useVerseMode(undefined);
      expect(eventContainer.value).toEqual({});
    });

    it("parseVerseData returns null", async () => {
      const useVerseMode = await importComposable();
      const { parseVerseData } = useVerseMode(undefined);
      expect(parseVerseData()).toBeNull();
    });

    it("initEventContainer does nothing", async () => {
      const useVerseMode = await importComposable();
      const { initEventContainer, eventContainer } = useVerseMode(undefined);
      initEventContainer();
      expect(eventContainer.value).toEqual({});
    });
  });

  describe("parseVerseData", () => {
    it("returns parsed object when verse.data is a JSON string", async () => {
      const useVerseMode = await importComposable();
      const verse = {
        data: JSON.stringify({ children: { modules: [] } }),
        metas: [],
        resources: [],
      };
      const { parseVerseData } = useVerseMode(verse as never);
      const result = parseVerseData();
      expect(result).toEqual({ children: { modules: [] } });
    });

    it("returns data object directly when verse.data is already an object", async () => {
      const useVerseMode = await importComposable();
      const data = { children: { modules: [] } };
      const verse = { data, metas: [], resources: [] };
      const { parseVerseData } = useVerseMode(verse as never);
      expect(parseVerseData()).toBe(data);
    });

    it("returns null when verse.data is invalid JSON", async () => {
      const { logger } = await import("@/utils/logger");
      const useVerseMode = await importComposable();
      const verse = { data: "{ invalid json", metas: [], resources: [] };
      const { parseVerseData } = useVerseMode(verse as never);
      const result = parseVerseData();
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("initEventContainer", () => {
    it("populates eventContainer from matching metas", async () => {
      const useVerseMode = await importComposable();
      const events = { onClick: "handler1" };
      const verse = {
        data: JSON.stringify({
          children: {
            modules: [{ parameters: { meta_id: "1", uuid: "module-abc" } }],
          },
        }),
        metas: [{ id: "1", data: null, events }],
        resources: [],
      };

      const { initEventContainer, eventContainer } = useVerseMode(
        verse as never
      );
      initEventContainer();

      expect(eventContainer.value["module-abc"]).toEqual(events);
    });

    it("skips modules without meta_id", async () => {
      const useVerseMode = await importComposable();
      const verse = {
        data: JSON.stringify({
          children: {
            modules: [
              { parameters: { uuid: "module-abc" } }, // no meta_id
            ],
          },
        }),
        metas: [],
        resources: [],
      };

      const { initEventContainer, eventContainer } = useVerseMode(
        verse as never
      );
      initEventContainer();
      expect(eventContainer.value).toEqual({});
    });

    it("skips metas without events", async () => {
      const useVerseMode = await importComposable();
      const verse = {
        data: JSON.stringify({
          children: {
            modules: [{ parameters: { meta_id: "1", uuid: "mod1" } }],
          },
        }),
        metas: [{ id: "1", data: null }], // no events
        resources: [],
      };

      const { initEventContainer, eventContainer } = useVerseMode(
        verse as never
      );
      initEventContainer();
      expect(eventContainer.value).toEqual({});
    });
  });

  describe("isVerseMetaInfo", () => {
    it("returns true for objects with id field", async () => {
      const useVerseMode = await importComposable();
      const { isVerseMetaInfo } = useVerseMode(undefined);
      expect(isVerseMetaInfo({ id: 1 })).toBe(true);
    });

    it("returns false for primitives", async () => {
      const useVerseMode = await importComposable();
      const { isVerseMetaInfo } = useVerseMode(undefined);
      expect(isVerseMetaInfo(null)).toBe(false);
      expect(isVerseMetaInfo("string")).toBe(false);
      expect(isVerseMetaInfo(42)).toBe(false);
    });
  });
});
