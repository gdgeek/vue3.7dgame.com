import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

function setHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname },
    writable: true,
    configurable: true,
  });
}

describe("domain utils", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getDomainForQuery uses dev fallback for localhost", async () => {
    setHostname("localhost");
    vi.stubEnv("VITE_APP_DEV_DOMAIN_FALLBACK", "d.xrugc.com");
    const { getDomainForQuery } = await import("@/utils/domain");
    expect(getDomainForQuery()).toBe("d.xrugc.com");
  });

  it("getDomainStorageKey scopes keys by resolved domain", async () => {
    setHostname("localhost");
    vi.stubEnv("VITE_APP_DEV_DOMAIN_FALLBACK", "d.xrugc.com");
    const { getDomainStorageKey } = await import("@/utils/domain");
    expect(getDomainStorageKey("language")).toBe("language:d.xrugc.com");
  });

  it("getDomainStorageKey keeps regular domains unchanged", async () => {
    setHostname("example.com");
    const { getDomainStorageKey } = await import("@/utils/domain");
    expect(getDomainStorageKey("appTheme")).toBe("appTheme:example.com");
  });
});
