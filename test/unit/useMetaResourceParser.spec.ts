import { describe, it, expect } from "vitest";
import { buildMetaResourceIndex } from "../../src/components/Meta/useMetaResourceParser";

describe("buildMetaResourceIndex", () => {
  it("parses simple entity tree", () => {
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
    expect(idx.events.inputs).toEqual(["i1"]);
  });
});
