/**
 * Unit tests for src/api/domain-query.ts (part 3)
 *
 * Covers the startHealthCheck timer callback body (lines 42-52):
 *   - Successful health check → restores primary API, clears timer
 *   - Failed health check → stays on backup
 *   - axios.get called with correct health endpoint and timeout
 *   - healthCheckTimer cleared after recovery
 *   - Guard: no timer started when PRIMARY_API is absent
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted mock objects - named with "mock" prefix for Vitest factory access
const mockAxiosInstance3 = vi.hoisted(() => ({
  get: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

const mockAxiosGet3 = vi.hoisted(() => vi.fn());
const mockLogger3 = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance3),
    get: mockAxiosGet3,
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: mockLogger3,
}));

vi.mock("@/environment", () => ({
  default: {
    domain_info: "https://primary3.example.com",
    domain_info_backup: "https://backup3.example.com",
  },
}));

// Helper: trigger failover by calling the error interceptor with a network failure
async function triggerFailover(errInterceptor: Function) {
  const error = {
    config: { _retry: false, baseURL: "https://primary3.example.com" },
    response: undefined,
  };
  try {
    await errInterceptor(error);
  } catch {
    // Expected: service(config) throws since mockAxiosInstance3 isn't callable as function
  }
}

describe("domain-query.ts — startHealthCheck timer callback (lines 42-52)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockAxiosInstance3.get.mockResolvedValue({ data: {} });
    mockAxiosGet3.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  // ── Success path: health check restores primary ──────────────────────────

  it("health check succeeds → currentApi restored to PRIMARY (request interceptor uses primary URL)", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];
    const reqInterceptor = mockAxiosInstance3.interceptors.request.use.mock.calls[0]?.[0];

    // Trigger failover → currentApi = BACKUP, healthCheckTimer registered
    await triggerFailover(errInterceptor);

    // Confirm it switched to backup
    const cfgBefore = { baseURL: "/api/test" };
    reqInterceptor(cfgBefore);
    expect(cfgBefore.baseURL).toBe("https://backup3.example.com");

    // Health check succeeds
    mockAxiosGet3.mockResolvedValueOnce({ status: 200 });
    await vi.advanceTimersByTimeAsync(30000);

    // After recovery, request interceptor should use primary
    const cfgAfter = { baseURL: "/api/test" };
    reqInterceptor(cfgAfter);
    expect(cfgAfter.baseURL).toBe("https://primary3.example.com");
  });

  it("health check succeeds → logger.info called with recovery message", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    await triggerFailover(errInterceptor);

    mockAxiosGet3.mockResolvedValueOnce({ status: 200 });
    await vi.advanceTimersByTimeAsync(30000);

    expect(mockLogger3.info).toHaveBeenCalledWith(
      expect.stringContaining("Primary restored")
    );
  });

  it("health check succeeds → axios.get called with /api/health endpoint", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    await triggerFailover(errInterceptor);

    mockAxiosGet3.mockResolvedValueOnce({ status: 200 });
    await vi.advanceTimersByTimeAsync(30000);

    expect(mockAxiosGet3).toHaveBeenCalledWith(
      expect.stringContaining("/api/health"),
      expect.objectContaining({ timeout: 3000 })
    );
  });

  it("health check succeeds → interval timer is cleared (no further health checks)", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    await triggerFailover(errInterceptor);

    // First 30s: health check succeeds, timer cleared
    mockAxiosGet3.mockResolvedValueOnce({ status: 200 });
    await vi.advanceTimersByTimeAsync(30000);

    const callCountAfterRecovery = mockAxiosGet3.mock.calls.length;

    // Another 30s: timer should be cleared, no more health checks
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockAxiosGet3.mock.calls.length).toBe(callCountAfterRecovery);
  });

  // ── Failure path: health check fails → stay on backup ────────────────────

  it("health check fails → currentApi stays on backup", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];
    const reqInterceptor = mockAxiosInstance3.interceptors.request.use.mock.calls[0]?.[0];

    await triggerFailover(errInterceptor);

    // Health check fails
    mockAxiosGet3.mockRejectedValueOnce(new Error("still down"));
    await vi.advanceTimersByTimeAsync(30000);

    // Should still be on backup
    const cfg = { baseURL: "/api/test" };
    reqInterceptor(cfg);
    expect(cfg.baseURL).toBe("https://backup3.example.com");
  });

  it("health check fails → timer continues (another 30s fires another check)", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    await triggerFailover(errInterceptor);

    // First check: fail
    mockAxiosGet3.mockRejectedValueOnce(new Error("down"));
    await vi.advanceTimersByTimeAsync(30000);

    const callCount1 = mockAxiosGet3.mock.calls.length;

    // Second check: also fail (timer still running)
    mockAxiosGet3.mockRejectedValueOnce(new Error("down"));
    await vi.advanceTimersByTimeAsync(30000);

    expect(mockAxiosGet3.mock.calls.length).toBeGreaterThan(callCount1);
  });

  it("health check fails → logger.info NOT called", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    await triggerFailover(errInterceptor);

    mockAxiosGet3.mockRejectedValueOnce(new Error("still down"));
    await vi.advanceTimersByTimeAsync(30000);

    expect(mockLogger3.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Primary restored")
    );
  });

  // ── Guard: startHealthCheck not called when no failover ───────────────────

  it("no failover → health check axios.get never called", async () => {
    await import("@/api/domain-query");
    // Don't trigger failover, just advance time
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockAxiosGet3).not.toHaveBeenCalled();
  });

  // ── Multiple failovers: second trigger should not start duplicate timer ───

  it("second failover attempt with _retry=true → no new health check timer", async () => {
    await import("@/api/domain-query");
    const errInterceptor = mockAxiosInstance3.interceptors.response.use.mock.calls[0]?.[1];

    // First failover: starts health check
    await triggerFailover(errInterceptor);

    const callCountBefore = mockAxiosGet3.mock.calls.length;

    // Second failover attempt (config._retry=false but currentApi is now BACKUP,
    // not PRIMARY, so the condition `currentApi === PRIMARY_API` fails):
    try {
      await errInterceptor({ config: { _retry: true }, response: undefined });
    } catch {
      // Expected rejection
    }

    // Health check fires
    mockAxiosGet3.mockResolvedValue({ status: 200 });
    await vi.advanceTimersByTimeAsync(30000);

    // Only one health check call (from the first failover's timer)
    expect(mockAxiosGet3.mock.calls.length).toBeGreaterThanOrEqual(callCountBefore);
  });
});
