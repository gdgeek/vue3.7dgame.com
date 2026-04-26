import { describe, expect, it } from "vitest";
import { resolvePluginHostAction } from "../pluginHostActions";

describe("resolvePluginHostAction", () => {
  it("returns a reload action when the plugin registry changes", () => {
    expect(
      resolvePluginHostAction({ event: "plugin-registry-changed" })
    ).toEqual({
      type: "reload-host",
    });
  });

  it("returns a navigation action for navigate-host events", () => {
    expect(
      resolvePluginHostAction({
        event: "navigate-host",
        path: "/plugins/ai-3d-generator-v3",
        query: { lang: "zh-CN", theme: "modern-blue" },
      })
    ).toEqual({
      type: "navigate-host",
      path: "/plugins/ai-3d-generator-v3",
      query: { lang: "zh-CN", theme: "modern-blue" },
    });
  });

  it("returns a plugin URL sync action for plugin-url-changed events", () => {
    expect(
      resolvePluginHostAction({
        event: "plugin-url-changed",
        pluginUrl: "/sample?tab=detail#top",
      })
    ).toEqual({
      type: "sync-plugin-url",
      pluginUrl: "/sample?tab=detail#top",
    });
  });

  it("ignores unsafe plugin URL sync payloads", () => {
    expect(
      resolvePluginHostAction({
        event: "plugin-url-changed",
        pluginUrl: "https://example.com/sample",
      })
    ).toBeNull();
  });
});
