import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SCENE_NAME_FORMAT,
  SCENE_NAME_MAX_LENGTH,
  formatSceneName,
  formatClonedSceneName,
  parseSceneName,
  resolveSceneNameTimeZone,
} from "@/utils/sceneName";

afterEach(() => {
  vi.useRealTimers();
});

describe("scene names", () => {
  it("replaces the clone timestamp on every generation, keeping one suffix", () => {
    let name = "组件_2026-06-30_11-00-05";
    for (let second = 0; second < 10; second++) {
      name = formatClonedSceneName(
        name,
        " - 副本",
        new Date(Date.UTC(2026, 9, 24, 5, 14, second)),
        "Asia/Shanghai"
      );
      expect(name).toBe(
        `组件_2026-10-24_13-14-${String(second).padStart(2, "0")}`
      );
    }
  });

  it.each([
    "组件_2026-06-30_11-00-05_2026-09-11_12-00-00",
    "组件_2026-06-30_11-00-05 - 副本 - 副本",
    "组件 - 副本_2026-06-30_11-00-05 - 副本",
    "组件_2026-06-30_11-00-05（副本 2026-09-11 15:15:26）_2026-09-12_01-02-03",
  ])("cleans historical copy suffix chains without growing %s", (name) => {
    expect(
      formatClonedSceneName(
        name,
        " - 副本",
        new Date("2026-10-24T05:14:15Z"),
        "Asia/Shanghai"
      )
    ).toBe("组件_2026-10-24_13-14-15");
  });

  it("retains business dates and suffix descriptions while preparing a clone", () => {
    expect(
      formatClonedSceneName(
        "2026-09-21展览（副本说明）_2026-06-30_11-00-05",
        " - 副本",
        new Date("2026-10-24T05:14:15Z"),
        "Asia/Shanghai"
      )
    ).toBe("2026-09-21展览（副本说明）_2026-10-24_13-14-15");
  });

  it.each([" - 副本", " - Copy", " - コピー", " - สำเนา"])(
    "also cleans a known historical UI suffix without a current locale: %s",
    (suffix) => {
      expect(
        formatClonedSceneName(
          `组件_2026-06-30_11-00-05${suffix}_2026-09-11_12-00-00${suffix}`,
          undefined,
          new Date("2026-10-24T05:14:15Z"),
          "Asia/Shanghai"
        )
      ).toBe("组件_2026-10-24_13-14-15");
    }
  );

  it("uses one timezone for both the date and the time across midnight", () => {
    const at = new Date("2026-10-23T17:05:06.789Z");
    expect(formatSceneName("新场景", at, "UTC")).toBe(
      "新场景_2026-10-23_17-05-06"
    );
    expect(formatSceneName("新场景", at, "Asia/Shanghai")).toBe(
      "新场景_2026-10-24_01-05-06"
    );
  });

  it("formats UTC midnight as 00 without rolling to the next day", () => {
    expect(
      formatSceneName("Midnight", new Date("2026-10-24T00:00:00Z"), "UTC")
    ).toBe("Midnight_2026-10-24_00-00-00");
  });

  it.each([
    ["2026-01-01T02:03:04Z", "2025-12-31_21-03-04"],
    ["2026-07-01T02:03:04Z", "2026-06-30_22-03-04"],
  ])("observes New York daylight saving for %s", (instant, expected) => {
    expect(
      formatSceneName("Scene", new Date(instant), "America/New_York")
    ).toBe(`Scene_${expected}`);
  });

  it("defaults to the current instant and Intl timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T17:05:06Z"));
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(resolveSceneNameTimeZone()).toBe(timeZone);
    expect(formatSceneName("Scene")).toBe(
      formatSceneName("Scene", new Date(), timeZone)
    );
  });

  it("parses a real leap day and preserves underscores in the base name", () => {
    expect(parseSceneName("我的_展厅_2024-02-29_23-59-58")).toEqual({
      baseName: "我的_展厅",
      date: "2024-02-29",
      time: "23:59:58",
      timestamp: "2024-02-29T23:59:58",
    });
    expect(
      formatSceneName("我的_展厅", new Date("2024-02-29T12:00:00Z"), "UTC")
    ).toBe("我的_展厅_2024-02-29_12-00-00");
  });

  it.each([
    "Scene_2026-02-29_12-00-00",
    "Scene_2024-02-30_12-00-00",
    "Scene_2026-13-01_12-00-00",
    "Scene_2026-01-01_24-00-00",
    "Scene_2026-01-01_12-60-00",
    "Scene_2026-01-01_12-00-60",
    "Scene_20261024",
    "Scene_2026-10-24",
    "Scene（2026-10-24）",
    "Scene_2026-10-24_01-02-03 - 副本",
    "_2026-10-24_01-02-03",
  ])("does not parse invalid or incomplete suffixes: %s", (name) => {
    expect(parseSceneName(name)).toBeNull();
  });

  it("replaces an existing canonical suffix without stacking dates", () => {
    const at = new Date("2026-10-24T01:02:03Z");
    const name = formatSceneName(
      "  Scene_with_parts_2024-02-29_23-59-58  ",
      at,
      "UTC"
    );
    expect(name).toBe("Scene_with_parts_2026-10-24_01-02-03");
    expect(formatSceneName(name, at, "UTC")).toBe(name);
  });

  it("preserves noncanonical dates that may be meaningful title content", () => {
    expect(
      formatSceneName(
        "Exhibit（20260921）",
        new Date("2026-10-24T01:02:03Z"),
        "UTC"
      )
    ).toBe("Exhibit（20260921）_2026-10-24_01-02-03");
  });

  it.each(["", "   ", "Scene\n", "Scene\u0000", "Scene\u007f", "Scene\u0085"])(
    "rejects empty names and control characters: %j",
    (name) => {
      expect(() => formatSceneName(name)).toThrow(TypeError);
    }
  );

  it("rejects invalid instants and timezones", () => {
    expect(() => formatSceneName("Scene", new Date("invalid"))).toThrow(
      TypeError
    );
    expect(() => resolveSceneNameTimeZone("Mars/Olympus_Mons")).toThrow(
      RangeError
    );
    expect(() => resolveSceneNameTimeZone("")).toThrow(RangeError);
    expect(() => formatSceneName("Scene", new Date(), "invalid")).toThrow(
      RangeError
    );
  });

  it("enforces the final length without truncating the base name", () => {
    const at = new Date("2026-10-24T01:02:03Z");
    const suffixLength = "_2026-10-24_01-02-03".length;
    const base = "场".repeat(SCENE_NAME_MAX_LENGTH - suffixLength);
    const formatted = formatSceneName(base, at, "UTC");
    expect(SCENE_NAME_FORMAT).toBe("名称_YYYY-MM-DD_HH-mm-ss");
    expect(formatted).toHaveLength(SCENE_NAME_MAX_LENGTH);
    expect(parseSceneName(formatted)?.baseName).toBe(base);
    expect(() => formatSceneName(`${base}多`, at, "UTC")).toThrow(RangeError);
  });
});
