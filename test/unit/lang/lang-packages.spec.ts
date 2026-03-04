/**
 * 语言包单元测试 - src/lang/ 各语言包结构验证
 * 验证 zh-CN、en-US、ja-JP、th-TH、zh-TW 各语言包导出正确性
 */
import { describe, it, expect } from "vitest";

// 静态导入各语言包索引（避免 import.meta.glob 依赖）
import zhCN from "@/lang/zh-CN";
import enUS from "@/lang/en-US";
import jaJP from "@/lang/ja-JP";
import thTH from "@/lang/th-TH";
import zhTW from "@/lang/zh-TW";

// 所有语言包共有的基础命名空间
const EXPECTED_KEYS = [
  "common",
  "route",
  "login",
  "homepage",
  "meta",
  "verse",
  "manager",
];

// 辅助：验证语言包包含所有预期顶级 key
function checkLangKeys(lang: Record<string, unknown>, name: string) {
  for (const key of EXPECTED_KEYS) {
    it(`${name}: 包含 "${key}" 命名空间`, () => {
      expect(lang).toHaveProperty(key);
      expect(typeof lang[key]).toBe("object");
    });
  }
}

describe("zh-CN 语言包", () => {
  it("导出为非空对象", () => {
    expect(typeof zhCN).toBe("object");
    expect(Object.keys(zhCN).length).toBeGreaterThan(0);
  });
  checkLangKeys(zhCN as unknown as Record<string, unknown>, "zh-CN");

  it("common.confirm 值存在", () => {
    expect((zhCN as any).common?.confirm).toBeTruthy();
  });
});

describe("en-US 语言包", () => {
  it("导出为非空对象", () => {
    expect(typeof enUS).toBe("object");
    expect(Object.keys(enUS).length).toBeGreaterThan(0);
  });
  checkLangKeys(enUS as unknown as Record<string, unknown>, "en-US");
});

describe("ja-JP 语言包", () => {
  it("导出为非空对象", () => {
    expect(typeof jaJP).toBe("object");
    expect(Object.keys(jaJP).length).toBeGreaterThan(0);
  });
  checkLangKeys(jaJP as unknown as Record<string, unknown>, "ja-JP");
});

describe("th-TH 语言包", () => {
  it("导出为非空对象", () => {
    expect(typeof thTH).toBe("object");
    expect(Object.keys(thTH).length).toBeGreaterThan(0);
  });
  checkLangKeys(thTH as unknown as Record<string, unknown>, "th-TH");
});

describe("zh-TW 语言包", () => {
  it("导出为非空对象", () => {
    expect(typeof zhTW).toBe("object");
    expect(Object.keys(zhTW).length).toBeGreaterThan(0);
  });
  checkLangKeys(zhTW as unknown as Record<string, unknown>, "zh-TW");
});

describe("多语言包结构一致性", () => {
  it("各语言包均包含公共基础命名空间", () => {
    const langs = { zhCN, enUS, jaJP, thTH, zhTW } as Record<string, Record<string, unknown>>;
    for (const [name, lang] of Object.entries(langs)) {
      for (const key of EXPECTED_KEYS) {
        expect(lang, `${name} 缺少 "${key}"`).toHaveProperty(key);
      }
    }
  });

  it("zh-CN 包含 resource 和 campus 扩展命名空间", () => {
    expect(zhCN as any).toHaveProperty("resource");
    expect(zhCN as any).toHaveProperty("campus");
  });
});
