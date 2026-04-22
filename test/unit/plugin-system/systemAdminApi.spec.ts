import { afterEach, describe, expect, it, vi } from "vitest";

const mockRequestGet = vi.fn();

vi.mock("@/utils/request", () => ({
  default: {
    get: (...args: unknown[]) => mockRequestGet(...args),
  },
}));

describe("systemAdminApi", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/environment");
  });

  it("builds plugin API URLs from the /api-config runtime base", async () => {
    vi.doMock("@/environment", () => ({
      default: {
        config_api: "/api-config/api",
      },
    }));

    const { buildSystemAdminUrl } = await import(
      "@/plugin-system/services/systemAdminApi"
    );

    expect(buildSystemAdminUrl("/v1/plugin/list")).toBe(
      "/api-config/api/v1/plugin/list"
    );
  });

  it("issues plugin list requests with an empty baseURL override so /api-config is not prefixed by /api", async () => {
    vi.doMock("@/environment", () => ({
      default: {
        config_api: "/api-config/api",
      },
    }));

    const { getSystemAdminPluginList } = await import(
      "@/plugin-system/services/systemAdminApi"
    );

    await getSystemAdminPluginList();

    expect(mockRequestGet).toHaveBeenCalledWith(
      "/api-config/api/v1/plugin/list",
      expect.objectContaining({
        authScope: "plugin",
        baseURL: "",
        skipErrorMessage: true,
      })
    );
  });

  it("overrides caller authScope and baseURL for system-admin requests", async () => {
    vi.doMock("@/environment", () => ({
      default: {
        config_api: "/api-config/api",
      },
    }));

    const { getSystemAdmin } = await import(
      "@/plugin-system/services/systemAdminApi"
    );

    await getSystemAdmin("/v1/plugin/list", {
      authScope: "host",
      baseURL: "/custom",
      params: { source: "test" },
    } as unknown as Parameters<typeof getSystemAdmin>[1]);

    expect(mockRequestGet).toHaveBeenCalledWith(
      "/api-config/api/v1/plugin/list",
      expect.objectContaining({
        authScope: "plugin",
        baseURL: "",
        params: { source: "test" },
      })
    );
  });
});
