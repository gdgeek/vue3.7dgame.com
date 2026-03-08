import { describe, expect, it, vi, beforeEach } from "vitest";

const setWindowLocation = (protocol: string) => {
  Object.defineProperty(window, "location", {
    value: {
      protocol,
      hostname: "www.example.com",
      host: "www.example.com:3000",
      port: "3000",
    },
    writable: true,
    configurable: true,
  });
};

describe("helper.ts batch1 toHttps", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns empty string for undefined", async () => {
    setWindowLocation("https:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps(undefined)).toBe("");
  });

  it("returns empty string for null", async () => {
    setWindowLocation("https:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps(null)).toBe("");
  });

  it("returns empty string for empty input", async () => {
    setWindowLocation("https:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps("")).toBe("");
  });

  it("converts http url to https on https pages", async () => {
    setWindowLocation("https:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps("http://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png"
    );
  });

  it("converts https url to http on http pages", async () => {
    setWindowLocation("http:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps("https://cdn.example.com/a.png")).toBe(
      "http://cdn.example.com/a.png"
    );
  });

  it("keeps non-http protocol unchanged", async () => {
    setWindowLocation("https:");
    const { toHttps } = await import("@/utils/helper");
    expect(toHttps("mailto:user@example.com")).toBe("mailto:user@example.com");
  });
});
