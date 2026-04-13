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

  it("probes the host session through /v1/user/info", async () => {
    const { probeHostSession } = await import(
      "@/plugin-system/services/hostSessionApi"
    );

    await probeHostSession();

    expect(mockRequestGet).toHaveBeenCalledWith(
      "/v1/user/info",
      expect.objectContaining({
        authScope: "host",
        skipErrorMessage: true,
      })
    );
  });
});
