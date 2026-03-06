/**
 * Unit tests for src/utils/failover.ts
 * Covers: createFailoverAxios — options parsing, interceptors, failover logic
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock axios ─────────────────────────────────────────────────────────────

const requestHandlers: Array<(config: Record<string, unknown>) => unknown> = [];
const responseHandlers: Array<{
  success: (r: unknown) => unknown;
  error: (e: unknown) => Promise<unknown>;
}> = [];

const mockService = vi.hoisted(() => {
  const fn = Object.assign(vi.fn().mockResolvedValue({ data: "ok" }), {
    interceptors: {
      request: {
        use: vi.fn((handler) => requestHandlers.push(handler)),
      },
      response: {
        use: vi.fn((onSuccess, onError) =>
          responseHandlers.push({ success: onSuccess, error: onError })
        ),
      },
    },
  });
  return fn;
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockService),
    get: vi.fn().mockResolvedValue({ status: 200 }),
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), log: vi.fn(), error: vi.fn() },
}));

describe("createFailoverAxios", () => {
  let axios: typeof import("axios").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    requestHandlers.length = 0;
    responseHandlers.length = 0;
    axios = (await import("axios")).default;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("calls axios.create with the primary URL as baseURL", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://primary.example.com" })
    );
  });

  it("returns the created axios instance", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    const instance = createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    expect(instance).toBe(mockService);
  });

  it("registers a request interceptor", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    expect(mockService.interceptors.request.use).toHaveBeenCalled();
  });

  it("registers a response interceptor", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    expect(mockService.interceptors.response.use).toHaveBeenCalled();
  });

  it("request interceptor preserves config.baseURL when it starts with 'http'", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    const handler = requestHandlers[0] as (
      c: Record<string, unknown>
    ) => Record<string, unknown>;
    const config = { baseURL: "https://override.example.com" };
    const result = handler(config);
    expect((result as Record<string, unknown>).baseURL).toBe(
      "https://override.example.com"
    );
  });

  it("request interceptor sets baseURL from currentApi when config.baseURL is falsy", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    const handler = requestHandlers[0] as (
      c: Record<string, unknown>
    ) => Record<string, unknown>;
    const config: Record<string, unknown> = { baseURL: "" };
    const result = handler(config);
    expect((result as Record<string, unknown>).baseURL).toBe(
      "https://primary.example.com"
    );
  });

  it("response success interceptor returns the response unchanged", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    const { success } = responseHandlers[0];
    const fakeResponse = { status: 200, data: "hello" };
    expect(success(fakeResponse)).toBe(fakeResponse);
  });

  it("response error interceptor switches to backup when primary unreachable", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    const { error: errorHandler } = responseHandlers[0];

    // Simulate network error (no response) on a fresh request
    const fakeError = {
      config: { baseURL: "https://primary.example.com" },
      response: undefined,
    };
    mockService.mockResolvedValueOnce({ data: "backup-ok" });
    await errorHandler(fakeError);

    // After failover, service should have been called with updated config
    expect(mockService).toHaveBeenCalled();
  });

  it("response error interceptor rejects when already retried (_retry=true)", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
    });
    const { error: errorHandler } = responseHandlers[0];

    const fakeError = {
      config: { _retry: true, baseURL: "https://backup.example.com" },
      response: undefined,
    };
    await expect(errorHandler(fakeError)).rejects.toEqual(fakeError);
  });

  it("accepts custom healthPath and axiosConfig", async () => {
    const { createFailoverAxios } = await import("@/utils/failover");
    createFailoverAxios({
      primaryUrl: "https://primary.example.com",
      backupUrl: "https://backup.example.com",
      healthPath: "/ping",
      axiosConfig: { timeout: 5000 },
      logTag: "[MyTag]",
    });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 5000 })
    );
  });
});
