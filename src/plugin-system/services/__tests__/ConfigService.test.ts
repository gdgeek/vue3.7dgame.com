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
});
