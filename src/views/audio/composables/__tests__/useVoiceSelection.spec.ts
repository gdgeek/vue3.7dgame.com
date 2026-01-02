import { describe, it, expect, beforeEach } from "vitest";
import { useVoiceSelection } from "../useVoiceSelection";
import { nextTick } from "vue";

describe("useVoiceSelection", () => {
  let voiceSelection: ReturnType<typeof useVoiceSelection>;

  beforeEach(() => {
    voiceSelection = useVoiceSelection();
  });

  it("should initialize with default values", () => {
    const {
      selectedVoiceType,
      voiceType,
      voiceScene,
      voiceLanguage,
      autoSwitchLanguage,
      emotionCategory,
    } = voiceSelection;

    expect(selectedVoiceType.value).toBe(101002); // 智聆
    expect(voiceType.value).toBe("");
    expect(voiceScene.value).toBe("");
    expect(voiceLanguage.value).toBe("");
    expect(autoSwitchLanguage.value).toBe(true);
    expect(emotionCategory.value).toBe("");
  });

  it("should filter voices by language", () => {
    const { voiceLanguage, filteredVoices } = voiceSelection;

    voiceLanguage.value = "英文";
    expect(filteredVoices.value.length).toBeGreaterThan(0);
    expect(filteredVoices.value.every((v) => v.language === "英文")).toBe(true);

    voiceLanguage.value = "中文";
    expect(filteredVoices.value.every((v) => v.language === "中文")).toBe(true);
  });

  it("should provide available scenes based on all voices", () => {
    const { availableScenes } = voiceSelection;
    expect(availableScenes.value).toContain("通用女声");
    expect(availableScenes.value).toContain("通用男声");
    expect(availableScenes.value.length).toBeGreaterThan(5);
  });

  it("should update available emotions when voice changes", async () => {
    const { selectedVoiceType, availableEmotions } = voiceSelection;

    // Choose a voice with multiple emotions (e.g., 爱小广 - 301000)
    selectedVoiceType.value = 301000;
    await nextTick();
    expect(availableEmotions.value).toContain("高兴");
    expect(availableEmotions.value).toContain("悲伤");

    // Choose a standard voice (e.g., 智聆 - 101002)
    selectedVoiceType.value = 101002;
    await nextTick();
    expect(availableEmotions.value).toEqual(["中性"]);
  });

  it("should auto-select first available voice when filters change", async () => {
    const { voiceLanguage, selectedVoiceType, filteredVoices } = voiceSelection;

    // Switch to English
    voiceLanguage.value = "英文";
    await nextTick();

    const firstEnglishVoice = filteredVoices.value[0];
    expect(selectedVoiceType.value).toBe(firstEnglishVoice.value);
  });

  it("should group voices correctly", () => {
    const { groupedVoices } = voiceSelection;
    expect(groupedVoices.value.some((g) => g.type === "精品音色")).toBe(true);

    const jingpinGroup = groupedVoices.value.find((g) => g.type === "精品音色");
    expect(jingpinGroup?.voices.length).toBeGreaterThan(0);
  });
});
