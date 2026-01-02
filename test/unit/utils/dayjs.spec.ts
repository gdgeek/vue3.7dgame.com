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
});
