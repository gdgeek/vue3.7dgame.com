/**
 * Unit tests for src/store/modules/domain.ts — supplemental (round 14)
 *
 * Covers uncovered branches in getDomainForQuery():
 *   - domain === "127.0.0.1"              (line 53)
 *   - /^192\.168\./.test(domain)          (line 54)
 *   - /^10\./.test(domain)               (line 55)
 *   - /^172\.(1[6-9]|2\d|3[01])\./.test  (line 56)
 *
 * These branches are only reached when the previous conditions are false,
 * so each test sets a hostname that evaluates true only for that specific line.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/api/domain-query", () => ({
  getDomainDefault: vi.fn(),
  getDomainLanguage: vi.fn(),
}));

vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

vi.mock("@/store/modules/app", () => ({
  useAppStore: vi.fn(() => ({ language: "zh-CN" })),
}));

vi.mock("@/lang", () => ({
  loadLanguageAsync: vi.fn(),
  default: {},
}));

vi.mock("@/composables/useTheme", () => ({
  useTheme: vi.fn(() => ({
    availableThemes: { value: [{ name: "modern-blue" }] },
    setTheme: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function setHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname },
    writable: true,
    configurable: true,
  });
}

function makeDefaultInfo(overrides = {}) {
  return {
    homepage: "https://test.com",
    lang: "",
    style: 0,
    blog: "",
    icon: "",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useDomainStore — getDomainForQuery() private IP fallback (domain3)", () => {
  let getDomainDefault: ReturnType<typeof vi.fn>;
  let useDomainStore: typeof import("@/store/modules/domain").useDomainStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("VITE_APP_DEV_DOMAIN_FALLBACK", "d.xrugc.com");

    // Clear document cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    ({ getDomainDefault } = await import("@/api/domain-query"));
    ({ useDomainStore } = await import("@/store/modules/domain"));

    getDomainDefault.mockResolvedValue({ data: makeDefaultInfo() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── line 53: domain === "127.0.0.1" ────────────────────────────────────

  it('uses fallback when hostname is "127.0.0.1" (line 53)', async () => {
    setHostname("127.0.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    // getDomainForQuery returns the fallback (VITE_APP_DEV_DOMAIN_FALLBACK || "")
    // so getDomainDefault is called with "" (or whatever the env fallback is)
    expect(getDomainDefault).toHaveBeenCalled();
    const calledWith = getDomainDefault.mock.calls[0][0];
    // The domain should NOT be "127.0.0.1" (it was replaced by the fallback)
    expect(calledWith).not.toBe("127.0.0.1");
  });

  // ── line 54: /^192\.168\./.test(domain) ────────────────────────────────

  it("uses fallback when hostname matches 192.168.x.x (line 54)", async () => {
    setHostname("192.168.1.100");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    expect(getDomainDefault).toHaveBeenCalled();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("192.168.1.100");
  });

  it("uses fallback when hostname matches 192.168.0.1 (line 54)", async () => {
    setHostname("192.168.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("192.168.0.1");
  });

  // ── line 55: /^10\./.test(domain) ──────────────────────────────────────

  it("uses fallback when hostname matches 10.x.x.x (line 55)", async () => {
    setHostname("10.0.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    expect(getDomainDefault).toHaveBeenCalled();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("10.0.0.1");
  });

  it("uses fallback when hostname matches 10.100.200.50 (line 55)", async () => {
    setHostname("10.100.200.50");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("10.100.200.50");
  });

  // ── line 56: /^172\.(1[6-9]|2\d|3[01])\./.test(domain) ────────────────

  it("uses fallback when hostname matches 172.16.x.x (line 56)", async () => {
    setHostname("172.16.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    expect(getDomainDefault).toHaveBeenCalled();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("172.16.0.1");
  });

  it("uses fallback when hostname matches 172.20.0.1 (line 56)", async () => {
    setHostname("172.20.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("172.20.0.1");
  });

  it("uses fallback when hostname matches 172.31.0.1 (line 56)", async () => {
    setHostname("172.31.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).not.toBe("172.31.0.1");
  });

  // ── Non-private IPs should NOT be replaced ──────────────────────────────

  it("does NOT use fallback for regular public IPs (e.g. 8.8.8.8)", async () => {
    setHostname("8.8.8.8");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).toBe("8.8.8.8");
  });

  it("does NOT use fallback for regular domain names", async () => {
    setHostname("example.com");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).toBe("example.com");
  });

  // ── Verify that 172.15.x.x (outside range) is NOT treated as private ───

  it("does NOT use fallback for 172.15.x.x (outside 172.16-31 range)", async () => {
    setHostname("172.15.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).toBe("172.15.0.1");
  });

  it("does NOT use fallback for 172.32.x.x (outside 172.16-31 range)", async () => {
    setHostname("172.32.0.1");
    const store = useDomainStore();
    await store.fetchDefaultInfo();
    const calledWith = getDomainDefault.mock.calls[0][0];
    expect(calledWith).toBe("172.32.0.1");
  });
});
