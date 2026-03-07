/**
 * Unit tests for src/enums/
 * 验证所有枚举值的正确性，确保与业务约定一致
 *
 * 注意：项目使用 const enum，esbuild 会将其转为普通 enum 对象，
 *       可在运行时正常访问属性值。
 */
import { describe, it, expect } from "vitest";

// ── CacheEnum ────────────────────────────────────────────────────────────────

describe("CacheEnum (TOKEN_KEY 常量)", () => {
  it("TOKEN_KEY 为 'access_token'", async () => {
    const { TOKEN_KEY } = await import("@/enums/CacheEnum");
    expect(TOKEN_KEY).toBe("access_token");
  });

  it("TOKEN_KEY 是字符串类型", async () => {
    const { TOKEN_KEY } = await import("@/enums/CacheEnum");
    expect(typeof TOKEN_KEY).toBe("string");
  });

  it("TOKEN_KEY 非空", async () => {
    const { TOKEN_KEY } = await import("@/enums/CacheEnum");
    expect(TOKEN_KEY.length).toBeGreaterThan(0);
  });
});

// ── DeviceEnum ───────────────────────────────────────────────────────────────

describe("DeviceEnum", () => {
  it("DESKTOP 值为 'desktop'", async () => {
    const { DeviceEnum } = await import("@/enums/DeviceEnum");
    expect(DeviceEnum.DESKTOP).toBe("desktop");
  });

  it("MOBILE 值为 'mobile'", async () => {
    const { DeviceEnum } = await import("@/enums/DeviceEnum");
    expect(DeviceEnum.MOBILE).toBe("mobile");
  });

  it("DESKTOP 与 MOBILE 值不同", async () => {
    const { DeviceEnum } = await import("@/enums/DeviceEnum");
    expect(DeviceEnum.DESKTOP).not.toBe(DeviceEnum.MOBILE);
  });
});

// ── LanguageEnum ─────────────────────────────────────────────────────────────

describe("LanguageEnum", () => {
  it("ZH_CN 值为 'zh-CN'", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    expect(LanguageEnum.ZH_CN).toBe("zh-CN");
  });

  it("EN 值为 'en-US'", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    expect(LanguageEnum.EN).toBe("en-US");
  });

  it("JA 值为 'ja-JP'", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    expect(LanguageEnum.JA).toBe("ja-JP");
  });

  it("TH 值为 'th-TH'", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    expect(LanguageEnum.TH).toBe("th-TH");
  });

  it("ZH_TW 值为 'zh-TW'", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    expect(LanguageEnum.ZH_TW).toBe("zh-TW");
  });

  it("所有语言值均不相同", async () => {
    const { LanguageEnum } = await import("@/enums/LanguageEnum");
    const values = [
      LanguageEnum.ZH_CN,
      LanguageEnum.EN,
      LanguageEnum.JA,
      LanguageEnum.TH,
      LanguageEnum.ZH_TW,
    ];
    const unique = new Set(values);
    expect(unique.size).toBe(5);
  });
});

// ── LayoutEnum ───────────────────────────────────────────────────────────────

describe("LayoutEnum", () => {
  it("LEFT 值为 'left'", async () => {
    const { LayoutEnum } = await import("@/enums/LayoutEnum");
    expect(LayoutEnum.LEFT).toBe("left");
  });

  it("TOP 值为 'top'", async () => {
    const { LayoutEnum } = await import("@/enums/LayoutEnum");
    expect(LayoutEnum.TOP).toBe("top");
  });

  it("MIX 值为 'mix'", async () => {
    const { LayoutEnum } = await import("@/enums/LayoutEnum");
    expect(LayoutEnum.MIX).toBe("mix");
  });

  it("三个布局值各不相同", async () => {
    const { LayoutEnum } = await import("@/enums/LayoutEnum");
    const values = [LayoutEnum.LEFT, LayoutEnum.TOP, LayoutEnum.MIX];
    expect(new Set(values).size).toBe(3);
  });
});

