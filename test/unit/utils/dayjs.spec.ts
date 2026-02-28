/**
 * dayjs 工具模块单元测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  formatDateTime,
  formatDate,
  fromNow,
  diff,
  isBefore,
  isAfter,
  dayjs,
} from "@/utils/dayjs";

describe("dayjs utils", () => {
  describe("formatDateTime", () => {
    it("should format date with default format", () => {
      const date = "2026-01-02T10:30:00";
      const result = formatDateTime(date);
      expect(result).toBe("2026-01-02 10:30:00");
    });

    it("should format date with custom format", () => {
      const date = "2026-01-02T10:30:00";
      const result = formatDateTime(date, "YYYY/MM/DD");
      expect(result).toBe("2026/01/02");
    });

    it("should handle Date object", () => {
      const date = new Date("2026-01-02T10:30:00");
      const result = formatDateTime(date);
      expect(result).toContain("2026-01-02");
    });
  });

  describe("formatDate", () => {
    it("should format date with default format", () => {
      const date = "2026-01-02T10:30:00";
      const result = formatDate(date);
      expect(result).toBe("2026-01-02");
    });

    it("should format date with custom format", () => {
      const date = "2026-01-02T10:30:00";
      const result = formatDate(date, "MM-DD");
      expect(result).toBe("01-02");
    });
  });

  describe("fromNow", () => {
    it("should return relative time string", () => {
      const pastDate = dayjs().subtract(1, "hour").toISOString();
      const result = fromNow(pastDate);
      expect(result).toContain("小时前");
    });

    it("should handle yesterday", () => {
      const yesterday = dayjs().subtract(1, "day").toISOString();
      const result = fromNow(yesterday);
      expect(result).toContain("天前");
    });
  });

  describe("diff", () => {
    it("should calculate difference in days", () => {
      const date1 = "2026-01-10";
      const date2 = "2026-01-05";
      const result = diff(date1, date2, "day");
      expect(result).toBe(5);
    });

    it("should calculate difference in hours", () => {
      const date1 = "2026-01-02T12:00:00";
      const date2 = "2026-01-02T10:00:00";
      const result = diff(date1, date2, "hour");
      expect(result).toBe(2);
    });

    it("should return negative for past dates", () => {
      const date1 = "2026-01-01";
      const date2 = "2026-01-05";
      const result = diff(date1, date2, "day");
      expect(result).toBe(-4);
    });
  });

  describe("isBefore", () => {
    it("should return true for past dates", () => {
      const pastDate = "2020-01-01";
      expect(isBefore(pastDate)).toBe(true);
    });

    it("should return false for future dates", () => {
      const futureDate = "2099-01-01";
      expect(isBefore(futureDate)).toBe(false);
    });
  });

  describe("isAfter", () => {
    it("should return true for future dates", () => {
      const futureDate = "2099-01-01";
      expect(isAfter(futureDate)).toBe(true);
    });

    it("should return false for past dates", () => {
      const pastDate = "2020-01-01";
      expect(isAfter(pastDate)).toBe(false);
    });
  });

  describe("dayjs instance", () => {
    it("should be exported and functional", () => {
      const now = dayjs();
      expect(now.isValid()).toBe(true);
    });

    it("should support chaining", () => {
      const result = dayjs("2026-01-02").add(1, "day").format("YYYY-MM-DD");
      expect(result).toBe("2026-01-03");
    });
  });

  describe("formatDateTime — additional edge cases", () => {
    it("formats a Date object with exact time", () => {
      const date = new Date("2026-06-15T08:05:09");
      const result = formatDateTime(date);
      expect(result).toContain("2026-06-15");
      expect(result).toContain("08:05:09");
    });

    it("zero-pads single-digit hours, minutes, seconds", () => {
      const date = "2026-03-01T01:02:03";
      expect(formatDateTime(date)).toBe("2026-03-01 01:02:03");
    });

    it("HH:mm custom format returns only time", () => {
      const date = "2026-05-20T14:30:00";
      expect(formatDateTime(date, "HH:mm")).toBe("14:30");
    });
  });

  describe("formatDate — additional edge cases", () => {
    it("YYYY format extracts only the year", () => {
      const date = "2026-09-15";
      expect(formatDate(date, "YYYY")).toBe("2026");
    });

    it("MM/DD format with zero-padded month and day", () => {
      const date = "2026-03-07";
      expect(formatDate(date, "MM/DD")).toBe("03/07");
    });
  });

  describe("fromNow — future dates", () => {
    it("returns a non-empty string for a date 2 hours in the future", () => {
      const future = dayjs().add(2, "hour").toISOString();
      const result = fromNow(future);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns a string containing hours for a 3-hour-ago date", () => {
      const past = dayjs().subtract(3, "hour").toISOString();
      expect(fromNow(past)).toContain("小时前");
    });
  });

  describe("diff — additional units", () => {
    it("calculates difference in minutes", () => {
      const date1 = "2026-01-01T10:00:00";
      const date2 = "2026-01-01T09:45:00";
      expect(diff(date1, date2, "minute")).toBe(15);
    });

    it("calculates difference in months", () => {
      const date1 = "2026-04-01";
      const date2 = "2026-01-01";
      expect(diff(date1, date2, "month")).toBe(3);
    });

    it("returns 0 for identical dates", () => {
      expect(diff("2026-01-01", "2026-01-01", "day")).toBe(0);
    });
  });

  describe("isBefore / isAfter — Date object input", () => {
    it("isBefore returns true for a past Date object", () => {
      expect(isBefore(new Date("2020-06-01"))).toBe(true);
    });

    it("isAfter returns true for a future Date object", () => {
      expect(isAfter(new Date("2099-06-01"))).toBe(true);
    });

    it("isBefore returns false for a future Date object", () => {
      expect(isBefore(new Date("2099-06-01"))).toBe(false);
    });

    it("isAfter returns false for a past Date object", () => {
      expect(isAfter(new Date("2020-06-01"))).toBe(false);
    });
  });
});
