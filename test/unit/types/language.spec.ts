/**
 * Unit tests for src/types/language.ts
 * Covers: LanguageCode type — verifies the valid literal values at runtime.
 */
import { describe, it, expect } from "vitest";
import type { LanguageCode } from "@/types/language";

// Helper function that accepts only valid LanguageCode values.
// This confirms the type constrains the set of allowed strings.
function assertLanguageCode(code: LanguageCode): LanguageCode {
  return code;
}

describe("LanguageCode", () => {
  it("accepts 'zh' as a valid LanguageCode", () => {
    const code = assertLanguageCode("zh");
    expect(code).toBe("zh");
  });

  it("accepts 'en' as a valid LanguageCode", () => {
    const code = assertLanguageCode("en");
    expect(code).toBe("en");
  });

  it("accepts 'ja' as a valid LanguageCode", () => {
    const code = assertLanguageCode("ja");
    expect(code).toBe("ja");
  });

  it("accepts 'other' as a valid LanguageCode", () => {
    const code = assertLanguageCode("other");
    expect(code).toBe("other");
  });

  it("all valid codes are distinct strings", () => {
    const codes: LanguageCode[] = ["zh", "en", "ja", "other"];
    const unique = new Set(codes);
    expect(unique.size).toBe(4);
  });

  it("can be used in an array of LanguageCodes", () => {
    const list: LanguageCode[] = ["zh", "en", "ja", "other"];
    expect(list).toHaveLength(4);
    expect(list).toContain("zh");
    expect(list).toContain("ja");
  });

  it("can be compared with strict equality", () => {
    const lang: LanguageCode = "en";
    expect(lang === "en").toBe(true);
    expect(lang === "zh").toBe(false);
  });

  it("can be used as a switch discriminant", () => {
    const getLabel = (code: LanguageCode): string => {
      switch (code) {
        case "zh":
          return "中文";
        case "en":
          return "English";
        case "ja":
          return "日本語";
        case "other":
          return "Other";
      }
    };
    expect(getLabel("zh")).toBe("中文");
    expect(getLabel("en")).toBe("English");
    expect(getLabel("ja")).toBe("日本語");
    expect(getLabel("other")).toBe("Other");
  });

  it("can be stored in a Record keyed by LanguageCode", () => {
    const labels: Record<LanguageCode, string> = {
      zh: "中文",
      en: "English",
      ja: "日本語",
      other: "其他",
    };
    expect(labels.zh).toBe("中文");
    expect(labels.other).toBe("其他");
  });
});
