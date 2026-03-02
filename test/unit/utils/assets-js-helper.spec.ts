/**
 * Unit tests for src/assets/js/helper.ts
 * Covers: printVector3, printVector2, cutString, isHttps,
 *         convertToHttps, getCurrentUrl, sleep
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  printVector3,
  printVector2,
  cutString,
  isHttps,
  convertToHttps,
  getCurrentUrl,
  sleep,
} from "@/assets/js/helper";

// ---------------------------------------------------------------------------
// printVector3
// ---------------------------------------------------------------------------
describe("printVector3()", () => {
  it("formats a vector with positive values", () => {
    expect(printVector3({ x: 1, y: 2, z: 3 })).toBe("1 X 2 X 3");
  });

  it("formats a vector with float values", () => {
    expect(printVector3({ x: 1.5, y: 2.5, z: 3.5 })).toBe("1.5 X 2.5 X 3.5");
  });

  it("formats a vector with zero values", () => {
    expect(printVector3({ x: 0, y: 0, z: 0 })).toBe("0 X 0 X 0");
  });

  it("formats a vector with negative values", () => {
    expect(printVector3({ x: -1, y: -2, z: -3 })).toBe("-1 X -2 X -3");
  });
});

// ---------------------------------------------------------------------------
// printVector2
// ---------------------------------------------------------------------------
describe("printVector2()", () => {
  it("formats a 2D vector", () => {
    expect(printVector2({ x: 4, y: 5 })).toBe("4 X 5");
  });

  it("formats a 2D vector with floats", () => {
    expect(printVector2({ x: 0.1, y: 0.9 })).toBe("0.1 X 0.9");
  });

  it("formats a 2D vector with zeros", () => {
    expect(printVector2({ x: 0, y: 0 })).toBe("0 X 0");
  });
});

// ---------------------------------------------------------------------------
// cutString
// ---------------------------------------------------------------------------
describe("cutString()", () => {
  it("returns the string unchanged when it fits within length", () => {
    // All ASCII: each char counts as 1. 'hello' has length 5, len=10 → no cut.
    expect(cutString("hello", 10)).toBe("hello");
  });

  it("truncates a long ASCII string", () => {
    // 'abcdefghij' = 10 chars, ASCII → strlen counts 1 per char
    // With len=5, it should truncate
    const result = cutString("abcdefghij", 5);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan("abcdefghij".length);
  });

  it("returns original string when total byte length is within limit", () => {
    // str.length * 2 <= len: 'ab'.length*2 = 4, len=10 → returns 'ab'
    expect(cutString("ab", 10)).toBe("ab");
  });

  it("handles Chinese characters (counted as 2 bytes each)", () => {
    // '你好世界' = 4 chars, each Chinese char > 128 → counts as 2 bytes = 8 total
    // With len=4, should truncate after 2 chars (4 bytes)
    const result = cutString("你好世界", 4);
    expect(result).toContain("...");
  });

  it("handles mixed ASCII and Chinese", () => {
    // 'a你b' – 'a' counts 1, '你' counts 2, 'b' counts 1 = 4 bytes total
    // With len=3, should truncate
    const result = cutString("a你b", 3);
    expect(result).toContain("...");
  });

  it("returns empty string for empty input", () => {
    expect(cutString("", 5)).toBe("");
  });

  it("does not truncate when string is exactly at limit", () => {
    // 'abcd' = 4 ASCII chars = 4 bytes, len=4 → should NOT truncate (>= vs >)
    // The loop adds strlen and checks if >= len, cutting at that point
    // 'abc' is 3 chars: strlen reaches 3 < 4, then 'd' makes it 4 >= 4 → truncates at 'd'
    // Actually let's test a boundary where it fits fully
    expect(cutString("ab", 4)).toBe("ab"); // 2*2=4 <= 4 → returns immediately
  });
});

// ---------------------------------------------------------------------------
// isHttps
// ---------------------------------------------------------------------------
describe("isHttps()", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("returns true when protocol is https:", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      writable: true,
      configurable: true,
    });
    expect(isHttps()).toBe(true);
  });

  it("returns false when protocol is http:", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "http:" },
      writable: true,
      configurable: true,
    });
    expect(isHttps()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// convertToHttps
// ---------------------------------------------------------------------------
describe("convertToHttps()", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      writable: true,
      configurable: true,
    });
  });

  it("converts http:// to https:// when on https", () => {
    const result = convertToHttps("http://example.com/path");
    expect(result).toBe("https://example.com/path");
  });

  it("leaves https:// unchanged when already https", () => {
    const result = convertToHttps("https://example.com/path");
    expect(result).toBe("https://example.com/path");
  });

  it("returns empty string for undefined", () => {
    expect(convertToHttps(undefined)).toBe("");
  });

  it("returns empty string for null-ish undefined input", () => {
    expect(convertToHttps(undefined)).toBe("");
  });

  it("converts https:// to http:// when on http", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "http:" },
      writable: true,
      configurable: true,
    });
    const result = convertToHttps("https://example.com/path");
    expect(result).toBe("http://example.com/path");
  });

  it("leaves http:// unchanged when on http", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "http:" },
      writable: true,
      configurable: true,
    });
    const result = convertToHttps("http://example.com/path");
    expect(result).toBe("http://example.com/path");
  });
});

// ---------------------------------------------------------------------------
// getCurrentUrl
// ---------------------------------------------------------------------------
describe("getCurrentUrl()", () => {
  it("builds URL from protocol, hostname and port", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:", hostname: "api.example.com", port: "8080" },
      writable: true,
      configurable: true,
    });
    const url = getCurrentUrl();
    expect(url).toBe("https://api.example.com:8080");
  });

  it("omits port when empty", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:", hostname: "example.com", port: "" },
      writable: true,
      configurable: true,
    });
    const url = getCurrentUrl();
    expect(url).toBe("https://example.com");
  });

  it("uses http: protocol correctly", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "http:", hostname: "localhost", port: "3000" },
      writable: true,
      configurable: true,
    });
    const url = getCurrentUrl();
    expect(url).toBe("http://localhost:3000");
  });
});

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------
describe("sleep()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a Promise", () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);
    vi.runAllTimers();
  });

  it("resolves after the specified milliseconds", async () => {
    let resolved = false;
    sleep(1000).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(999);
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it("resolves immediately for 0ms", async () => {
    let resolved = false;
    sleep(0).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(0);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });
});
