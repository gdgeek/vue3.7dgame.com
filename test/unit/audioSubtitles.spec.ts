import { describe, expect, it } from "vitest";
import {
  audioMetadata,
  parseSubtitleFile,
  readAudioSubtitles,
  readSubtitleSettings,
  subtitleAt,
  subtitleLinesAt,
  mergeSubtitleTranslation,
  mergeAdjacentSubtitles,
  validateSubtitles,
} from "../../src/utils/audioSubtitles";

describe("audio subtitles", () => {
  it("preserves bilingual cues and defaults legacy audio to bilingual with only its original text", () => {
    const cues = [
      {
        start: 0,
        end: 3,
        text: "欢迎来到隆兴寺",
        translation: "Welcome to Longxing Temple",
      },
    ];
    expect(readAudioSubtitles(JSON.stringify({ subtitles: cues }))).toEqual(
      cues
    );
    expect(subtitleLinesAt(cues, 1)).toEqual([
      cues[0].text,
      cues[0].translation,
    ]);
    expect(subtitleLinesAt(cues, 1, "primary")).toEqual([cues[0].text]);
    expect(subtitleLinesAt(cues, 1, "secondary")).toEqual([
      cues[0].translation,
    ]);
    expect(subtitleLinesAt(cues, 3)).toEqual([]);
    expect(subtitleLinesAt([{ start: 0, end: null, text: "原文" }], 1)).toEqual(
      ["原文"]
    );
    expect(
      subtitleLinesAt([{ start: 0, end: null, text: "原文" }], 1, "secondary")
    ).toEqual([]);
    expect(
      readSubtitleSettings({ subtitleSettings: { display: "secondary" } })
        .display
    ).toBe("bilingual");
    expect(readSubtitleSettings(null)).toEqual({
      primaryLanguage: "zh-CN",
      secondaryLanguage: "en",
      display: "bilingual",
    });
    expect(
      readSubtitleSettings({ subtitleSettings: { display: "unknown" } }).display
    ).toBe("bilingual");
  });

  it("matches imported translations by times and rejects shifted or ambiguous timelines atomically", () => {
    const cues = [
      { start: 0, end: 2, text: "甲" },
      { start: 3, end: 5, text: "乙" },
    ];
    expect(
      mergeSubtitleTranslation(cues, [{ start: 3.001, end: 5, text: "B" }])
    ).toEqual([cues[0], { ...cues[1], translation: "B" }]);
    expect(() =>
      mergeSubtitleTranslation(cues, [
        { start: 0, end: 2, text: "A" },
        { start: 2, end: 5, text: "B" },
      ])
    ).toThrow("第 2 条");
    expect(cues[0]).not.toHaveProperty("translation");
    expect(() =>
      mergeSubtitleTranslation(
        [cues[0], cues[0]],
        [{ start: 0, end: 2, text: "A" }]
      )
    ).toThrow();
    expect(() =>
      validateSubtitles([{ ...cues[0], translation: "x".repeat(501) }])
    ).toThrow();
  });

  it("merges the continuous split sentence from the screenshot without mutating source cues", () => {
    const split = [
      { start: 19.7, end: 21.8, text: "传入我国以后被完全" },
      { start: 21.8, end: 25.7, text: "汉化的还有护世四大天王" },
    ];
    expect(mergeAdjacentSubtitles(split)).toEqual([
      {
        start: 19.7,
        end: 25.7,
        text: "传入我国以后被完全汉化的还有护世四大天王",
      },
    ]);
    expect(split[0].end).toBe(21.8);
  });

  it("preserves sentence ends, pauses, long captions and unknown final durations", () => {
    const first = { start: 0, end: 2, text: "第一句" };
    for (const [left, right] of [
      [
        { ...first, text: "第一句。" },
        { start: 2, end: 4, text: "第二句" },
      ],
      [first, { start: 2.1, end: 4, text: "有停顿" }],
      [first, { start: 2, end: 9, text: "持续过长" }],
      [first, { start: 2, end: 4, text: "长".repeat(40) }],
      [first, { start: 2, end: null, text: "未知结束" }],
    ])
      expect(mergeAdjacentSubtitles([left, right])).toHaveLength(2);
    const chain = Array.from({ length: 5 }, (_, i) => ({
      start: i * 2,
      end: (i + 1) * 2,
      text: "片段",
    }));
    expect(mergeAdjacentSubtitles(chain).map((cue) => cue.end)).toEqual([
      8, 10,
    ]);
    expect(
      mergeAdjacentSubtitles([
        { start: 0, end: 1, text: "Welcome to" },
        { start: 1, end: 2, text: "Longxing Temple" },
      ])[0].text
    ).toBe("Welcome to Longxing Temple");
  });

  it("binds several translated pieces to the merged original and rejects incomplete coverage atomically", () => {
    const original = [
      {
        start: 19.7,
        end: 25.7,
        text: "传入我国以后被完全汉化的还有护世四大天王",
      },
    ];
    const translated = [
      { start: 19.7, end: 21.8, text: "After arriving in China," },
      {
        start: 21.8,
        end: 25.7,
        text: "the Four Heavenly Kings were localized.",
      },
    ];
    expect(mergeSubtitleTranslation(original, translated)[0].translation).toBe(
      "After arriving in China, the Four Heavenly Kings were localized."
    );
    expect(() =>
      mergeSubtitleTranslation(original, translated.slice(0, 1))
    ).toThrow();
    expect(() =>
      mergeSubtitleTranslation(original, [
        translated[0],
        { ...translated[1], start: 22 },
      ])
    ).toThrow();
    expect(original[0]).not.toHaveProperty("translation");
  });

  it("reads SRT with BOM, CRLF, and end-exclusive timestamps", () => {
    const cues = parseSubtitleFile(
      "\uFEFF1\r\n00:00:01,000 --> 00:00:03,000\r\n第一句\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\n第二句"
    );
    expect(subtitleAt(cues, 0)).toBe("");
    expect(subtitleAt(cues, 1)).toBe("第一句");
    expect(subtitleAt(cues, 3)).toBe("第二句");
    expect(subtitleAt(cues, 4)).toBe("");
  });

  it("reads VTT cue IDs, settings and notes", () => {
    const cues = parseSubtitleFile(
      "WEBVTT\n\nNOTE a comment\n\nintro\n00:01.250 --> 00:05.000 align:start\n<v Guide>隆兴寺</v>"
    );
    expect(cues).toEqual([{ start: 1.25, end: 5, text: "隆兴寺" }]);
  });

  it("honors empty Longxing timestamp markers and preserves other audio metadata", () => {
    const cues = parseSubtitleFile(
      JSON.stringify({
        data: [
          { time: 0, text: "第一句" },
          { time: 3, text: "" },
          { time: 5, text: "第二句" },
        ],
      })
    );
    const info = JSON.stringify({
      ...audioMetadata('{"length":8,"size":64}'),
      subtitles: cues,
    });
    expect(readAudioSubtitles(info)).toEqual([
      { start: 0, end: 3, text: "第一句" },
      { start: 5, end: null, text: "第二句" },
    ]);
    expect(subtitleAt(cues, 4)).toBe("");
    expect(subtitleAt(cues, 7)).toBe("第二句");
    expect(audioMetadata(info).length).toBe(8);
  });

  it("rejects inverted intervals and ignores unreadable stored subtitle metadata", () => {
    expect(() =>
      parseSubtitleFile("1\n00:00:03,000 --> 00:00:01,000\n示例")
    ).toThrow();
    expect(readAudioSubtitles('{"subtitles":[null]}')).toEqual([]);
  });
});
