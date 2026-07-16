import { describe, expect, it } from "vitest";
import { hasPublishableSceneContent } from "@/utils/versePublish";

describe("hasPublishableSceneContent", () => {
  it.each([
    null,
    undefined,
    "",
    "not-json",
    {},
    { children: {} },
    { children: { modules: [] } },
    { data: null },
    { data: JSON.stringify({ children: { modules: [] } }) },
  ])("rejects an empty or malformed scene: %j", (value) => {
    expect(hasPublishableSceneContent(value)).toBe(false);
  });

  it.each([
    { children: { modules: [{ id: 1 }] } },
    { data: { children: { modules: [{ id: 1 }] } } },
    { data: JSON.stringify({ children: { modules: [{ id: 1 }] } }) },
  ])("accepts a scene containing a root entity: %j", (value) => {
    expect(hasPublishableSceneContent(value)).toBe(true);
  });
});
