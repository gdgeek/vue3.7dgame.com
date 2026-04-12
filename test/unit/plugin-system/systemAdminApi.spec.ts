import { afterEach, describe, expect, it, vi } from "vitest";

describe("systemAdminApi", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/environment");
  });

  it("builds plugin API URLs from the /api-config runtime base", async () => {
    vi.doMock("@/environment", () => ({
      default: {
        config_api: "/api-config",
      },
    }));

    const { buildSystemAdminUrl } = await import(
      "@/plugin-system/services/systemAdminApi"
    );

    expect(buildSystemAdminUrl("/v1/plugin/list")).toBe(
      "/api-config/v1/plugin/list"
    );
    expect(buildSystemAdminUrl("v1/plugin/allowed-actions")).toBe(
      "/api-config/v1/plugin/allowed-actions"
    );
  });
});
