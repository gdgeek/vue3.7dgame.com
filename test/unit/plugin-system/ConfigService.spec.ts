import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { PluginsConfig, PluginManifest } from "@/plugin-system/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// Mock systemAdminApi (used by loadApiConfig)
const mockGetSystemAdminPluginList = vi.fn();
vi.mock("@/plugin-system/services/systemAdminApi", () => ({
  getSystemAdminPluginList: (...args: unknown[]) =>
    mockGetSystemAdminPluginList(...args),
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
    accessScope: "auth-only",
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

/**
 * Mock fetch for local config (/config/plugins.json) and plugin manifests.
 * API config uses request.get which is mocked separately.
 */
function mockLocalFetch(config: PluginsConfig | null, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? "OK" : "Not Found",
    json: vi.fn().mockResolvedValue(config),
  });
}

function mockLocalFetchError(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error);
}

function mockApiConfig(config: PluginsConfig | null) {
  if (config) {
    mockGetSystemAdminPluginList.mockResolvedValue({ data: { data: config } });
  } else {
    mockGetSystemAdminPluginList.mockRejectedValue(new Error("API error"));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfigService", () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    mockGetSystemAdminPluginList.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadStaticConfig (deprecated, maps to loadApiConfig)", () => {
    it("should load and return valid config from API", async () => {
      const config = makeConfig();
      mockApiConfig(config);

      const result = await service.loadStaticConfig();

      expect(result).toEqual(config);
    });

    it("should return empty config when API fails", async () => {
      mockApiConfig(null);

      const result = await service.loadStaticConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });
  });

  describe("loadConfig", () => {
    it("should derive allowedOrigin from url when local plugins.json omits it", async () => {
      const localConfig = makeConfig({
        plugins: [
          {
            ...makePlugin(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allowedOrigin: undefined as any,
            url: "https://local.example.com/app/index.html",
          },
        ],
      });
      mockLocalFetch(localConfig);
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].allowedOrigin).toBe("https://local.example.com");
      expect(result.plugins[0].accessScope).toBe("auth-only");
    });

    it("should derive allowedOrigin from url when API config omits it", async () => {
      mockLocalFetch({ version: "0.0.0", menuGroups: [], plugins: [] });
      mockApiConfig(
        makeConfig({
          plugins: [
            {
              ...makePlugin(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              allowedOrigin: undefined as any,
              url: "https://api.example.com/embedded/plugin",
            },
          ],
        })
      );

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].allowedOrigin).toBe("https://api.example.com");
      expect(result.plugins[0].accessScope).toBe("auth-only");
    });

    it("should default plugin accessScope to auth-only when omitted by API", async () => {
      mockLocalFetch({ version: "0.0.0", menuGroups: [], plugins: [] });
      mockApiConfig(
        makeConfig({
          plugins: [
            {
              ...makePlugin(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              accessScope: undefined as any,
            },
          ],
        })
      );

      const result = await service.loadConfig();

      expect(result.plugins[0].accessScope).toBe("auth-only");
    });

    it("should let local accessScope override API accessScope for the same plugin id", async () => {
      const apiPlugin = makePlugin({
        id: "shared",
        name: "API Name",
        accessScope: "auth-only",
      });
      mockApiConfig(makeConfig({ plugins: [apiPlugin] }));

      const localPlugin = makePlugin({
        id: "shared",
        name: "Local Name",
        accessScope: "root-only",
      });
      mockLocalFetch(makeConfig({ plugins: [localPlugin] }));

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("Local Name");
      expect(result.plugins[0].accessScope).toBe("root-only");
    });

    it("should return local config when API has no plugins", async () => {
      const localConfig = makeConfig();
      mockLocalFetch(localConfig);
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].id).toBe("test-plugin");
    });

    it("should return API config when local fetch fails", async () => {
      mockLocalFetchError(new Error("Network error"));
      const apiConfig = makeConfig({ version: "2.0.0" });
      mockApiConfig(apiConfig);

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.version).toBe("2.0.0");
    });

    it("should merge local plugins over API config by id", async () => {
      const apiPlugin = makePlugin({ id: "shared", name: "API Name" });
      mockApiConfig(makeConfig({ plugins: [apiPlugin] }));

      const localPlugin = makePlugin({ id: "shared", name: "Local Name" });
      mockLocalFetch(makeConfig({ plugins: [localPlugin] }));

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("Local Name");
    });

    it("should append new local plugins not in API config", async () => {
      const apiPlugin = makePlugin({ id: "api-only" });
      mockApiConfig(makeConfig({ plugins: [apiPlugin] }));

      const localPlugin = makePlugin({ id: "local-new", name: "New Plugin" });
      mockLocalFetch(makeConfig({ plugins: [localPlugin] }));

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(2);
      expect(result.plugins[0].id).toBe("api-only");
      expect(result.plugins[1].id).toBe("local-new");
    });

    it("should use local version when provided", async () => {
      mockApiConfig(makeConfig({ version: "1.0.0" }));
      mockLocalFetch(makeConfig({ version: "2.0.0" }));

      const result = await service.loadConfig();

      expect(result.version).toBe("2.0.0");
    });

    it("should merge local menuGroups over API menuGroups", async () => {
      mockApiConfig(makeConfig());
      const localGroups = [
        { id: "custom", name: "Custom", icon: "Star", order: 1 },
      ];
      mockLocalFetch(makeConfig({ menuGroups: localGroups }));

      const result = await service.loadConfig();

      // local menuGroups appended (different id from API's "tools")
      expect(result.menuGroups).toHaveLength(2);
      expect(result.menuGroups[1].id).toBe("custom");
    });
  });

  describe("getConfig (cache)", () => {
    it("should return null before loadConfig is called", () => {
      expect(service.getConfig()).toBeNull();
    });

    it("should return cached config after loadConfig", async () => {
      const config = makeConfig();
      mockLocalFetch(config);
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });

      await service.loadConfig();

      expect(service.getConfig()).not.toBeNull();
    });

    it("should return cached result on second loadConfig call without re-fetching", async () => {
      const config = makeConfig();
      mockLocalFetch(config);
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });

      await service.loadConfig();
      await service.loadConfig();

      // fetch called once for local, request.get called once for API
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockGetSystemAdminPluginList).toHaveBeenCalledTimes(1);
    });
  });

  describe("refreshConfig", () => {
    it("should clear cache and reload", async () => {
      mockLocalFetch(makeConfig({ version: "1.0.0" }));
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });
      await service.loadConfig();

      mockLocalFetch(makeConfig({ version: "2.0.0" }));
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });
      const result = await service.refreshConfig();

      expect(result.version).toBe("2.0.0");
    });

    it("should update getConfig after refresh", async () => {
      mockLocalFetch(makeConfig({ version: "1.0.0" }));
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });
      await service.loadConfig();

      mockLocalFetch(makeConfig({ version: "2.0.0" }));
      mockApiConfig({ version: "0.0.0", menuGroups: [], plugins: [] });
      await service.refreshConfig();

      expect(service.getConfig()?.version).toBe("2.0.0");
    });
  });

  describe("error handling", () => {
    it("should use empty config when both API and local fail", async () => {
      mockLocalFetchError(new Error("Network error"));
      mockApiConfig(null);

      const result = await service.loadConfig();

      expect(result).toEqual({
        version: "0.0.0",
        menuGroups: [],
        plugins: [],
      });
    });

    it("should use API config when local fetch returns invalid data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ invalid: true }),
      });
      const apiConfig = makeConfig();
      mockApiConfig(apiConfig);

      const result = await service.loadConfig();

      expect(result.plugins).toHaveLength(1);
    });
  });
});
