/**
 * Unit tests for src/store/modules/availableVoices.ts
 *
 * Note: emotionMap and reverseEmotionMap were removed in refactoring #30.
 * Emotion values are now English API params stored directly in voice.emotions.
 */
import { describe, it, expect } from "vitest";
import {
  availableVoices,
  type VoiceType,
} from "@/store/modules/availableVoices";

// The 17 valid English emotion API params defined in #30
const KNOWN_EMOTIONS = new Set([
  "neutral",
  "sad",
  "happy",
  "angry",
  "fear",
  "news",
  "story",
  "radio",
  "poetry",
  "call",
  "sajiao",
  "disgusted",
  "amaze",
  "peaceful",
  "exciting",
  "aojiao",
  "jieshuo",
]);

// -----------------------------------------------------------------------
// availableVoices — structural integrity
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
    expect(langs.has("zh")).toBe(true);
    expect(langs.has("en")).toBe(true);
    expect(langs.has("ja")).toBe(true);
  });

  it("all sampleRate values are valid (8k, 16k, or 24k)", () => {
    const validRates = new Set(["8k", "16k", "24k"]);
    for (const voice of availableVoices) {
      for (const rate of voice.sampleRate) {
        expect(validRates.has(rate)).toBe(true);
      }
    }
  });

  it("contains the premium voice 智逍遥 with value 100510000", () => {
    const voice = availableVoices.find((v) => v.value === 100510000);
    expect(voice).toBeDefined();
    expect(voice!.type).toBe("精品音色");
    expect(voice!.language).toBe("zh");
  });

  it("contains the premium voice 智聆 with value 101002", () => {
    const voice = availableVoices.find((v) => v.value === 101002);
    expect(voice).toBeDefined();
    expect(voice!.type).toBe("精品音色");
  });
});

// -----------------------------------------------------------------------
// availableVoices — emotion values (English API params since #30)
// -----------------------------------------------------------------------
describe("availableVoices emotion values (English API params)", () => {
  it("all emotion strings are known English API params", () => {
    for (const voice of availableVoices) {
      for (const emotion of voice.emotions) {
        expect(KNOWN_EMOTIONS.has(emotion)).toBe(true);
      }
    }
  });

  it("no voice has Chinese emotion strings", () => {
    const chinesePattern = /[\u4e00-\u9fa5]/;
    for (const voice of availableVoices) {
      for (const emotion of voice.emotions) {
        expect(chinesePattern.test(emotion)).toBe(false);
      }
    }
  });

  it("all voices include 'neutral' as an emotion", () => {
    for (const voice of availableVoices) {
      expect(voice.emotions).toContain("neutral");
    }
  });

  it("voice 301000 (爱小广) has multiple emotions including happy and sad", () => {
    const voice = availableVoices.find((v) => v.value === 301000);
    expect(voice).toBeDefined();
    expect(voice!.emotions).toContain("happy");
    expect(voice!.emotions).toContain("sad");
    expect(voice!.emotions.length).toBeGreaterThan(1);
  });

  it("has exactly 17 distinct emotion types across all voices", () => {
    const allEmotions = new Set(availableVoices.flatMap((v) => v.emotions));
    expect(allEmotions.size).toBe(17);
    for (const e of allEmotions) {
      expect(KNOWN_EMOTIONS.has(e)).toBe(true);
    }
  });

  it("simple voices have exactly one emotion: neutral", () => {
    const voice = availableVoices.find((v) => v.value === 101002); // 智聆
    expect(voice).toBeDefined();
    expect(voice!.emotions).toEqual(["neutral"]);
  });
});

// -----------------------------------------------------------------------
// VoiceType interface shape
// -----------------------------------------------------------------------
describe("VoiceType shape", () => {
  it("every voice satisfies the VoiceType interface", () => {
    const requiredKeys: (keyof VoiceType)[] = [
      "label",
      "value",
      "emotions",
      "type",
      "scene",
      "language",
      "sampleRate",
    ];
    for (const voice of availableVoices) {
      for (const key of requiredKeys) {
        expect(voice).toHaveProperty(key);
      }
    }
  });
});
