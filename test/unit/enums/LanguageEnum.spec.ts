import { describe, it, expect } from "vitest";

import { LanguageEnum } from "@/enums/LanguageEnum";

describe("LanguageEnum", () => {
  it("ZH_CN equals 'zh-CN'", () => {
    expect(LanguageEnum.ZH_CN).toBe("zh-CN");
  });

  it("EN equals 'en-US'", () => {
    expect(LanguageEnum.EN).toBe("en-US");
  });

  it("JA equals 'ja-JP'", () => {
    expect(LanguageEnum.JA).toBe("ja-JP");
  });

  it("TH equals 'th-TH'", () => {
    expect(LanguageEnum.TH).toBe("th-TH");
  });

  it("ZH_TW equals 'zh-TW'", () => {
    expect(LanguageEnum.ZH_TW).toBe("zh-TW");
  });

  it("all values are non-empty strings", () => {
    const values = [
      LanguageEnum.ZH_CN,
      LanguageEnum.EN,
      LanguageEnum.JA,
      LanguageEnum.TH,
      LanguageEnum.ZH_TW,
    ];
    values.forEach((v) => {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    });
  });

  it("all five locale codes are distinct", () => {
    const set = new Set([
      LanguageEnum.ZH_CN,
      LanguageEnum.EN,
      LanguageEnum.JA,
      LanguageEnum.TH,
      LanguageEnum.ZH_TW,
    ]);
    expect(set.size).toBe(5);
  });
});