// ── ResultEnum ───────────────────────────────────────────────────────────────

describe("ResultEnum", () => {
  it("SUCCESS 值为 '00000'", async () => {
    const { ResultEnum } = await import("@/enums/ResultEnum");
    expect(ResultEnum.SUCCESS).toBe("00000");
  });

  it("ERROR 值为 'B0001'", async () => {
    const { ResultEnum } = await import("@/enums/ResultEnum");
    expect(ResultEnum.ERROR).toBe("B0001");
  });

  it("TOKEN_INVALID 值为 'A0230'", async () => {
    const { ResultEnum } = await import("@/enums/ResultEnum");
    expect(ResultEnum.TOKEN_INVALID).toBe("A0230");
  });

  it("三个响应码值各不相同", async () => {
    const { ResultEnum } = await import("@/enums/ResultEnum");
    const values = [
      ResultEnum.SUCCESS,
      ResultEnum.ERROR,
      ResultEnum.TOKEN_INVALID,
    ];
    expect(new Set(values).size).toBe(3);
  });

  it("SUCCESS 以 '0' 开头（标准成功码格式）", async () => {
    const { ResultEnum } = await import("@/enums/ResultEnum");
    expect(ResultEnum.SUCCESS.startsWith("0")).toBe(true);
  });
});

// ── SidebarStatusEnum ────────────────────────────────────────────────────────

describe("SidebarStatusEnum", () => {
  it("OPENED 值为 'opened'", async () => {
    const { SidebarStatusEnum } = await import("@/enums/SidebarStatusEnum");
    expect(SidebarStatusEnum.OPENED).toBe("opened");
  });

  it("CLOSED 值为 'closed'", async () => {
    const { SidebarStatusEnum } = await import("@/enums/SidebarStatusEnum");
    expect(SidebarStatusEnum.CLOSED).toBe("closed");
  });

  it("OPENED 与 CLOSED 值不同", async () => {
    const { SidebarStatusEnum } = await import("@/enums/SidebarStatusEnum");
    expect(SidebarStatusEnum.OPENED).not.toBe(SidebarStatusEnum.CLOSED);
  });
});

// ── SizeEnum ─────────────────────────────────────────────────────────────────

describe("SizeEnum", () => {
  it("DEFAULT 值为 'default'", async () => {
    const { SizeEnum } = await import("@/enums/SizeEnum");
    expect(SizeEnum.DEFAULT).toBe("default");
  });

  it("LARGE 值为 'large'", async () => {
    const { SizeEnum } = await import("@/enums/SizeEnum");
    expect(SizeEnum.LARGE).toBe("large");
  });

  it("SMALL 值为 'small'", async () => {
    const { SizeEnum } = await import("@/enums/SizeEnum");
    expect(SizeEnum.SMALL).toBe("small");
  });

  it("三个尺寸值各不相同", async () => {
    const { SizeEnum } = await import("@/enums/SizeEnum");
    const values = [SizeEnum.DEFAULT, SizeEnum.LARGE, SizeEnum.SMALL];
    expect(new Set(values).size).toBe(3);
  });
});

// ── ThemeEnum ────────────────────────────────────────────────────────────────

describe("ThemeEnum", () => {
  it("LIGHT 值为 'light'", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.LIGHT).toBe("light");
  });

  it("DARK 值为 'dark'", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.DARK).toBe("dark");
  });

  it("AUTO 值为 'auto'", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.AUTO).toBe("auto");
  });

  it("三个主题值各不相同", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    const values = [ThemeEnum.LIGHT, ThemeEnum.DARK, ThemeEnum.AUTO];
    expect(new Set(values).size).toBe(3);
  });

  it("LIGHT 和 DARK 是对立主题", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.LIGHT).not.toBe(ThemeEnum.DARK);
    expect(ThemeEnum.DARK).not.toBe(ThemeEnum.AUTO);
    expect(ThemeEnum.LIGHT).not.toBe(ThemeEnum.AUTO);
  });
});
