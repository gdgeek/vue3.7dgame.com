import { describe, it, expect, beforeEach } from "vitest";

import { PluginRegistry } from "@/plugin-system/core/PluginRegistry";

import type { PluginManifest, ValidationResult } from "@/plugin-system/types";

/** Helper to create a valid manifest */
function createValidManifest(
  overrides: Partial<PluginManifest> = {}
): PluginManifest {
  return {
    id: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    url: "https://test.example.com",
    icon: "Edit",
    group: "tools",
    enabled: true,
    order: 1,
    allowedOrigin: "https://test.example.com",
    version: "1.0.0",
    ...overrides,
  };
}

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe("register", () => {
    it("should register a valid plugin", () => {
      const manifest = createValidManifest();
      registry.register(manifest);
      expect(registry.get("test-plugin")).toEqual(manifest);
    });

    it("should throw when registering an invalid manifest", () => {
      const invalid = createValidManifest({ id: "" });
      expect(() => registry.register(invalid)).toThrow("Invalid manifest");
    });

    it("should overwrite an existing plugin with the same id", () => {
      registry.register(createValidManifest());
      const updated = createValidManifest({ name: "Updated" });
      registry.register(updated);
      expect(registry.get("test-plugin")?.name).toBe("Updated");
    });
  });

  describe("unregister", () => {
    it("should remove a registered plugin", () => {
      registry.register(createValidManifest());
      registry.unregister("test-plugin");
      expect(registry.get("test-plugin")).toBeUndefined();
    });

    it("should not throw when unregistering a non-existent plugin", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("get", () => {
    it("should return undefined for unregistered plugin", () => {
      expect(registry.get("missing")).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return empty array when no plugins registered", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("should return all registered plugins", () => {
      registry.register(createValidManifest({ id: "a" }));
      registry.register(createValidManifest({ id: "b" }));
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe("getByGroup", () => {
    it("should filter plugins by group", () => {
      registry.register(createValidManifest({ id: "a", group: "editors" }));
      registry.register(createValidManifest({ id: "b", group: "tools" }));
      registry.register(createValidManifest({ id: "c", group: "editors" }));

      const editors = registry.getByGroup("editors");
      expect(editors).toHaveLength(2);
      expect(editors.every((p: PluginManifest) => p.group === "editors")).toBe(
        true
      );
    });

    it("should return empty array for non-existent group", () => {
      registry.register(createValidManifest());
      expect(registry.getByGroup("nonexistent")).toEqual([]);
    });
  });

  describe("validateManifest", () => {
    it("should accept a valid manifest", () => {
      const result = registry.validateManifest(createValidManifest());
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should accept a manifest with optional fields", () => {
      const manifest = createValidManifest({
        sandbox: "allow-scripts",
        extraConfig: { theme: "dark" },
      });
      const result = registry.validateManifest(manifest);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should reject manifest with missing required field", () => {
      const manifest = createValidManifest();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (manifest as any).name;
      const result = registry.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("name"))).toBe(true);
    });

    it("should reject manifest with wrong field type", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manifest = createValidManifest({ enabled: "yes" as any });
      const result = registry.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("enabled"))).toBe(
        true
      );
    });

    it("should reject manifest with empty string fields", () => {
      const manifest = createValidManifest({ url: "  " });
      const result = registry.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("url"))).toBe(true);
    });

    it("should report multiple errors at once", () => {
      const manifest = createValidManifest({
        id: "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: "" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enabled: 1 as any,
      });
      const result = registry.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
