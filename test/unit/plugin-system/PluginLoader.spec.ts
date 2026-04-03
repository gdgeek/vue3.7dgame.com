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

/**
 * Helper: load a plugin and immediately fire the iframe 'load' event
 * so the promise resolves without waiting for a real network request.
 */
async function loadWithAutoFire(
  loader: PluginLoader,
  manifest: PluginManifest,
  container: HTMLElement
): Promise<LoadedPlugin> {
  const loadPromise = loader.load(manifest.id, manifest, container);

  // The iframe has been appended synchronously — grab it and fire 'load'
  const iframe = container.querySelector("iframe") as HTMLIFrameElement;
  iframe.dispatchEvent(new Event("load"));

  return loadPromise;
}

describe("PluginLoader", () => {
  let loader: PluginLoader;
  let container: HTMLElement;

  beforeEach(() => {
    loader = new PluginLoader();
    container = createContainer();
  });

  describe("load", () => {
    it("should create an iframe with correct src attribute", async () => {
      const manifest = createManifest({ url: "https://editor.example.com/v2" });
      await loadWithAutoFire(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.src).toBe("https://editor.example.com/v2?v=1.0.0");
    });

    it("should set default sandbox attribute when manifest.sandbox is undefined", async () => {
      const manifest = createManifest({ sandbox: undefined });
      await loadWithAutoFire(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).toBe(
        "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      );
    });

    it("should use custom sandbox attribute from manifest", async () => {
      const manifest = createManifest({ sandbox: "allow-scripts" });
      await loadWithAutoFire(loader, manifest, container);

      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts");
    });

    it("should set iframe style to fill container with no border", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);

      const iframe = container.querySelector("iframe") as HTMLIFrameElement;
      expect(iframe.style.width).toBe("100%");
      expect(iframe.style.height).toBe("100%");
      expect(iframe.style.border).toBe("0px");
    });

    it("should append iframe to the container element", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);

      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe("IFRAME");
    });

    it("should return a LoadedPlugin record with correct fields", async () => {
      const manifest = createManifest({ id: "my-plugin" });
      const before = Date.now();
      const result = await loadWithAutoFire(loader, manifest, container);

      expect(result.pluginId).toBe("my-plugin");
      expect(result.iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(result.origin).toBe(manifest.allowedOrigin);
      expect(result.state).toBe("active");
      expect(result.loadedAt).toBeGreaterThanOrEqual(before);
    });

    it("should not auto-send INIT postMessage after load (INIT is sent by PluginSystem on PLUGIN_READY)", async () => {
      const manifest = createManifest();

      const loadPromise = loader.load(manifest.id, manifest, container);
      const iframe = container.querySelector("iframe") as HTMLIFrameElement;

      // Spy on contentWindow.postMessage (jsdom provides a contentWindow)
      const postMessageSpy = vi.fn();
      Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage: postMessageSpy },
        writable: true,
      });

      iframe.dispatchEvent(new Event("load"));
      await loadPromise;

      // load() no longer sends INIT — that's handled by PluginSystem after PLUGIN_READY
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it("should return existing record if plugin is already loaded", async () => {
      const manifest = createManifest();
      const first = await loadWithAutoFire(loader, manifest, container);
      const second = await loadWithAutoFire(loader, manifest, container);

      expect(second).toBe(first);
      // Only one iframe should exist
      expect(container.querySelectorAll("iframe").length).toBe(1);
    });
  });

  describe("load timeout", () => {
    it("should resolve even when iframe does not fire load event (no timeout rejection)", async () => {
      const manifest = createManifest();
      const loadPromise = loader.load(manifest.id, manifest, container);

      // load() now resolves immediately without waiting for iframe load event
      const result = await loadPromise;
      expect(result.pluginId).toBe(manifest.id);
    });
  });

  describe("unload", () => {
    it("should remove iframe from DOM", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);

      expect(container.querySelector("iframe")).not.toBeNull();

      loader.unload(manifest.id);

      expect(container.querySelector("iframe")).toBeNull();
    });

    it("should remove plugin from loaded map", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);

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
      const loaded = await loadWithAutoFire(loader, manifest, container);

      expect(loader.getLoaded("alpha")).toBe(loaded);
    });

    it("should return undefined for unknown plugin", () => {
      expect(loader.getLoaded("unknown")).toBeUndefined();
    });
  });

  describe("isLoaded", () => {
    it("should return true for a loaded plugin", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);

      expect(loader.isLoaded(manifest.id)).toBe(true);
    });

    it("should return false for an unloaded plugin", () => {
      expect(loader.isLoaded("nope")).toBe(false);
    });

    it("should return false after unloading", async () => {
      const manifest = createManifest();
      await loadWithAutoFire(loader, manifest, container);
      loader.unload(manifest.id);

      expect(loader.isLoaded(manifest.id)).toBe(false);
    });
  });
});
