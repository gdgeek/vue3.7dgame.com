import { describe, expect, it } from "vitest";
import { pluginDebugRoute, pluginRoutes } from "@/router/modules/plugin";

describe("plugin routes", () => {
  it("preserves the plugin iframe when only pluginUrl changes", () => {
    expect(pluginRoutes.path).toBe("/plugins/:pluginId?");
    expect(pluginRoutes.meta?.preserveComponentOnQueryKeys).toEqual([
      "pluginUrl",
    ]);
    expect(pluginRoutes.meta?.preserveComponentOnQueryChange).toBeUndefined();
  });

  it("does not apply the plugin iframe lifecycle rule to the debug page", () => {
    expect(
      pluginDebugRoute.meta?.preserveComponentOnQueryChange
    ).toBeUndefined();
    expect(pluginDebugRoute.meta?.preserveComponentOnQueryKeys).toBeUndefined();
  });
});
