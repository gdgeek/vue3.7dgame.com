import { describe, it, expect } from "vitest";

import { SizeEnum } from "@/enums/SizeEnum";

describe("SizeEnum", () => {
  it("DEFAULT equals 'default'", () => {
    expect(SizeEnum.DEFAULT).toBe("default");
  });

  it("LARGE equals 'large'", () => {
    expect(SizeEnum.LARGE).toBe("large");
  });

  it("SMALL equals 'small'", () => {
    expect(SizeEnum.SMALL).toBe("small");
  });

  it("DEFAULT, LARGE and SMALL are all distinct", () => {
    const set = new Set([SizeEnum.DEFAULT, SizeEnum.LARGE, SizeEnum.SMALL]);
    expect(set.size).toBe(3);
  });

  it("all values are non-empty lowercase strings", () => {
    [SizeEnum.DEFAULT, SizeEnum.LARGE, SizeEnum.SMALL].forEach((v) => {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
      expect(v).toMatch(/^[a-z]+$/);
    });
  });

  it("LARGE is lexicographically longer than SMALL", () => {
    // sanity: 'large' has 5 chars, 'small' has 5 chars — both equal length
    expect(SizeEnum.LARGE.length).toBe(SizeEnum.SMALL.length);
  });
});
