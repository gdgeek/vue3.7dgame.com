import { describe, it, expect } from "vitest";

import { ResultEnum } from "@/enums/ResultEnum";

describe("ResultEnum", () => {
  it("SUCCESS equals '00000'", () => {
    expect(ResultEnum.SUCCESS).toBe("00000");
  });

  it("ERROR equals 'B0001'", () => {
    expect(ResultEnum.ERROR).toBe("B0001");
  });

  it("TOKEN_INVALID equals 'A0230'", () => {
    expect(ResultEnum.TOKEN_INVALID).toBe("A0230");
  });

  it("all values are non-empty strings", () => {
    [ResultEnum.SUCCESS, ResultEnum.ERROR, ResultEnum.TOKEN_INVALID].forEach(
      (v) => {
        expect(typeof v).toBe("string");
        expect(v.length).toBeGreaterThan(0);
      }
    );
  });

  it("SUCCESS, ERROR and TOKEN_INVALID are all distinct", () => {
    const set = new Set([
      ResultEnum.SUCCESS,
      ResultEnum.ERROR,
      ResultEnum.TOKEN_INVALID,
    ]);
    expect(set.size).toBe(3);
  });

  it("SUCCESS value indicates all-zero success code", () => {
    expect(ResultEnum.SUCCESS).toBe("00000");
  });
});
