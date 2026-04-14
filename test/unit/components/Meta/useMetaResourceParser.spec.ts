/**
 * Unit tests for src/components/Meta/useMetaResourceParser.ts
 * Covers: buildMetaResourceIndex, event normalization (via events),
 *         parseAction, parsePoint, walk (via entity/polygen/picture/…).
 */
import { describe, it, expect } from "vitest";
import {
  buildMetaResourceIndex,
  type MetaResourceIndex,
  type ActionInfo,
  type EntityInfo,
} from "@/components/Meta/useMetaResourceParser";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Minimal valid metaInfo-shaped object (cast to any to avoid importing full type). */
function makeMeta(data?: unknown, events?: unknown) {
  return { data, events } as any;
}

/** Build a minimal scene node. */
function makeNode(
  type: string | undefined,
  uuid: string,
  extra: Record<string, unknown> = {},
  children?: Record<string, unknown>
) {
  return {
    type,
    parameters: { uuid, ...extra },
    ...(children ? { children } : {}),
  };
}

// ---------------------------------------------------------------------------
// suite
// ---------------------------------------------------------------------------

describe("buildMetaResourceIndex", () => {
  // ─── empty / base cases ───────────────────────────────────────────────────

  it("returns all-empty arrays when data is undefined", () => {
    const result = buildMetaResourceIndex(makeMeta(undefined));
    expect(result.action).toEqual([]);
    expect(result.trigger).toEqual([]);
    expect(result.polygen).toEqual([]);
    expect(result.picture).toEqual([]);
    expect(result.video).toEqual([]);
    expect(result.voxel).toEqual([]);
    expect(result.phototype).toEqual([]);
    expect(result.text).toEqual([]);
    expect(result.sound).toEqual([]);
    expect(result.entity).toEqual([]);
  });

  it("returns empty events when meta.events is null/absent", () => {
    const r1 = buildMetaResourceIndex(makeMeta(undefined, null));
    const r2 = buildMetaResourceIndex(makeMeta(undefined, undefined));
    expect(r1.events).toEqual({ inputs: [], outputs: [] });
    expect(r2.events).toEqual({ inputs: [], outputs: [] });
  });

  it("contains all expected top-level keys", () => {
    const result = buildMetaResourceIndex(makeMeta(undefined));
    const expectedKeys: (keyof MetaResourceIndex)[] = [
      "action",
      "trigger",
      "polygen",
      "picture",
      "video",
      "voxel",
      "phototype",
      "text",
      "sound",
      "entity",
      "events",
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  // ─── events normalization ─────────────────────────────────────────────────

  it("normalizes string event names as displayable event items", () => {
    const events = { inputs: ["clickA", "hoverB"], outputs: ["done"] };
    const result = buildMetaResourceIndex(makeMeta(undefined, events));
    expect(result.events.inputs).toEqual([
      { title: "clickA", uuid: "clickA", name: "clickA" },
      { title: "hoverB", uuid: "hoverB", name: "hoverB" },
    ]);
    expect(result.events.outputs).toEqual([
      { title: "done", uuid: "done", name: "done" },
    ]);
  });

  it("normalizes object events that have a name property", () => {
    const events = {
      inputs: [{ name: "start", type: "void" }],
      outputs: [{ name: "finish", type: "bool" }],
    };
    const result = buildMetaResourceIndex(makeMeta(undefined, events));
    expect(result.events.inputs).toEqual([
      { title: "start", uuid: "void", name: "start", type: "void" },
    ]);
    expect(result.events.outputs).toEqual([
      { title: "finish", uuid: "bool", name: "finish", type: "bool" },
    ]);
  });

  it("preserves editor signal objects that use title and uuid", () => {
    const events = {
      inputs: [{ title: "111", uuid: "uuid-input-1" }],
      outputs: [{ title: "222", uuid: "uuid-output-1" }],
    };
    const result = buildMetaResourceIndex(makeMeta(undefined, events));
    expect(result.events.inputs).toEqual([
      { title: "111", uuid: "uuid-input-1" },
    ]);
    expect(result.events.outputs).toEqual([
      { title: "222", uuid: "uuid-output-1" },
    ]);
  });

  it("filters out null, number, and nameless-object event entries", () => {
    const events = {
      inputs: [null, 42, { label: "nope" }, "valid"],
      outputs: [],
    };
    const result = buildMetaResourceIndex(makeMeta(undefined, events));
    expect(result.events.inputs).toEqual([
      { title: "valid", uuid: "valid", name: "valid" },
    ]);
  });

  it("returns empty events when events.inputs/outputs are not arrays", () => {
    const events = { inputs: "notAnArray", outputs: null };
    const result = buildMetaResourceIndex(makeMeta(undefined, events));
    expect(result.events.inputs).toEqual([]);
    expect(result.events.outputs).toEqual([]);
  });

  // ─── action parsing ───────────────────────────────────────────────────────

  it("parses action from node that has an action field", () => {
    const node = makeNode("Button", "btn-1", {
      action: "doClick",
      parameter: { delay: 0 },
    });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.action).toHaveLength(1);
    const action = result.action[0] as ActionInfo;
    expect(action.uuid).toBe("btn-1");
    expect(action.name).toBe("doClick");
    expect(action.parameter).toEqual({ delay: 0 });
    expect(action.type).toBe("Button");
  });

  it("does not add action when node has no action field", () => {
    const node = makeNode("Polygen", "poly-0", { name: "Shape" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.action).toEqual([]);
  });

  it("sets parentUuid on Tooltip component action", () => {
    const parent = {
      type: "Polygen",
      parameters: { uuid: "parent-uuid" },
      children: {
        components: [
          {
            type: "Tooltip",
            parameters: { uuid: "tip-uuid", action: "showTip" },
          },
        ],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(parent));
    const tipAction = result.action.find((a) => a.uuid === "tip-uuid");
    expect(tipAction).toBeDefined();
    expect(tipAction!.parentUuid).toBe("parent-uuid");
  });

  it("does NOT set parentUuid on non-Tooltip component action", () => {
    const parent = {
      type: "Entity",
      parameters: { uuid: "e-uuid" },
      children: {
        components: [
          {
            type: "Button",
            parameters: { uuid: "btn-uuid", action: "click" },
          },
        ],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(parent));
    const btnAction = result.action.find((a) => a.uuid === "btn-uuid");
    expect(btnAction).toBeDefined();
    expect(btnAction!.parentUuid).toBeUndefined();
  });

  // ─── entity / resource parsing ────────────────────────────────────────────

  it("parses Polygen node into polygen and entity", () => {
    const node = makeNode("Polygen", "pg-1", {
      name: "MyPoly",
      animations: [{ clip: "walk" }],
    });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.polygen).toHaveLength(1);
    expect(result.polygen[0]).toMatchObject({ uuid: "pg-1", name: "MyPoly" });
    expect(result.entity).toHaveLength(1);
  });

  it("polygen with Moved / Rotate / Tooltip components sets flags", () => {
    const node = {
      type: "Polygen",
      parameters: { uuid: "pg-2", name: "FlagPoly" },
      children: {
        components: [
          { type: "Moved", parameters: { uuid: "c1" } },
          { type: "Rotate", parameters: { uuid: "c2" } },
          { type: "Tooltip", parameters: { uuid: "c3", action: "tip" } },
        ],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.polygen[0].moved).toBe(true);
    expect(result.polygen[0].rotate).toBe(true);
    expect(result.polygen[0].hasTooltips).toBe(true);
  });

  it("polygen without components has all flags false", () => {
    const node = makeNode("Polygen", "pg-3", { name: "Plain" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.polygen[0].moved).toBe(false);
    expect(result.polygen[0].rotate).toBe(false);
    expect(result.polygen[0].hasTooltips).toBe(false);
  });

  it("parses Picture node into picture and entity with moved/rotate flags", () => {
    const node = {
      type: "Picture",
      parameters: { uuid: "pic-1", name: "Photo" },
      children: {
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.picture).toHaveLength(1);
    expect(result.picture[0].moved).toBe(true);
    expect(result.picture[0].rotate).toBe(false);
    expect(result.entity).toHaveLength(1);
  });

  it("parses Video node into video and entity", () => {
    const node = makeNode("Video", "vid-1", { name: "Clip" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.video).toHaveLength(1);
    expect(result.entity).toHaveLength(1);
  });

  it("parses Sound node into sound and entity", () => {
    const node = makeNode("Sound", "snd-1", { name: "Bang" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.sound).toHaveLength(1);
    expect(result.entity).toHaveLength(1);
  });

  it("parses Text node into text and entity", () => {
    const node = makeNode("Text", "txt-1", { name: "Hello" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.text).toHaveLength(1);
    expect(result.entity).toHaveLength(1);
  });

  it("parses Voxel node into voxel and entity", () => {
    const node = makeNode("Voxel", "vox-1", { name: "Cube" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.voxel).toHaveLength(1);
    expect(result.entity).toHaveLength(1);
  });

  it("parses Phototype node into phototype and entity with data field", () => {
    const node = makeNode("Phototype", "pt-1", {
      name: "ScanResult",
      data: { resolution: "4k" },
    });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.phototype).toHaveLength(1);
    expect(result.entity).toHaveLength(1);
  });

  // ─── recursive walk ───────────────────────────────────────────────────────

  it("recursively walks non-component child arrays", () => {
    const child = makeNode("Video", "child-vid", { name: "ChildClip" });
    const parent = {
      type: "Entity",
      parameters: { uuid: "root", name: "Root" },
      children: {
        items: [child],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(parent));
    expect(result.video).toHaveLength(1);
    expect(result.video[0].uuid).toBe("child-vid");
  });

  it("aggregates multiple nodes of same type", () => {
    // Root uses a non-entity type to avoid polluting entity count
    const root = {
      type: "UnknownContainer",
      parameters: { uuid: "root" },
      children: {
        sounds: [
          makeNode("Sound", "s1", { name: "A" }),
          makeNode("Sound", "s2", { name: "B" }),
          makeNode("Sound", "s3", { name: "C" }),
        ],
      },
    };
    const result = buildMetaResourceIndex(makeMeta(root));
    expect(result.sound).toHaveLength(3);
    expect(result.entity).toHaveLength(3);
  });

  it("does not include unknown type node in any typed array", () => {
    const node = makeNode("UnknownType", "unk-1", { name: "Unk" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.polygen).toHaveLength(0);
    expect(result.picture).toHaveLength(0);
    expect(result.video).toHaveLength(0);
    expect(result.sound).toHaveLength(0);
    expect(result.text).toHaveLength(0);
    expect(result.voxel).toHaveLength(0);
    expect(result.phototype).toHaveLength(0);
    // entity is the catch-all but requires matching type list too
    expect(result.entity).toHaveLength(0);
  });

  it("type matching is case-insensitive (lowercase polygen matches Polygen)", () => {
    const node = makeNode("polygen", "pg-lc", { name: "LowerCase" });
    const result = buildMetaResourceIndex(makeMeta(node));
    expect(result.polygen).toHaveLength(1);
  });
});
