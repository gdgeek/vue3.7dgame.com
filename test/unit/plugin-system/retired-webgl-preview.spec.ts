import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginManifest, PluginsConfig } from "@/plugin-system/types";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/plugin-system/services/systemAdminApi", () => ({
  getSystemAdminPluginList: api,
}));
vi.mock("@/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
import { ConfigService } from "@/plugin-system/services/ConfigService";

const plugin = (id: string): PluginManifest => ({
  id,
  name: id,
  description: id,
  version: "1.0.0",
  enabled: true,
  url: `https://${id}.example.com/`,
  allowedOrigin: `https://${id}.example.com`,
  group: "tools",
  icon: "Tools",
  order: 1,
  accessScope: "auth-only",
});
const config = (ids: string[]): PluginsConfig => ({
  version: "1.0.0",
  menuGroups: [],
  plugins: ids.map(plugin),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
describe("retired standalone WebGL plugin", () => {
  it.each(["api", "local", "both"])(
    "does not register the retired plugin from %s config",
    async (source) => {
      const apiIds = [
        "editor",
        ...(source !== "local" ? ["webgl-preview"] : []),
      ];
      const localIds = [
        "system-admin",
        ...(source !== "api" ? ["webgl-preview"] : []),
      ];
      api.mockResolvedValue({ data: { data: config(apiIds) } });
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: async () => config(localIds) })
      );
      const service = new ConfigService();
      expect((await service.loadConfig()).plugins.map(({ id }) => id)).toEqual([
        "editor",
        "system-admin",
      ]);
      expect(
        (await service.refreshConfig()).plugins.map(({ id }) => id)
      ).toEqual(["editor", "system-admin"]);
    }
  );
});
