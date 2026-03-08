/**
 * Unit tests for src/views/audio/composables/useVoiceSelection.ts
 *
 * Covers: initial state, computed filters (availableScenes, filteredVoices,
 * groupedVoices, availableEmotions, filteredEmotions, supportHighSampleRate)
 * and the watchers that auto-select the first matching voice.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

// vi.mock is hoisted — factory runs before module imports.
vi.mock("@/store/modules/availableVoices", () => ({
  availableVoices: [
    {
      value: 101002,
      label: "智聆，通用女声(精品)",
      type: "精品音色",
      scene: "通用女声",
      language: "zh",
      emotions: ["neutral"],
      sampleRate: ["8k", "16k"],
    },
    {
      value: 101004,
      label: "智云，通用男声(精品)",
      type: "精品音色",
      scene: "通用男声",
      language: "zh",
      emotions: ["neutral", "happy", "sad"],
      sampleRate: ["8k", "16k", "24k"],
    },
    {
      value: 200001,
      label: "EnVoice",
      type: "标准音色",
      scene: "通用英文",
      language: "en",
      emotions: ["neutral"],
      sampleRate: ["8k", "16k"],
    },
    {
      value: 300001,
      label: "JaVoice",
      type: "标准音色",
      scene: "通用日文",
      language: "ja",
      emotions: ["neutral", "happy"],
      sampleRate: ["8k"],
    },
  ],
}));

import { useVoiceSelection } from "@/views/audio/composables/useVoiceSelection";

describe("useVoiceSelection — initial state", () => {
  it("sets correct defaults for all refs", () => {
    const {
      selectedVoiceType,
      autoSwitchLanguage,
      emotionIntensity,
      voiceType,
      voiceScene,
      voiceLanguage,
      emotionCategory,
    } = useVoiceSelection();

    expect(selectedVoiceType.value).toBe(101002);
    expect(autoSwitchLanguage.value).toBe(true);
    expect(emotionIntensity.value).toBe(100);
    expect(voiceType.value).toBe("");
    expect(voiceScene.value).toBe("");
    expect(voiceLanguage.value).toBe("");
    expect(emotionCategory.value).toBe("");
  });
});

describe("useVoiceSelection — availableScenes", () => {
  it("returns all unique scenes with no duplicates", () => {
    const { availableScenes } = useVoiceSelection();
    expect(availableScenes.value).toContain("通用女声");
    expect(availableScenes.value).toContain("通用男声");
    expect(availableScenes.value).toContain("通用英文");
    expect(availableScenes.value).toContain("通用日文");
    expect(new Set(availableScenes.value).size).toBe(
      availableScenes.value.length
    );
  });
});

describe("useVoiceSelection — filteredVoices", () => {
  it("returns all voices when no filter is set", () => {
    const { filteredVoices } = useVoiceSelection();
    expect(filteredVoices.value).toHaveLength(4);
  });

  it("filters by voiceType", () => {
    const { filteredVoices, voiceType } = useVoiceSelection();
    voiceType.value = "标准音色";
    expect(filteredVoices.value).toHaveLength(2);
    expect(filteredVoices.value.every((v) => v.type === "标准音色")).toBe(true);
  });

  it("filters by voiceLanguage", () => {
    const { filteredVoices, voiceLanguage } = useVoiceSelection();
    voiceLanguage.value = "en";
    expect(filteredVoices.value).toHaveLength(1);
    expect(filteredVoices.value[0].value).toBe(200001);
  });

  it("combines voiceType and voiceLanguage filters", () => {
    const { filteredVoices, voiceType, voiceLanguage } = useVoiceSelection();
    voiceType.value = "标准音色";
    voiceLanguage.value = "ja";
    expect(filteredVoices.value).toHaveLength(1);
    expect(filteredVoices.value[0].value).toBe(300001);
  });
});

describe("useVoiceSelection — groupedVoices", () => {
  it("groups voices by type with correct counts", () => {
    const { groupedVoices } = useVoiceSelection();
    const types = groupedVoices.value.map((g) => g.type);
    expect(types).toContain("精品音色");
    expect(types).toContain("标准音色");
    const premium = groupedVoices.value.find((g) => g.type === "精品音色");
    expect(premium?.voices).toHaveLength(2);
    const standard = groupedVoices.value.find((g) => g.type === "标准音色");
    expect(standard?.voices).toHaveLength(2);
  });
});

describe("useVoiceSelection — availableEmotions", () => {
  it("returns the selected voice's emotion list", () => {
    const { selectedVoiceType, availableEmotions } = useVoiceSelection();
    selectedVoiceType.value = 101004;
    expect(availableEmotions.value).toEqual(["neutral", "happy", "sad"]);
  });

  it("falls back to ['neutral'] when voice is not found", () => {
    const { selectedVoiceType, availableEmotions } = useVoiceSelection();
    selectedVoiceType.value = 999999;
    expect(availableEmotions.value).toEqual(["neutral"]);
  });
});

describe("useVoiceSelection — filteredEmotions", () => {
  it("excludes neutral when other emotions exist", () => {
    const { selectedVoiceType, filteredEmotions } = useVoiceSelection();
    selectedVoiceType.value = 101004;
    expect(filteredEmotions.value).not.toContain("neutral");
    expect(filteredEmotions.value).toContain("happy");
    expect(filteredEmotions.value).toContain("sad");
  });

  it("retains neutral when it is the only emotion", () => {
    const { selectedVoiceType, filteredEmotions } = useVoiceSelection();
    selectedVoiceType.value = 101002;
    expect(filteredEmotions.value).toEqual(["neutral"]);
  });
});

describe("useVoiceSelection — supportHighSampleRate", () => {
  it("returns true for a 24k-capable voice and false otherwise", () => {
    const { selectedVoiceType, supportHighSampleRate } = useVoiceSelection();
    selectedVoiceType.value = 101004; // has 24k
    expect(supportHighSampleRate.value).toBe(true);
    selectedVoiceType.value = 101002; // no 24k
    expect(supportHighSampleRate.value).toBe(false);
  });
});

describe("useVoiceSelection — watchers", () => {
  it("auto-selects the first matching voice when voiceLanguage changes", async () => {
    const { selectedVoiceType, voiceLanguage } = useVoiceSelection();
    voiceLanguage.value = "en";
    await nextTick();
    expect(selectedVoiceType.value).toBe(200001);
  });

  it("auto-selects the first matching voice when voiceType changes", async () => {
    const { selectedVoiceType, voiceType } = useVoiceSelection();
    voiceType.value = "标准音色";
    await nextTick();
    // First standard voice in mock list has value 200001
    expect(selectedVoiceType.value).toBe(200001);
  });

  it("auto-selects first matching voice when voiceScene filter changes", async () => {
    const { selectedVoiceType, voiceScene } = useVoiceSelection();
    voiceScene.value = "通用男声";
    await nextTick();
    expect(selectedVoiceType.value).toBe(101004);
  });
});
