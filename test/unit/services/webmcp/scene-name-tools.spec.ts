import { describe, expect, it, vi } from "vitest";
import { createSceneNameTools } from "@/services/webmcp/scene-name-tools";

const now = () => Date.parse("2026-10-23T16:05:06Z");
const tool = () => createSceneNameTools(now)[0];
const format = (input: unknown) => tool().execute(input);

describe("WebMCP scene name formatting", () => {
  it("refreshes the existing suffix when cloning without an explicit timestamp", () => {
    const clock = vi.fn(now);
    const formatter = createSceneNameTools(clock)[0];
    const input = {
      baseName: "组件_2026-06-30_11-00-05",
      refreshTimestamp: true,
      timeZone: "Asia/Shanghai",
    };
    const first = formatter.execute(input) as { name: string };
    expect(first).toMatchObject({
      name: "组件_2026-10-24_00-05-06",
      timestampSource: "current",
    });
    clock.mockReturnValueOnce(Date.parse("2026-10-23T16:06:07Z"));
    expect(formatter.execute({ ...input, baseName: first.name })).toMatchObject(
      {
        name: "组件_2026-10-24_00-06-07",
        timestampSource: "current",
      }
    );
  });

  it("cleans repeated and historical generated times only when preparing a clone", () => {
    expect(
      format({
        baseName:
          "场景_2026-06-30_11-00-05（副本 2026-09-11 15:15:26）_2026-09-12_01-02-03",
        refreshTimestamp: true,
        timeZone: "Asia/Shanghai",
      })
    ).toMatchObject({ name: "场景_2026-10-24_00-05-06" });
  });

  it("refreshes a timestamp before a historical copy label without retaining either suffix", () => {
    expect(
      format({
        baseName: "组件_2026-06-30_11-00-05 - 副本",
        refreshTimestamp: true,
        timeZone: "Asia/Shanghai",
      })
    ).toMatchObject({ name: "组件_2026-10-24_00-05-06" });
  });

  it("uses the actual clock and one explicit timezone across midnight", () => {
    expect(
      format({ baseName: "新场景", timeZone: "Asia/Shanghai" })
    ).toMatchObject({
      name: "新场景_2026-10-24_00-05-06",
      date: "2026-10-24",
      time: "00:05:06",
      timeZone: "Asia/Shanghai",
      timestampSource: "current",
    });
    expect(tool().annotations?.readOnlyHint).toBe(true);
  });

  it("uses the timestamp instant and output zone without mixing their dates", () => {
    expect(
      format({
        baseName: "科学护眼 · 独立课程验收",
        timestamp: "2026-09-21T00:30:05+08:00",
        timeZone: "UTC",
      })
    ).toMatchObject({
      name: "科学护眼 · 独立课程验收_2026-09-20_16-30-05",
      timestampSource: "provided",
      timeZone: "UTC",
    });
  });

  it("preserves an existing canonical name and does not invent its timezone", () => {
    const name = "实验_第一组_2026-02-28_22-03-04";
    expect(
      format({ baseName: name, timeZone: "America/New_York" })
    ).toMatchObject({
      name,
      baseName: "实验_第一组",
      timeZone: null,
      timestampSource: "existing",
    });
    expect(
      format({
        baseName: name,
        timestamp: "2026-09-21T11:00:05+08:00",
        timeZone: "Asia/Shanghai",
      })
    ).toMatchObject({
      name: "实验_第一组_2026-09-21_11-00-05",
      timestampSource: "provided",
    });
  });

  it.each([
    "科学护眼 · 独立课程验收 · 20260921",
    "WebMCP R1 浏览器运行验收 20260916",
    "WebMCP P2 线上验收 A-B 2026-09-16",
    "科學館合集－展區就地返回版（2026-09-11）",
    "WebMCP P0 发布回执_2026-09-11",
    "Scene20260921",
    "Scene_2026-02-30_11-00-00",
    "Scene_2026-09-21_11-00",
  ])("requires an explicit base name for the historical date in %s", (name) => {
    expect(format({ baseName: name })).toMatchObject({
      isError: true,
      errorCode: "invalid_scene_name",
      message: expect.stringContaining("日期后缀"),
    });
  });

  it("keeps dates inside a meaningful title when they are not suffixes", () => {
    expect(
      format({
        baseName: "2026-09-21 活动回顾",
        timeZone: "UTC",
      })
    ).toMatchObject({ name: "2026-09-21 活动回顾_2026-10-23_16-05-06" });
  });

  it.each([
    "2026-09-21",
    "2026-09-21T11:00:05",
    "2026-02-30T11:00:05+08:00",
    "2026-09-21T24:00:00Z",
    "2026-09-21T11:60:00Z",
    "2026-09-21T11:00:05+24:00",
    null,
  ])("rejects an ambiguous or impossible timestamp: %s", (timestamp) => {
    expect(format({ baseName: "场景", timestamp })).toMatchObject({
      isError: true,
      errorCode: "invalid_scene_name",
    });
  });

  it("accepts a real leap day and explicit milliseconds without changing second precision", () => {
    expect(
      format({
        baseName: "闰日场景",
        timestamp: "2024-02-29T23:59:59.123Z",
        timeZone: "UTC",
      })
    ).toMatchObject({ name: "闰日场景_2024-02-29_23-59-59" });
  });

  it.each([
    null,
    [],
    {},
    { baseName: "" },
    { baseName: "\n场景" },
    { baseName: "场景", sceneId: 42 },
    { baseName: "场景", timeZone: "" },
    { baseName: "场景", timeZone: 8 },
    { baseName: "场景", refreshTimestamp: "true" },
    { baseName: "场景", timeZone: "Not/A_Zone" },
    { baseName: "a".repeat(181) },
    { baseName: "Scene\n" },
    { baseName: `Scene${" ".repeat(200)}_2026-09-21_11-00-00` },
  ])("fails closed on malformed or excessive input: %j", (input) => {
    expect(format(input)).toMatchObject({
      isError: true,
      errorCode: "invalid_scene_name",
    });
  });

  it("does not act on an already aborted request", () => {
    const clock = vi.fn(now);
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      createSceneNameTools(clock)[0].execute(
        { baseName: "场景" },
        { signal: controller.signal }
      )
    ).toThrow();
    expect(clock).not.toHaveBeenCalled();
  });
});
