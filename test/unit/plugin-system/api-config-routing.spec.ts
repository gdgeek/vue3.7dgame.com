import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequestGet = vi.fn();

vi.mock("@/environment", () => ({
  default: {
    config_api: "/api-config/api",
  },
}));

vi.mock("@/utils/request", () => ({
  default: {
    get: (...args: unknown[]) => mockRequestGet(...args),
  },
}));

describe("web api-config routing semantics", () => {
  beforeEach(() => {
    mockRequestGet.mockReset();
    vi.resetModules();
  });

  it("systemAdminApi routes plugin list requests via /api-config/api/v1/plugin/list", async () => {
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

  it("ConfigService delegates plugin list loading to systemAdminApi", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/plugin-system/services/ConfigService.ts"),
      "utf-8"
    );

    expect(source).toContain("getSystemAdminPluginList()");
    expect(source).not.toContain('request.get("/v1/plugin/list"');
  });

  it("plugin-system store no longer delegates visibility loading to systemAdmin allowed-actions", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/store/modules/plugin-system.ts"),
      "utf-8"
    );

    expect(source).toContain("verifyPluginHostSession");
    expect(source).not.toContain("getSystemAdminAllowedActions(");
    expect(source).not.toContain('request.get("/v1/plugin/allowed-actions"');
  });

  it("hostSessionApi resolves visibility through /v1/plugin/verify-token", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/plugin-system/services/hostSessionApi.ts"),
      "utf-8"
    );

    expect(source).toContain('request.get("/v1/plugin/verify-token"');
    expect(source).not.toContain('request.get("/v1/user/info"');
  });

  it("vite dev server proxies /api-config to the system-admin backend", () => {
    const source = readFileSync(
      resolve(process.cwd(), "vite.config.ts"),
      "utf-8"
    );

    expect(source).toContain('"/api-config"');
    expect(source).toContain("VITE_APP_CONFIG_API_URL");
    expect(source).toContain('path.replace(/^\\/api-config/, "")');
  });

  it("nginx template keeps a dedicated placeholder for /api-config proxy locations", () => {
    const source = readFileSync(
      resolve(process.cwd(), "nginx.conf.template"),
      "utf-8"
    );

    expect(source).toContain("# __CONFIG_LOCATIONS__");
    expect(source).not.toMatch(/location\s+\/api-config\/\s*\{/);
  });

  it("docker entrypoint generates /api-config upstreams from APP_CONFIG_N_URL", () => {
    const source = readFileSync(
      resolve(process.cwd(), "docker-entrypoint.sh"),
      "utf-8"
    );

    expect(source).toContain(
      'generate_lb_config "APP_CONFIG" "/api-config/" "config"'
    );
    expect(source).toContain("APP_CONFIG");
    expect(source).toContain("__CONFIG_LOCATIONS__");
  });

  it("local plugin config marks user-management as root-only", () => {
    const source = readFileSync(
      resolve(process.cwd(), "public/config/plugins.json"),
      "utf-8"
    );

    expect(source).toContain('"id": "user-management"');
    expect(source).toContain('"accessScope": "root-only"');
    expect(source).not.toContain('"accessScope": "admin-only"');
  });

  it("production docker compose provides APP_CONFIG upstreams", () => {
    const source = readFileSync(
      resolve(process.cwd(), "docker-compose.prod.yml"),
      "utf-8"
    );

    expect(source).toContain("APP_CONFIG_1_URL=");
  });
});
