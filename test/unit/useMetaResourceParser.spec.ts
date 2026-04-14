import { describe, it, expect } from "vitest";
import { buildMetaResourceIndex } from "../../src/components/Meta/useMetaResourceParser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMeta(data: unknown, events?: unknown) {
  return { data, events } as any;
}

function makeNode(
  type: string,
  uuid: string,
  extra: Record<string, unknown> = {},
  children: Record<string, unknown> = {}
) {
  return {
    type,
    parameters: { uuid, ...extra },
    children,
  };
}

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — empty / null inputs
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — empty / null inputs", () => {
  it("returns empty arrays when meta.data is null", () => {
    const idx = buildMetaResourceIndex(makeMeta(null));
    expect(idx.polygen).toEqual([]);
    expect(idx.picture).toEqual([]);
    expect(idx.video).toEqual([]);
    expect(idx.voxel).toEqual([]);
    expect(idx.text).toEqual([]);
    expect(idx.sound).toEqual([]);
    expect(idx.phototype).toEqual([]);
    expect(idx.entity).toEqual([]);
    expect(idx.action).toEqual([]);
    expect(idx.trigger).toEqual([]);
  });

  it("returns empty events when meta.events is absent", () => {
    const idx = buildMetaResourceIndex(makeMeta(null));
    expect(idx.events.inputs).toEqual([]);
    expect(idx.events.outputs).toEqual([]);
  });

  it("returns empty events when meta.events is null", () => {
    const idx = buildMetaResourceIndex(makeMeta(null, null));
    expect(idx.events.inputs).toEqual([]);
    expect(idx.events.outputs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — events normalization
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — events", () => {
  it("normalizes string event names", () => {
    const idx = buildMetaResourceIndex(
      makeMeta(null, { inputs: ["click", "hover"], outputs: ["done"] })
    );
    expect(idx.events.inputs).toEqual([
      { title: "click", uuid: "click", name: "click" },
      { title: "hover", uuid: "hover", name: "hover" },
    ]);
    expect(idx.events.outputs).toEqual([
      { title: "done", uuid: "done", name: "done" },
    ]);
  });

  it("normalizes object event names with .name field", () => {
    const idx = buildMetaResourceIndex(
      makeMeta(null, {
        inputs: [{ name: "click" }, { name: "hover" }],
        outputs: [{ name: "done" }],
      })
    );
    expect(idx.events.inputs).toEqual([
      { title: "click", uuid: "click", name: "click" },
      { title: "hover", uuid: "hover", name: "hover" },
    ]);
    expect(idx.events.outputs).toEqual([
      { title: "done", uuid: "done", name: "done" },
    ]);
  });

  it("filters out events with non-string names", () => {
    const idx = buildMetaResourceIndex(
      makeMeta(null, {
        inputs: [{ name: 42 }, { name: null }, "valid"],
        outputs: [],
      })
    );
    expect(idx.events.inputs).toEqual([
      { title: "valid", uuid: "valid", name: "valid" },
    ]);
  });

  it("preserves title/uuid event objects from the editor", () => {
    const idx = buildMetaResourceIndex(
      makeMeta(null, {
        inputs: [{ title: "111", uuid: "input-uuid" }],
        outputs: [{ title: "222", uuid: "output-uuid" }],
      })
    );
    expect(idx.events.inputs).toEqual([{ title: "111", uuid: "input-uuid" }]);
    expect(idx.events.outputs).toEqual([
      { title: "222", uuid: "output-uuid" },
    ]);
  });

  it("handles non-array events gracefully", () => {
    const idx = buildMetaResourceIndex(
      makeMeta(null, { inputs: "not-an-array", outputs: 123 })
    );
    expect(idx.events.inputs).toEqual([]);
    expect(idx.events.outputs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — entity type detection
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — entity types", () => {
  function singleEntityMeta(type: string, uuid = "u1") {
    return makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [makeNode(type, uuid, { name: `${type}-name` })],
      },
    });
  }

  it("detects polygen nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("polygen", "p1"));
    expect(idx.polygen).toHaveLength(1);
    expect(idx.polygen[0].uuid).toBe("p1");
    expect(idx.polygen[0].name).toBe("polygen-name");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects picture nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("picture", "pic1"));
    expect(idx.picture).toHaveLength(1);
    expect(idx.picture[0].uuid).toBe("pic1");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects video nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("video", "v1"));
    expect(idx.video).toHaveLength(1);
    expect(idx.video[0].uuid).toBe("v1");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects voxel nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("voxel", "vox1"));
    expect(idx.voxel).toHaveLength(1);
    expect(idx.voxel[0].uuid).toBe("vox1");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects text nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("text", "t1"));
    expect(idx.text).toHaveLength(1);
    expect(idx.text[0].uuid).toBe("t1");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects sound nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("sound", "s1"));
    expect(idx.sound).toHaveLength(1);
    expect(idx.sound[0].uuid).toBe("s1");
    expect(idx.entity).toHaveLength(1);
  });

  it("detects phototype nodes", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("phototype", "pt1"));
    expect(idx.phototype).toHaveLength(1);
    expect(idx.phototype[0].uuid).toBe("pt1");
    expect(idx.entity).toHaveLength(1);
  });

  it("is case-insensitive for type matching", () => {
    const meta = makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [makeNode("Polygen", "p1", { name: "model" })],
      },
    });
    const idx = buildMetaResourceIndex(meta);
    expect(idx.polygen).toHaveLength(1);
  });

  it("does not catalog unknown types in typed arrays", () => {
    const idx = buildMetaResourceIndex(singleEntityMeta("unknown-type", "u1"));
    expect(idx.polygen).toHaveLength(0);
    expect(idx.video).toHaveLength(0);
    expect(idx.picture).toHaveLength(0);
    // unknown types do not appear in entity either
    expect(idx.entity).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — polygen components (Moved / Rotate / Tooltip)
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — polygen component flags", () => {
  function makePolygen(components: { type: string }[]) {
    return makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "polygen",
            parameters: { uuid: "p1", name: "model", animations: [1, 2] },
            children: { components, entities: [] },
          },
        ],
      },
    });
  }

  it("sets moved=true when Moved component is present", () => {
    const idx = buildMetaResourceIndex(makePolygen([{ type: "Moved" }]));
    expect(idx.polygen[0].moved).toBe(true);
  });

  it("sets moved=false when Moved component is absent", () => {
    const idx = buildMetaResourceIndex(makePolygen([]));
    expect(idx.polygen[0].moved).toBe(false);
  });

  it("sets rotate=true when Rotate component is present", () => {
    const idx = buildMetaResourceIndex(makePolygen([{ type: "Rotate" }]));
    expect(idx.polygen[0].rotate).toBe(true);
  });

  it("sets hasTooltips=true when Tooltip component is present", () => {
    const idx = buildMetaResourceIndex(makePolygen([{ type: "Tooltip" }]));
    expect(idx.polygen[0].hasTooltips).toBe(true);
  });

  it("preserves animations field from node parameters", () => {
    const idx = buildMetaResourceIndex(makePolygen([]));
    expect(idx.polygen[0].animations).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — picture component flags
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — picture component flags", () => {
  function makePicture(components: { type: string }[]) {
    return makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "picture",
            parameters: { uuid: "pic1", name: "img" },
            children: { components, entities: [] },
          },
        ],
      },
    });
  }

  it("sets moved=true for picture with Moved component", () => {
    const idx = buildMetaResourceIndex(makePicture([{ type: "Moved" }]));
    expect(idx.picture[0].moved).toBe(true);
  });

  it("sets hasTooltips=true for picture with Tooltip component", () => {
    const idx = buildMetaResourceIndex(makePicture([{ type: "Tooltip" }]));
    expect(idx.picture[0].hasTooltips).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — phototype data field
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — phototype data field", () => {
  it("includes data field from phototype parameters", () => {
    const meta = makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "phototype",
            parameters: { uuid: "pt1", name: "photo", data: { key: "val" } },
            children: {},
          },
        ],
      },
    });
    const idx = buildMetaResourceIndex(meta);
    expect((idx.phototype[0] as any).data).toEqual({ key: "val" });
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — action detection
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — actions", () => {
  it("collects action from node with action parameter", () => {
    const meta = makeMeta({
      parameters: { uuid: "root", action: "jump", parameter: { height: 2 } },
      children: {},
    });
    const idx = buildMetaResourceIndex(meta);
    expect(idx.action).toHaveLength(1);
    expect(idx.action[0].name).toBe("jump");
    expect(idx.action[0].parameter).toEqual({ height: 2 });
  });

  it("collects action from components with Tooltip type and sets parentUuid", () => {
    const meta = makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "polygen",
            parameters: { uuid: "entity-1", name: "model" },
            children: {
              components: [
                {
                  type: "Tooltip",
                  parameters: {
                    uuid: "action-1",
                    action: "showInfo",
                    parameter: "data",
                  },
                },
              ],
              entities: [],
            },
          },
        ],
      },
    });
    const idx = buildMetaResourceIndex(meta);
    const tooltipAction = idx.action.find((a) => a.type === "Tooltip");
    expect(tooltipAction).toBeDefined();
    expect(tooltipAction!.parentUuid).toBe("entity-1");
    expect(tooltipAction!.name).toBe("showInfo");
  });

  it("does not include action when action parameter is undefined", () => {
    const meta = makeMeta({
      parameters: { uuid: "root", name: "no-action" },
      children: {},
    });
    const idx = buildMetaResourceIndex(meta);
    expect(idx.action).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildMetaResourceIndex — recursive tree walking
// ---------------------------------------------------------------------------
describe("buildMetaResourceIndex — recursive tree walking", () => {
  it("walks nested entities in children", () => {
    const meta = makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "polygen",
            parameters: { uuid: "parent", name: "parent-model" },
            children: {
              components: [],
              entities: [
                {
                  type: "picture",
                  parameters: { uuid: "child-pic", name: "nested" },
                  children: { components: [], entities: [] },
                },
              ],
            },
          },
        ],
      },
    });
    const idx = buildMetaResourceIndex(meta);
    expect(idx.polygen).toHaveLength(1);
    expect(idx.picture).toHaveLength(1);
    expect(idx.picture[0].uuid).toBe("child-pic");
  });

  it("collects all entities from a deeply nested tree", () => {
    const meta = makeMeta({
      parameters: { uuid: "root" },
      children: {
        entities: [
          {
            type: "polygen",
            parameters: { uuid: "p1", name: "m1" },
            children: {
              entities: [
                {
                  type: "video",
                  parameters: { uuid: "v1", name: "vid" },
                  children: {
                    entities: [
                      {
                        type: "sound",
                        parameters: { uuid: "s1", name: "snd" },
                        children: {},
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
    const idx = buildMetaResourceIndex(meta);
    expect(idx.polygen).toHaveLength(1);
    expect(idx.video).toHaveLength(1);
    expect(idx.sound).toHaveLength(1);
    expect(idx.entity).toHaveLength(3);
  });

  it("parses simple entity tree (original test preserved)", () => {
    const meta: any = {
      data: {
        parameters: { uuid: "root" },
        children: {
          entities: [
            {
              type: "polygen",
              parameters: { uuid: "p1", name: "model1" },
              children: { components: [{ type: "Moved" }], entities: [] },
            },
            {
              type: "picture",
              parameters: { uuid: "pic1", name: "image1" },
              children: { components: [{ type: "Tooltip" }], entities: [] },
            },
          ],
        },
      },
      events: { inputs: ["i1"], outputs: ["o1"] },
    };

    const idx = buildMetaResourceIndex(meta);
    expect(idx.entity.length).toBe(2);
    expect(idx.polygen.length).toBe(1);
    expect(idx.picture.length).toBe(1);
    expect(idx.events.inputs).toEqual([
      { title: "i1", uuid: "i1", name: "i1" },
    ]);
  });
});
