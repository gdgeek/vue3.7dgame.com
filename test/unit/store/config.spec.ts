/**
 * Unit tests for src/store/modules/config.ts — useFileStore
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/environment", () => ({ default: { useCloud: vi.fn() } }));
vi.mock("@/assets/js/file/tencent-cloud", () => ({
  default: { name: "tencent-cloud" },
}));
vi.mock("@/assets/js/file/server", () => ({
  default: { name: "local-server" },
}));

describe("useFileStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("store is the cloud adapter when useCloud() returns true", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { useFileStore } = await import("@/store/modules/config");
    const fileStore = useFileStore();
    expect((fileStore.store as { name: string }).name).toBe("tencent-cloud");
  });

  it("store is the server adapter when useCloud() returns false", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { useFileStore } = await import("@/store/modules/config");
    const fileStore = useFileStore();
    expect((fileStore.store as { name: string }).name).toBe("local-server");
  });

  it("exposes a store property", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { useFileStore } = await import("@/store/modules/config");
    const fileStore = useFileStore();
    expect("store" in fileStore).toBe(true);
  });

  it("useCloud is called exactly once per store instantiation", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { useFileStore } = await import("@/store/modules/config");
    useFileStore();
    expect(env.useCloud).toHaveBeenCalledTimes(1);
  });

  it("calling useFileStore twice returns same pinia instance", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { useFileStore } = await import("@/store/modules/config");
    const a = useFileStore();
    const b = useFileStore();
    expect(a).toBe(b);
  });

  it("store property on local-server adapter is defined", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { useFileStore } = await import("@/store/modules/config");
    const fileStore = useFileStore();
    expect(fileStore.store).toBeDefined();
  });

  it("cloud store has a different name than local-server store", async () => {
    const env = (await import("@/environment")).default;
    (env.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { useFileStore: useCloudStore } = await import(
      "@/store/modules/config"
    );
    const cloudStore = useCloudStore();
    const cloudName = (cloudStore.store as { name: string }).name;

    // Reset for local store test
    setActivePinia(createPinia());
    vi.resetModules();
    vi.clearAllMocks();
    const env2 = (await import("@/environment")).default;
    (env2.useCloud as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { useFileStore: useLocalStore } = await import(
      "@/store/modules/config"
    );
    const localStore = useLocalStore();
    const localName = (localStore.store as { name: string }).name;

    expect(cloudName).not.toBe(localName);
  });
});
