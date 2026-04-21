import { afterEach, describe, expect, it, vi } from "vitest";

const mockRequestGet = vi.fn();

vi.mock("@/utils/request", () => ({
  default: {
    get: (...args: unknown[]) => mockRequestGet(...args),
  },
}));

describe("hostSessionApi", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("verifies plugin host roles through /v1/plugin/verify-token", async () => {
    const { verifyPluginHostSession } = await import(
      "@/plugin-system/services/hostSessionApi"
    );

    await verifyPluginHostSession();

    expect(mockRequestGet).toHaveBeenCalledWith(
      "/v1/plugin/verify-token",
      expect.objectContaining({
        authScope: "host",
        skipErrorMessage: true,
      })
    );
  });

  it("does not expose the legacy /v1/user/info probe helper anymore", async () => {
    const module = await import("@/plugin-system/services/hostSessionApi");

    expect("probeHostSession" in module).toBe(false);
  });
});
