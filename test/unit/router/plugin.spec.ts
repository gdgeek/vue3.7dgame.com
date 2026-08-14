import { describe, expect, it } from "vitest";
import {
  createDevelopmentPluginRoutes,
  pluginRoutes,
} from "@/router/modules/plugin";

describe("plugin routes", () => {
  it("preserves the plugin iframe when only pluginUrl changes", () => {
    expect(pluginRoutes.path).toBe("/plugins/:pluginId?");
    expect(pluginRoutes.meta?.preserveComponentOnQueryKeys).toEqual([
      "pluginUrl",
    ]);
    expect(pluginRoutes.meta?.preserveComponentOnQueryChange).toBeUndefined();
  });

  it("does not apply the plugin iframe lifecycle rule to the debug page", () => {
    const [pluginDebugRoute] = createDevelopmentPluginRoutes(false);

    expect(
      pluginDebugRoute.meta?.preserveComponentOnQueryChange
    ).toBeUndefined();
    expect(pluginDebugRoute.meta?.preserveComponentOnQueryKeys).toBeUndefined();
  });
});
