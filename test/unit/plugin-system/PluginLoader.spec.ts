import { describe, it, expect, beforeEach, vi } from "vitest";

import { PluginLoader } from "@/plugin-system/core/PluginLoader";

import type { PluginManifest } from "@/plugin-system/types";
import type { LoadedPlugin } from "@/plugin-system/core/PluginLoader";

/** Create a minimal valid manifest for testing */
function createManifest(
  overrides: Partial<PluginManifest> = {}
): PluginManifest {
  return {
    id: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    url: "https://plugin.example.com/app",
    icon: "Edit",
    group: "tools",
    enabled: true,
    order: 1,
    allowedOrigin: "https://plugin.example.com",
    version: "1.0.0",
    ...overrides,
  };
}

/**
 * Create a mock container element that tracks child operations.
 * jsdom provides a real DOM so we use document.createElement directly.
 */
function createContainer(): HTMLElement {
  return document.createElement("div");
}

async function loadMountedPlugin(
  loader: PluginLoader,
  manifest: PluginManifest,
  container: HTMLElement
): Promise<LoadedPlugin> {
  return loader.load(manifest.id, manifest, container);
}

describe("PluginLoader", () => {
  let loader: PluginLoader;
  let container: HTMLElement;

  beforeEach(() => {
    loader = new PluginLoader();
    container = createContainer();
  });

  describe("load", () => {
    it("should create an iframe with a cache-busted src attribute", async () => {
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1713196923000);
      const manifest = createManifest({ url: "https://editor.example.com/v2" });
      await loadMountedPlugin(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.src).toBe(
        "https://editor.example.com/v2?v=1.0.0&cb=1713196923000"
      );
      nowSpy.mockRestore();
    });

    it("should set default sandbox attribute when manifest.sandbox is undefined", async () => {
      const manifest = createManifest({ sandbox: undefined });
      await loadMountedPlugin(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).toBe(
        "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      );
    });

    it("should use custom sandbox attribute from manifest", async () => {
      const manifest = createManifest({ sandbox: "allow-scripts" });
      await loadMountedPlugin(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts");
    });

    it("should set iframe style to fill container with no border", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);

      const iframe = container.querySelector("iframe") as HTMLIFrameElement;
      expect(iframe.style.width).toBe("100%");
      expect(iframe.style.height).toBe("100%");
      expect(iframe.style.border).toBe("0px");
    });

    it("should append iframe to the container element", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);

      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe("IFRAME");
    });

    it("should return a LoadedPlugin record with correct fields", async () => {
      const manifest = createManifest({ id: "my-plugin" });
      const before = Date.now();
      const result = await loadMountedPlugin(loader, manifest, container);

      expect(result.pluginId).toBe("my-plugin");
      expect(result.iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(result.origin).toBe(manifest.allowedOrigin);
      expect(result.state).toBe("active");
      expect(result.loadedAt).toBeGreaterThanOrEqual(before);
    });

    it("should not auto-send INIT postMessage after load (INIT is sent by PluginSystem on PLUGIN_READY)", async () => {
      const manifest = createManifest();

      const { iframe } = await loadMountedPlugin(
        loader,
        manifest,
        container
      );

      // Spy on contentWindow.postMessage (jsdom provides a contentWindow)
      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        writable: true,
      });

      // load() no longer sends INIT — that's handled by PluginSystem after PLUGIN_READY
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it("should return existing record if plugin is already loaded", async () => {
      const manifest = createManifest();
      const first = await loadMountedPlugin(loader, manifest, container);
      const second = await loadMountedPlugin(loader, manifest, container);

      expect(second).toBe(first);
      // Only one iframe should exist
      expect(container.querySelectorAll("iframe").length).toBe(1);
    });
  });

  describe("immediate host-side mount", () => {
    it("should resolve without waiting for an iframe load event", async () => {
      const manifest = createManifest();
      const result = await loader.load(manifest.id, manifest, container);
      expect(result.pluginId).toBe(manifest.id);
    });
  });

  describe("unload", () => {
    it("should remove iframe from DOM", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);

      expect(container.querySelector("iframe")).not.toBeNull();

      loader.unload(manifest.id);

      expect(container.querySelector("iframe")).toBeNull();
    });

    it("should remove plugin from loaded map", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);

      expect(loader.isLoaded(manifest.id)).toBe(true);

      loader.unload(manifest.id);

      expect(loader.isLoaded(manifest.id)).toBe(false);
      expect(loader.getLoaded(manifest.id)).toBeUndefined();
    });

    it("should not throw when unloading a non-existent plugin", () => {
      expect(() => loader.unload("nonexistent")).not.toThrow();
    });
  });

  describe("getLoaded", () => {
    it("should return the loaded plugin record", async () => {
      const manifest = createManifest({ id: "alpha" });
      const loaded = await loadMountedPlugin(loader, manifest, container);

      expect(loader.getLoaded("alpha")).toBe(loaded);
    });

    it("should return undefined for unknown plugin", () => {
      expect(loader.getLoaded("unknown")).toBeUndefined();
    });
  });

  describe("isLoaded", () => {
    it("should return true for a loaded plugin", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);

      expect(loader.isLoaded(manifest.id)).toBe(true);
    });

    it("should return false for an unloaded plugin", () => {
      expect(loader.isLoaded("nope")).toBe(false);
    });

    it("should return false after unloading", async () => {
      const manifest = createManifest();
      await loadMountedPlugin(loader, manifest, container);
      loader.unload(manifest.id);

      expect(loader.isLoaded(manifest.id)).toBe(false);
    });
  });
});
