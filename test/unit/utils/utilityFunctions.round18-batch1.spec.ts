import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertToLocalTime, debounce } from "@/utils/utilityFunctions";

describe("utilityFunctions.ts batch1", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("debounce", () => {
    it("runs callback once after delay", () => {
      const fn = vi.fn();
      const wrapped = debounce(fn, 200);

      wrapped("a");
      vi.advanceTimersByTime(199);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("a");
    });

    it("keeps only the last call during rapid triggers", () => {
      const fn = vi.fn();
      const wrapped = debounce(fn, 100);

      wrapped("first");
      vi.advanceTimersByTime(50);
      wrapped("second");
      vi.advanceTimersByTime(50);
      wrapped("third");
      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("third");
    });

    it("passes through multiple arguments", () => {
      const fn = vi.fn();
      const wrapped = debounce(fn, 20);

      wrapped("x", 7, { ok: true });
      vi.advanceTimersByTime(20);
      expect(fn).toHaveBeenCalledWith("x", 7, { ok: true });
    });
  });

  describe("convertToLocalTime", () => {
    it("treats +00:00 suffix as UTC and applies custom timezone", () => {
      const date = "2026-01-02T00:00:00+00:00";
      const result = convertToLocalTime(date, "Asia/Shanghai");
      const expected = new Date(date).toLocaleString(undefined, {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      expect(result).toBe(expected);
    });

    it("treats -0500 suffix as UTC/offset string and applies custom timezone", () => {
      const date = "2026-01-02T00:00:00-0500";
      const result = convertToLocalTime(date, "UTC");
      const expected = new Date(date).toLocaleString(undefined, {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      expect(result).toBe(expected);
    });

    it("formats non-UTC string without forcing timezone", () => {
      const date = "2026-01-02T10:30:45";
      const result = convertToLocalTime(date, "Asia/Tokyo");
      const expected = new Date(date).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      expect(result).toBe(expected);
    });
  });
});
