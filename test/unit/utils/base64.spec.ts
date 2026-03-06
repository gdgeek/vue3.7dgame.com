/**
 * Unit tests for src/utils/base64.ts
 * Covers: safeAtob (valid / invalid / edge cases)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe("safeAtob", () => {
  let safeAtob: (str: string) => string | null;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ safeAtob } = await import("@/utils/base64"));
  });

  it("decodes a valid base64 string", () => {
    // "hello" in base64 = aGVsbG8=
    const result = safeAtob("aGVsbG8=");
    expect(result).toBe("hello");
  });

  it("decodes base64 without padding", () => {
    // "abc" in base64 = YWJj
    const result = safeAtob("YWJj");
    expect(result).toBe("abc");
  });

  it("returns null for invalid base64 string", () => {
    const result = safeAtob("!!!invalid!!!");
    expect(result).toBeNull();
  });

  it("returns null for completely non-base64 input", () => {
    const result = safeAtob("not-base64-@@@");
    expect(result).toBeNull();
  });

  it("decodes empty string (valid base64)", () => {
    const result = safeAtob("");
    expect(result).toBe("");
  });

  it("decodes a JSON payload encoded in base64", () => {
    // {"id":1} in base64 = eyJpZCI6MX0=
    const result = safeAtob("eyJpZCI6MX0=");
    expect(result).toBe('{"id":1}');
  });

  it("logs a warning when the input is invalid", async () => {
    const { logger } = await import("@/utils/logger");
    safeAtob("!!!bad!!!");
    expect(logger.warn).toHaveBeenCalledWith(
      "[safeAtob] Invalid base64 string"
    );
  });

  it("does not log a warning for valid input", async () => {
    const { logger } = await import("@/utils/logger");
    safeAtob("aGVsbG8=");
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
