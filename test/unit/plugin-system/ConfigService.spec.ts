import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { PluginsConfig, PluginManifest } from "@/plugin-system/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the domain store
const mockDomainState: { defaultInfo: Record<string, unknown> | null } = {
  defaultInfo: null,
};

vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: vi.fn(() => mockDomainState),
  useDomainStore: vi.fn(() => mockDomainState),
}));

// Mock the logger
vi.mock("@/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }),
}));

// Import after mocks are set up
import { ConfigService } from "@/plugin-system/services/ConfigService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(overrides: Partial<PluginManifest> = {}): PluginManifest {
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

function makeConfig(overrides: Partial<PluginsConfig> = {}): PluginsConfig {
  return {
    version: "1.0.0",
    menuGroups: [{ id: "tools", name: "Tools", icon: "Tools", order: 1 }],
    plugins: [makePlugin()],
    ...overrides,
  };
}

/** Set up global.fetch to return a given config (or fail). */
function mockFetch(config: PluginsConfig | null, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? "OK" : "Not Found",
    json: vi.fn().mockResolvedValue(config),
  });
}

function mockFetchError(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfigService", () => {
  let service: ConfigService;

  beforeEach(() => {
    mockDomainState.defaultInfo = null;
    service = new ConfigService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadStaticConfig", () => {
    it("should load and return valid plugins.json", async () => {
      const config = makeConfig();
      mockFetch(config);

      const result = await service.loadStaticConfig();

      expect(result).toEqual(config);
      expect(global.fetch).toHaveBeenCalledWith("/config/plugins.json");
    });

    it("should return empty config when fetch fails (non-ok response)", async () => {
      mockFetch(null, false);

      const result = await service.loadStaticConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });

    it("should return empty config when fetch throws", async () => {
      mockFetchError(new Error("Network error"));

      const result = await service.loadStaticConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });

    it("should return empty config when JSON is invalid shape", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ invalid: true }),
      });

      const result = await service.loadStaticConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });
  });

  describe("getDomainPluginConfig", () => {
    it("should return null when domain info is not loaded", () => {
      mockDomainState.defaultInfo = null;

      const result = service.getDomainPluginConfig();

      expect(result).toBeNull();
    });

    it("should return null when domain info has no plugins field", () => {
      mockDomainState.defaultInfo = {
        homepage: "https://example.com",
        lang: "zh-CN",
        style: 1,
        blog: "",
        icon: "",
      };

      const result = service.getDomainPluginConfig();

      expect(result).toBeNull();
    });

    it("should return plugin config when domain info has valid plugins", () => {
      const domainPlugin = makePlugin({
        id: "domain-plugin",
        name: "Domain Plugin",
      });
      mockDomainState.defaultInfo = {
        homepage: "https://example.com",
        lang: "zh-CN",
        style: 1,
        blog: "",
        icon: "",
        plugins: {
          version: "2.0.0",
          plugins: [domainPlugin],
          menuGroups: [],
        },
      };

      const result = service.getDomainPluginConfig();

      expect(result).not.toBeNull();
      expect(result?.version).toBe("2.0.0");
      expect(result?.plugins).toEqual([domainPlugin]);
    });

    it("should return null when domain plugins data is invalid", () => {
      mockDomainState.defaultInfo = {
        homepage: "https://example.com",
        plugins: "not-an-object",
      };

      const result = service.getDomainPluginConfig();

      expect(result).toBeNull();
    });

    it("should return null when domain plugins is object but missing plugins array", () => {
      mockDomainState.defaultInfo = {
        homepage: "https://example.com",
        plugins: { version: "1.0.0" },
      };

      const result = service.getDomainPluginConfig();

      expect(result).toBeNull();
    });
  });

  describe("loadConfig", () => {
    it("should return static config when domain has no plugins", async () => {
      const staticConfig = makeConfig();
      mockFetch(staticConfig);
      mockDomainState.defaultInfo = {
        homepage: "https://example.com",
        lang: "zh-CN",
        style: 1,
        blog: "",
        icon: "",
      };

      const result = await service.loadConfig();

      expect(result).toEqual(staticConfig);
    });

    it("should return static config when domain info is null", async () => {
      const staticConfig = makeConfig();
      mockFetch(staticConfig);
      mockDomainState.defaultInfo = null;

      const result = await service.loadConfig();

      expect(result).toEqual(staticConfig);
    });

    it("should merge domain plugins over static config by id", async () => {
      const staticPlugin = makePlugin({ id: "shared", name: "Static Name" });
      const staticConfig = makeConfig({ plugins: [staticPlugin] });
      mockFetch(staticConfig);

      const domainPlugin = makePlugin({ id: "shared", name: "Domain Name" });
      mockDomainState.defaultInfo = {
        plugins: {
          plugins: [domainPlugin],
        },
      };

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("Domain Name");
    });

    it("should append new domain plugins not in static config", async () => {
      const staticPlugin = makePlugin({ id: "static-only" });
      const staticConfig = makeConfig({ plugins: [staticPlugin] });
      mockFetch(staticConfig);

      const newPlugin = makePlugin({ id: "domain-new", name: "New Plugin" });
      mockDomainState.defaultInfo = {
        plugins: {
          plugins: [newPlugin],
        },
      };

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(2);
      expect(result.plugins[0].id).toBe("static-only");
      expect(result.plugins[1].id).toBe("domain-new");
    });

    it("should use domain version when provided", async () => {
      const staticConfig = makeConfig({ version: "1.0.0" });
      mockFetch(staticConfig);

      mockDomainState.defaultInfo = {
        plugins: {
          version: "2.0.0",
          plugins: [],
        },
      };

      const result = await service.loadConfig();

      expect(result.version).toBe("2.0.0");
    });

    it("should use domain menuGroups when provided", async () => {
      const staticConfig = makeConfig();
      mockFetch(staticConfig);

      const domainGroups = [
        { id: "custom", name: "Custom", icon: "Star", order: 1 },
      ];
      mockDomainState.defaultInfo = {
        plugins: {
          plugins: [],
          menuGroups: domainGroups,
        },
      };

      const result = await service.loadConfig();

      expect(result.menuGroups).toEqual(domainGroups);
    });
  });

  describe("getConfig (cache)", () => {
    it("should return null before loadConfig is called", () => {
      expect(service.getConfig()).toBeNull();
    });

    it("should return cached config after loadConfig", async () => {
      const config = makeConfig();
      mockFetch(config);

      await service.loadConfig();

      expect(service.getConfig()).toEqual(config);
    });

    it("should return cached result on second loadConfig call without re-fetching", async () => {
      const config = makeConfig();
      mockFetch(config);

      await service.loadConfig();
      await service.loadConfig();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("refreshConfig", () => {
    it("should clear cache and reload", async () => {
      const config1 = makeConfig({ version: "1.0.0" });
      mockFetch(config1);
      await service.loadConfig();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const config2 = makeConfig({ version: "2.0.0" });
      mockFetch(config2);
      const result = await service.refreshConfig();

      expect(result.version).toBe("2.0.0");
      // New spy was created by mockFetch, so it should be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should update getConfig after refresh", async () => {
      const config1 = makeConfig({ version: "1.0.0" });
      mockFetch(config1);
      await service.loadConfig();

      const config2 = makeConfig({ version: "2.0.0" });
      mockFetch(config2);
      await service.refreshConfig();

      expect(service.getConfig()?.version).toBe("2.0.0");
    });
  });

  describe("error handling", () => {
    it("should use empty config when plugins.json fails and no domain config", async () => {
      mockFetchError(new Error("Network error"));
      mockDomainState.defaultInfo = null;

      const result = await service.loadConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });

    it("should ignore invalid domain data and use static config", async () => {
      const staticConfig = makeConfig();
      mockFetch(staticConfig);
      mockDomainState.defaultInfo = {
        plugins: "invalid-data",
      };

      const result = await service.loadConfig();

      expect(result).toEqual(staticConfig);
    });
  });
});
