import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("runtime deployment environment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "__ENV__");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "__ENV__");
  });

  it("defaults to cloud when no runtime config is loaded", async () => {
    const env = (await import("@/environment")).default;

    expect(env.deploymentMode()).toBe("cloud");
    expect(env.fileStorageDriver()).toBe("cos");
    expect(env.useCloud()).toBe(true);
  });

  it("uses backend runtime config before frontend env values", async () => {
    window.__ENV__ = {
      DEPLOYMENT_MODE: "cloud",
      FILE_STORAGE_DRIVER: "cos",
    };
    const { default: env, setRuntimeDeploymentConfig } = await import(
      "@/environment"
    );

    setRuntimeDeploymentConfig({
      deploymentMode: "local",
      storageDriver: "local",
    });

    expect(env.deploymentMode()).toBe("local");
    expect(env.fileStorageDriver()).toBe("local");
    expect(env.useCloud()).toBe(false);
  });

  it("loads runtime config from the main backend deployment endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        deploymentMode: "local",
        storageDriver: "local",
      }),
    });
    const { default: env, initializeDeploymentConfig } = await import(
      "@/environment"
    );

    await initializeDeploymentConfig(fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/v1/system/deployment"),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      })
    );
    expect(env.deploymentMode()).toBe("local");
    expect(env.useCloud()).toBe(false);
  });

  it("blocks implicit cloud behavior when runtime config loading fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const {
      default: env,
      deploymentConfigLoadFailed,
      initializeDeploymentConfig,
    } = await import("@/environment");

    await initializeDeploymentConfig(fetcher as unknown as typeof fetch);

    expect(deploymentConfigLoadFailed()).toBe(true);
    expect(env.deploymentMode()).toBe("local");
    expect(env.useCloud()).toBe(false);
    warn.mockRestore();
  });

  it("allows an explicit legacy cloud storage override after config loading fails", async () => {
    window.__ENV__ = { FILE_STORAGE_DRIVER: "cos" };
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { default: env, initializeDeploymentConfig } = await import(
      "@/environment"
    );

    await initializeDeploymentConfig(fetcher as unknown as typeof fetch);

    expect(env.useCloud()).toBe(true);
    warn.mockRestore();
  });
});
