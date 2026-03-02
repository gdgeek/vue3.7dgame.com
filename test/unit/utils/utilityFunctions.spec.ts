/**
 * utilityFunctions 工具函数单元测试
 */
import { describe, it, expect } from "vitest";
import {
  BeijingData,
  convertToLocalTime,
  formatFileSize,
  getVideoCover,
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

  describe("getVideoCover", () => {
    it("returns empty string for undefined", () => {
      expect(getVideoCover(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(getVideoCover("")).toBe("");
    });

    it("returns url unchanged if already has ci-process=snapshot", () => {
      const url = "https://example.com/video.mp4?ci-process=snapshot&time=1";
      expect(getVideoCover(url)).toBe(url);
    });

    it("appends snapshot params for .mp4 URLs", () => {
      const url = "https://example.com/video.mp4";
      const result = getVideoCover(url);
      expect(result).toContain("ci-process=snapshot");
      expect(result).toContain("time=1");
      expect(result).toContain("format=jpg");
    });

    it("appends snapshot params for .webm URLs", () => {
      const result = getVideoCover("https://cdn.example.com/clip.webm");
      expect(result).toContain("ci-process=snapshot");
    });

    it("appends snapshot params for .mov URLs", () => {
      const result = getVideoCover("https://cdn.example.com/clip.mov");
      expect(result).toContain("ci-process=snapshot");
    });

    it("returns image URL unchanged", () => {
      const url = "https://example.com/photo.jpg";
      expect(getVideoCover(url)).toBe(url);
    });

    it("uses & separator when URL already has query params", () => {
      const url = "https://example.com/video.mp4?quality=hd";
      const result = getVideoCover(url);
      expect(result).toMatch(/\?quality=hd&ci-process=snapshot/);
    });

    it("uses ? separator when URL has no query params", () => {
      const url = "https://example.com/video.mp4";
      const result = getVideoCover(url);
      expect(result).toMatch(/\?ci-process=snapshot/);
    });

    it("appends snapshot params for .avi URLs", () => {
      const result = getVideoCover("https://cdn.example.com/clip.avi");
      expect(result).toContain("ci-process=snapshot");
    });

    it("returns image URL with different extensions unchanged", () => {
      expect(getVideoCover("https://example.com/photo.png")).toBe("https://example.com/photo.png");
      expect(getVideoCover("https://example.com/photo.gif")).toBe("https://example.com/photo.gif");
    });
  });

  describe("formatFileSize — additional edge cases", () => {
    it("should format 1 byte", () => {
      expect(formatFileSize(1)).toBe("1 B");
    });

    it("should format 999 bytes as B (not KB)", () => {
      expect(formatFileSize(999)).toBe("999 B");
    });

    it("should format 1023 bytes as B (boundary before KB)", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("should format 2.5 MB correctly", () => {
      const result = formatFileSize(1024 * 1024 * 2.5);
      expect(result).toBe("2.50 MB");
    });
  });
});
