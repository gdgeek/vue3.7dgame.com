import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfigService from "../ConfigService";

const mockGet = vi.fn();

vi.mock("@/utils/request", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe("ConfigService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads plugin config without sending a domain query parameter", async () => {
    mockGet.mockResolvedValue({
      data: {
        version: "1.0.0",
        menuGroups: [],
        plugins: [],
      },
    });

    const service = new ConfigService();
    await service.loadApiConfig();

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining("/v1/plugin/list"),
      expect.objectContaining({
        skipErrorMessage: true,
      })
    );
    expect(mockGet.mock.calls[0]?.[1]?.params).toBeUndefined();
  });

  it("adds a time query parameter when loading local plugins config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "1.0.0",
        menuGroups: [],
        plugins: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(1712345678901);

    const service = new ConfigService();
    await service.loadLocalConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      "/config/plugins.json?time=1712345678901"
    );
  });

  it("normalizes blank plugin metadata required by the host registry", async () => {
    mockGet.mockResolvedValue({
      data: {
        version: "1.0.0",
        menuGroups: [
          {
            id: "org:public",
            name: "公共插件",
            icon: "Grid",
            order: 0,
          },
        ],
        plugins: [
          {
            id: "ai-3d-generator-v3",
            name: "AI 3D 生成器 V3",
            description: "",
            url: "http://localhost:3008/",
            icon: "MagicStick",
            group: "org:public",
            enabled: true,
            order: 0,
            accessScope: "manager-only",
            version: "",
          },
        ],
      },
    });

    const service = new ConfigService();
    const config = await service.loadApiConfig();

    expect(config.plugins).toEqual([
      expect.objectContaining({
        id: "ai-3d-generator-v3",
        description: "AI 3D 生成器 V3",
        version: "0.0.0",
        allowedOrigin: "http://localhost:3008",
        accessScope: "manager-only",
      }),
    ]);
  });
});
