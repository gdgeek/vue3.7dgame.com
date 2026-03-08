import { describe, it, expect } from "vitest";

import { LayoutEnum } from "@/enums/LayoutEnum";

describe("LayoutEnum", () => {
  it("LEFT equals 'left'", () => {
    expect(LayoutEnum.LEFT).toBe("left");
  });

  it("TOP equals 'top'", () => {
    expect(LayoutEnum.TOP).toBe("top");
  });

  it("MIX equals 'mix'", () => {
    expect(LayoutEnum.MIX).toBe("mix");
  });

  it("all three values are strings", () => {
    [LayoutEnum.LEFT, LayoutEnum.TOP, LayoutEnum.MIX].forEach((v) => {
      expect(typeof v).toBe("string");
    });
  });

  it("all three layout values are distinct", () => {
    const set = new Set([LayoutEnum.LEFT, LayoutEnum.TOP, LayoutEnum.MIX]);
    expect(set.size).toBe(3);
  });

  it("values are lowercase alpha strings", () => {
    [LayoutEnum.LEFT, LayoutEnum.TOP, LayoutEnum.MIX].forEach((v) => {
      expect(v).toMatch(/^[a-z]+$/);
    });
  });
});
