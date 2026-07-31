import { describe, expect, it } from "vitest";
import { pluginDebugRoute, pluginRoutes } from "@/router/modules/plugin";

describe("plugin routes", () => {
  it("preserves the plugin iframe when only pluginUrl changes", () => {
    expect(pluginRoutes.path).toBe("/plugins/:pluginId?");
    expect(pluginRoutes.meta?.preserveComponentOnQueryChange).toBe(true);
  });

  it("does not apply the plugin iframe lifecycle rule to the debug page", () => {
    expect(
      pluginDebugRoute.meta?.preserveComponentOnQueryChange
    ).toBeUndefined();
  });
});
