/**
 * Unit tests for src/store/modules/availableVoices.ts
 * Covers: emotionMap, reverseEmotionMap, and availableVoices data integrity.
 */
import { describe, it, expect } from "vitest";
import {
  emotionMap,
  reverseEmotionMap,
  availableVoices,
} from "@/store/modules/availableVoices";

// -----------------------------------------------------------------------
// emotionMap
// -----------------------------------------------------------------------
describe("emotionMap", () => {
  it("maps 中性 to neutral", () => {
    expect(emotionMap["中性"]).toBe("neutral");
  });

  it("maps 悲伤 to sad", () => {
    expect(emotionMap["悲伤"]).toBe("sad");
  });

  it("maps 高兴 to happy", () => {
    expect(emotionMap["高兴"]).toBe("happy");
  });

  it("maps 生气 to angry", () => {
    expect(emotionMap["生气"]).toBe("angry");
  });

  it("maps 恐惧 to fear", () => {
    expect(emotionMap["恐惧"]).toBe("fear");
  });

  it("maps 撒娇 to sajiao", () => {
    expect(emotionMap["撒娇"]).toBe("sajiao");
  });

  it("maps 解说 to jieshuo", () => {
    expect(emotionMap["解说"]).toBe("jieshuo");
  });

  it("has 17 emotion entries", () => {
    expect(Object.keys(emotionMap)).toHaveLength(17);
  });

  it("all values are non-empty strings", () => {
    for (const [, value] of Object.entries(emotionMap)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("all Chinese keys are non-empty strings", () => {
    for (const key of Object.keys(emotionMap)) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });
});

// -----------------------------------------------------------------------
// reverseEmotionMap
// -----------------------------------------------------------------------
describe("reverseEmotionMap", () => {
  it("is the exact inverse of emotionMap", () => {
    for (const [chinese, english] of Object.entries(emotionMap)) {
      expect(reverseEmotionMap[english]).toBe(chinese);
    }
  });

  it("maps neutral to 中性", () => {
    expect(reverseEmotionMap["neutral"]).toBe("中性");
  });

  it("maps sad to 悲伤", () => {
    expect(reverseEmotionMap["sad"]).toBe("悲伤");
  });

  it("maps sajiao to 撒娇", () => {
    expect(reverseEmotionMap["sajiao"]).toBe("撒娇");
  });

  it("has same number of entries as emotionMap", () => {
    expect(Object.keys(reverseEmotionMap)).toHaveLength(
      Object.keys(emotionMap).length
    );
  });

  it("double-reverse lookup returns original key", () => {
    for (const [chinese, english] of Object.entries(emotionMap)) {
      const reversedBack = reverseEmotionMap[english];
      expect(reversedBack).toBe(chinese);
    }
  });
});

// -----------------------------------------------------------------------
// availableVoices
// -----------------------------------------------------------------------
describe("availableVoices", () => {
  it("is a non-empty array", () => {
    expect(availableVoices).toBeInstanceOf(Array);
    expect(availableVoices.length).toBeGreaterThan(0);
  });

  it("every voice has a non-empty string label", () => {
    for (const voice of availableVoices) {
      expect(typeof voice.label).toBe("string");
      expect(voice.label.length).toBeGreaterThan(0);
    }
  });

  it("every voice has a numeric value (id)", () => {
    for (const voice of availableVoices) {
      expect(typeof voice.value).toBe("number");
    }
  });

  it("every voice has a non-empty emotions array", () => {
    for (const voice of availableVoices) {
      expect(Array.isArray(voice.emotions)).toBe(true);
      expect(voice.emotions.length).toBeGreaterThan(0);
    }
  });

  it("every voice has non-empty type, scene, and language strings", () => {
    for (const voice of availableVoices) {
      expect(typeof voice.type).toBe("string");
      expect(voice.type.length).toBeGreaterThan(0);
      expect(typeof voice.scene).toBe("string");
      expect(voice.scene.length).toBeGreaterThan(0);
      expect(typeof voice.language).toBe("string");
      expect(voice.language.length).toBeGreaterThan(0);
    }
  });

  it("every voice has a non-empty sampleRate array", () => {
    for (const voice of availableVoices) {
      expect(Array.isArray(voice.sampleRate)).toBe(true);
      expect(voice.sampleRate.length).toBeGreaterThan(0);
    }
  });

  it("all value (id) fields are unique", () => {
    const values = availableVoices.map((v) => v.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("all label fields are unique", () => {
    const labels = availableVoices.map((v) => v.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("contains voices with 精品音色 type", () => {
    expect(availableVoices.some((v) => v.type === "精品音色")).toBe(true);
  });

  it("contains voices with 标准音色 type", () => {
    expect(availableVoices.some((v) => v.type === "标准音色")).toBe(true);
  });

  it("contains Chinese, English, and Japanese language voices", () => {
    const langs = new Set(availableVoices.map((v) => v.language));
    expect(langs.has("中文")).toBe(true);
    expect(langs.has("英文")).toBe(true);
    expect(langs.has("日文")).toBe(true);
  });

  it("all emotion names in voices are valid emotionMap keys", () => {
    for (const voice of availableVoices) {
      for (const emotion of voice.emotions) {
        expect(emotionMap).toHaveProperty(emotion);
      }
    }
  });

  it("all sampleRate values are valid (8k, 16k, or 24k)", () => {
    const validRates = new Set(["8k", "16k", "24k"]);
    for (const voice of availableVoices) {
      for (const rate of voice.sampleRate) {
        expect(validRates.has(rate)).toBe(true);
      }
    }
  });

  it("contains the standard premium voice 智逍遥 with value 100510000", () => {
    const voice = availableVoices.find((v) => v.value === 100510000);
    expect(voice).toBeDefined();
    expect(voice!.type).toBe("精品音色");
    expect(voice!.language).toBe("中文");
  });

  it("contains the standard voice 智聆 with value 1002", () => {
    const voice = availableVoices.find((v) => v.value === 1002);
    expect(voice).toBeDefined();
    expect(voice!.type).toBe("标准音色");
  });

  it("multi-emotion voices have 中性 as one of their emotions", () => {
    for (const voice of availableVoices) {
      expect(voice.emotions).toContain("中性");
    }
  });
});
