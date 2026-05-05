import { describe, expect, it } from "vitest";

import {
  SPACE_REFERENCE_VISIBILITY_ACTION,
  VERSE_SCENE_EXPAND,
  buildSpaceVisibilityRequest,
  buildVerseEditorInitConfig,
  formatSpaceLabel,
} from "@/views/verse/sceneSpace";
import type { VerseData } from "@/api/v1/verse";

const baseVerse = {
  id: 626,
  author_id: 1,
  name: "抓糖果",
  info: null,
  description: null,
  data: { type: "Verse", children: { modules: [] } },
  version: 1,
  uuid: "verse-626",
  editable: true,
  viewable: true,
  verseRelease: null,
  image: {
    id: 10,
    md5: "image-md5",
    type: "image/png",
    url: "https://example.test/cover.png",
    filename: "cover.png",
    size: 123,
    key: "cover.png",
  },
} satisfies VerseData;

describe("sceneSpace", () => {
  it("requests space in the verse scene expand list", () => {
    const expands = VERSE_SCENE_EXPAND.split(/\s*,\s*/);
    expect(expands).toContain("space");
    expect(expands).toContain("space.mesh");
    expect(expands).toContain("space.file");
    expect(expands).toContain("space.image");
  });

  it("formats a bound space label", () => {
    expect(formatSpaceLabel({ id: 7, name: "SLAM Alpha" })).toBe(
      "使用空间：SLAM Alpha"
    );
  });

  it("returns an empty label without a bound space", () => {
    expect(formatSpaceLabel(null)).toBe("");
    expect(formatSpaceLabel(undefined)).toBe("");
  });

  it("keeps the bound space in the editor init config", () => {
    const verse = {
      ...baseVerse,
      space: {
        id: 7,
        name: "SLAM Alpha",
        mesh: {
          id: 99,
          md5: "mesh-md5",
          type: "model/gltf-binary",
          url: "https://example.test/space.glb",
          filename: "space.glb",
          size: 999,
          key: "space.glb",
        },
      },
    } satisfies VerseData;

    const config = buildVerseEditorInitConfig({
      id: 626,
      verse,
      saveable: true,
      user: { id: 1, role: "admin" },
    });

    expect(config.data.space?.name).toBe("SLAM Alpha");
    expect(config.data.space?.mesh?.url).toBe("https://example.test/space.glb");
  });

  it("builds a space reference visibility request", () => {
    expect(buildSpaceVisibilityRequest(false)).toEqual({
      action: SPACE_REFERENCE_VISIBILITY_ACTION,
      visible: false,
    });
    expect(buildSpaceVisibilityRequest(true)).toEqual({
      action: SPACE_REFERENCE_VISIBILITY_ACTION,
      visible: true,
    });
  });
});
