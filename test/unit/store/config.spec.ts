/**
 * Unit tests for src/store/modules/config.ts — useFileStore
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/environment", () => ({ default: { useCloud: vi.fn() } }));
vi.mock("@/assets/js/file/tencent-cloud", () => ({ default: { name: "tencent-cloud" } }));
vi.mock("@/assets/js/file/server", () => ({ default: { name: "local-server" } }));

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
});
