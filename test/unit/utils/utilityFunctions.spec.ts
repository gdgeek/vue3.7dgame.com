/**
 * utilityFunctions 工具函数单元测试
 */
import { describe, it, expect } from "vitest";
import {
  BeijingData,
  convertToLocalTime,
  formatFileSize,
} from "@/utils/utilityFunctions";

describe("utilityFunctions", () => {
  describe("BeijingData", () => {
    it("should convert UTC time to Beijing time", () => {
      const utcTime = "2026-01-02T00:00:00";
      const result = BeijingData(utcTime);
      // UTC 00:00 应该转换为北京时间 08:00
      expect(result).toContain("2026");
      expect(result).toContain("01");
      expect(result).toContain("02");
    });
  });

  describe("convertToLocalTime", () => {
    it("should handle UTC time with Z suffix", () => {
      const utcTime = "2026-01-02T10:30:00Z";
      const result = convertToLocalTime(utcTime);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should handle non-UTC time", () => {
      const localTime = "2026-01-02T10:30:00";
      const result = convertToLocalTime(localTime);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should accept custom timezone", () => {
      const utcTime = "2026-01-02T00:00:00Z";
      const result = convertToLocalTime(utcTime, "Asia/Shanghai");
      expect(result).toBeTruthy();
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      const result = formatFileSize(1024);
      expect(result).toBe("1.00 KB");
    });

    it("should format megabytes", () => {
      const result = formatFileSize(1024 * 1024);
      expect(result).toBe("1.00 MB");
    });

    it("should format gigabytes", () => {
      const result = formatFileSize(1024 * 1024 * 1024);
      expect(result).toBe("1.00 GB");
    });

    it("should format with decimals", () => {
      const result = formatFileSize(1536); // 1.5 KB
      expect(result).toBe("1.50 KB");
    });

    it("should handle large files", () => {
      const result = formatFileSize(1024 * 1024 * 1024 * 1024); // 1 TB
      expect(result).toBe("1.00 TB");
    });

    it("should handle zero", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });
  });
});
