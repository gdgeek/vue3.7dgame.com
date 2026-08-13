import { describe, expect, it, vi } from "vitest";
import type { MetaInfo } from "@/api/v1/types/meta";
import {
  isCompleteMetaForSceneInsert,
  insertCompleteMetasForScene,
  resolveCompleteMetasForSceneInsert,
} from "@/components/MrPP/metaSceneInsert";

const completeMeta = (
  id: number,
  events: MetaInfo["events"] = { inputs: [], outputs: [] }
): MetaInfo =>
  ({
    id,
    data: { children: { entities: [] } },
    resources: [],
    events,
    title: `Meta ${id}`,
  }) as unknown as MetaInfo;

describe("meta scene insertion", () => {
  it("accepts null events as a known empty signal definition", () => {
    expect(isCompleteMetaForSceneInsert(completeMeta(1, null))).toBe(true);
  });

  it("rejects summaries that omit events or scene data", () => {
    expect(
      isCompleteMetaForSceneInsert({ id: 1, data: {}, resources: [] })
    ).toBe(false);
    expect(
      isCompleteMetaForSceneInsert({
        id: 1,
        events: { inputs: [], outputs: [] },
        resources: [],
      })
    ).toBe(false);
  });

  it("loads complete details before resolving an insertion", async () => {
    const summary = { id: 3, title: "Summary" } as MetaInfo;
    const load = vi.fn().mockResolvedValue(completeMeta(3));

    await expect(
      resolveCompleteMetasForSceneInsert([summary], load)
    ).resolves.toEqual([completeMeta(3)]);
    expect(load).toHaveBeenCalledWith(3);
  });

  it("rejects the whole batch when one detail request fails", async () => {
    const summaries = [
      { id: 1, title: "One" },
      { id: 2, title: "Two" },
    ] as MetaInfo[];
    const load = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("network");
      return completeMeta(id);
    });

    await expect(
      resolveCompleteMetasForSceneInsert(summaries, load)
    ).rejects.toThrow("network");
  });

  it("does not insert any item until the entire batch is complete", async () => {
    const summaries = [
      { id: 1, title: "One" },
      { id: 2, title: "Two" },
    ] as MetaInfo[];
    const insert = vi.fn();
    const load = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("network");
      return completeMeta(id);
    });

    await expect(
      insertCompleteMetasForScene(summaries, load, insert)
    ).rejects.toThrow("network");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a successful response that is still incomplete", async () => {
    const load = vi
      .fn()
      .mockResolvedValue({ id: 4, data: {}, resources: [] } as MetaInfo);

    await expect(
      resolveCompleteMetasForSceneInsert(
        [{ id: 4, title: "Four" } as MetaInfo],
        load
      )
    ).rejects.toMatchObject({ name: "MetaSceneInsertError" });
  });
});
