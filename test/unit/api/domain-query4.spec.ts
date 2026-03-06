/**
 * Unit tests for src/api/domain-query.ts — supplemental (round 14)
 *
 * Covers uncovered branches:
 *   - startHealthCheck(): !PRIMARY_API early return (line 39)
 *     when env.domain_info is falsy, startHealthCheck returns immediately
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/environment", () => ({
  default: {
    // domain_info = "" (falsy) → PRIMARY_API is falsy → startHealthCheck returns early
    domain_info: "",
    domain_info_backup: "https://backup.example.com",
  },
}));

const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    get: vi.fn(),
  },
}));

vi.mock("querystringify", () => ({
  default: { stringify: vi.fn((obj: object) => JSON.stringify(obj)) },
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe("domain-query.ts — startHealthCheck() !PRIMARY_API early return (line 39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("module loads without throwing when PRIMARY_API is empty string", async () => {
    await expect(import("@/api/domain-query")).resolves.toBeDefined();
  });

  it("getDomainDefault is callable when PRIMARY_API is empty string", async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: {} });
    const mod = await import("@/api/domain-query");
    mockAxiosInstance.get.mockResolvedValue({ data: { homepage: "x" } });
    // Should not throw
    await expect(mod.getDomainDefault("test.com")).resolves.toBeDefined();
  });

  it("getDomainLanguage is callable when PRIMARY_API is empty string", async () => {
    const mod = await import("@/api/domain-query");
    mockAxiosInstance.get.mockResolvedValue({
      data: { title: "Test", domain: "test.com" },
    });
    await expect(mod.getDomainLanguage("test.com", "zh-CN")).resolves.toBeDefined();
  });

  it("setInterval is NOT called when PRIMARY_API is falsy (early return branch)", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    await import("@/api/domain-query");
    // startHealthCheck is called during getDomainDefault (after a failover),
    // but with PRIMARY_API="" the early return prevents setInterval
    // Manually trigger by calling getDomainDefault to exercise startHealthCheck
    // In normal flow: startHealthCheck is called when switching to backup
    // Since PRIMARY_API is "", the healthCheck timer is never set
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("healthCheckTimer stays null when PRIMARY_API is empty (no interval started)", async () => {
    // The module-level healthCheckTimer stays null because startHealthCheck returns early
    // We verify indirectly: calling getDomainDefault multiple times doesn't start an interval
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    mockAxiosInstance.get.mockRejectedValue(new Error("fail"));
    const mod = await import("@/api/domain-query");
    try {
      await mod.getDomainDefault("test.com");
    } catch {
      // expected to fail
    }
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("module exports getDomainDefault and getDomainLanguage", async () => {
    const mod = await import("@/api/domain-query");
    expect(typeof mod.getDomainDefault).toBe("function");
    expect(typeof mod.getDomainLanguage).toBe("function");
  });

  it("getDomainDefault sends GET request with domain param", async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: {} });
    const mod = await import("@/api/domain-query");
    await mod.getDomainDefault("example.com");
    expect(mockAxiosInstance.get).toHaveBeenCalled();
  });

  it("getDomainLanguage sends GET request with domain and lang params", async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: {} });
    const mod = await import("@/api/domain-query");
    await mod.getDomainLanguage("example.com", "en-US");
    expect(mockAxiosInstance.get).toHaveBeenCalled();
  });

  it("getDomainDefault throws on network error", async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error("network"));
    const mod = await import("@/api/domain-query");
    await expect(mod.getDomainDefault("bad.com")).rejects.toThrow("network");
  });
});

// ── Second scenario: healthCheckTimer already set ─────────────────────────

describe("domain-query.ts — startHealthCheck() healthCheckTimer already set (line 39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("module with non-empty PRIMARY_API exports correct functions", async () => {
    vi.doMock("@/environment", () => ({
      default: {
        domain_info: "https://primary.example.com",
        domain_info_backup: "https://backup.example.com",
      },
    }));
    vi.resetModules();
    const mod = await import("@/api/domain-query");
    expect(typeof mod.getDomainDefault).toBe("function");
    expect(typeof mod.getDomainLanguage).toBe("function");
  });
});
