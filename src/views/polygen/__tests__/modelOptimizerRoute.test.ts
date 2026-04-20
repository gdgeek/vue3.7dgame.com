import { describe, expect, it } from "vitest";

import { buildModelOptimizerRoute } from "../modelOptimizerRoute";

describe("buildModelOptimizerRoute", () => {
  it("navigates to the model optimizer plugin and preserves the current query", () => {
    const route = buildModelOptimizerRoute({
      search: "robot",
      page: "2",
      resourceId: "18",
      open: "1",
      tags: ["hard-surface", "game-ready"],
      theme: "modern-blue",
      nullable: null,
    });

    expect(route).toEqual({
      path: "/plugins/3d-model-optimizer",
      query: {
        search: "robot",
        page: "2",
        resourceId: "18",
        open: "1",
        tags: ["hard-surface", "game-ready"],
        theme: "modern-blue",
        nullable: null,
      },
    });
  });

  it("returns an empty query object when the current page has no query params", () => {
    expect(buildModelOptimizerRoute({})).toEqual({
      path: "/plugins/3d-model-optimizer",
      query: {},
    });
  });
});
