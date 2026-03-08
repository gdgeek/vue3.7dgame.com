import { describe, it, expect } from "vitest";

import { ThemeEnum } from "@/enums/ThemeEnum";

describe("ThemeEnum", () => {
  it("LIGHT equals 'light'", () => {
    expect(ThemeEnum.LIGHT).toBe("light");
  });

  it("DARK equals 'dark'", () => {
    expect(ThemeEnum.DARK).toBe("dark");
  });

  it("AUTO equals 'auto'", () => {
    expect(ThemeEnum.AUTO).toBe("auto");
  });

  it("LIGHT and DARK are different", () => {
    expect(ThemeEnum.LIGHT).not.toBe(ThemeEnum.DARK);
  });

  it("all three values are distinct", () => {
    const set = new Set([ThemeEnum.LIGHT, ThemeEnum.DARK, ThemeEnum.AUTO]);
    expect(set.size).toBe(3);
  });

  it("all values are lowercase strings", () => {
    [ThemeEnum.LIGHT, ThemeEnum.DARK, ThemeEnum.AUTO].forEach((v) => {
      expect(typeof v).toBe("string");
      expect(v).toMatch(/^[a-z]+$/);
    });
  });
});
