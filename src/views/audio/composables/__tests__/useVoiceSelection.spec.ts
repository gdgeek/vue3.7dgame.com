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

    voiceLanguage.value = "en";
    expect(filteredVoices.value.length).toBeGreaterThan(0);
    expect(filteredVoices.value.every((v) => v.language === "en")).toBe(true);

    voiceLanguage.value = "zh";
    expect(filteredVoices.value.every((v) => v.language === "zh")).toBe(true);
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
    expect(availableEmotions.value).toContain("happy");
    expect(availableEmotions.value).toContain("sad");

    // Choose a standard voice (e.g., 智聆 - 101002)
    selectedVoiceType.value = 101002;
    await nextTick();
    expect(availableEmotions.value).toEqual(["neutral"]);
  });

  it("should auto-select first available voice when filters change", async () => {
    const { voiceLanguage, selectedVoiceType, filteredVoices } = voiceSelection;

    // Switch to English
    voiceLanguage.value = "en";
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

  it("filteredEmotions returns only neutral when voice has one emotion", async () => {
    const { selectedVoiceType, filteredEmotions } = voiceSelection;
    selectedVoiceType.value = 101002; // 智聆: only ['neutral']
    await nextTick();
    expect(filteredEmotions.value).toEqual(["neutral"]);
  });

  it("filteredEmotions excludes neutral when multiple emotions exist", async () => {
    const { selectedVoiceType, filteredEmotions } = voiceSelection;
    selectedVoiceType.value = 301000; // 爱小广: many emotions including neutral
    await nextTick();
    expect(filteredEmotions.value).not.toContain("neutral");
    expect(filteredEmotions.value.length).toBeGreaterThan(0);
  });

  it("supportHighSampleRate is false for standard voices", async () => {
    const { selectedVoiceType, supportHighSampleRate } = voiceSelection;
    selectedVoiceType.value = 101002; // sampleRate: ['8k','16k']
    await nextTick();
    expect(supportHighSampleRate.value).toBe(false);
  });

  it("supportHighSampleRate is true for voices with 24k", async () => {
    const { selectedVoiceType, supportHighSampleRate } = voiceSelection;
    selectedVoiceType.value = 301030; // 爱小溪: ['8k','16k','24k']
    await nextTick();
    expect(supportHighSampleRate.value).toBe(true);
  });

  it("resets emotionCategory when changed voice does not support current emotion", async () => {
    const { selectedVoiceType, emotionCategory } = voiceSelection;
    selectedVoiceType.value = 301000; // many emotions
    await nextTick();
    emotionCategory.value = "happy";

    selectedVoiceType.value = 101002; // only neutral
    await nextTick();

    expect(emotionCategory.value).toBe("");
  });

  it("keeps emotionCategory when new voice supports the current emotion", async () => {
    const { selectedVoiceType, emotionCategory } = voiceSelection;
    selectedVoiceType.value = 301000; // happy is available
    await nextTick();
    emotionCategory.value = "happy";

    selectedVoiceType.value = 301001; // 爱小栋 also has happy
    await nextTick();

    expect(emotionCategory.value).toBe("happy");
  });

  it("emotionIntensity initializes to 100", () => {
    const { emotionIntensity } = voiceSelection;
    expect(emotionIntensity.value).toBe(100);
  });

  it("filters voices by voiceScene", async () => {
    const { voiceScene, filteredVoices } = voiceSelection;
    voiceScene.value = "通用女声";
    await nextTick();
    expect(filteredVoices.value.length).toBeGreaterThan(0);
    expect(filteredVoices.value.every((v) => v.scene === "通用女声")).toBe(true);
  });

  it("filters voices by voiceType", async () => {
    const { voiceType, filteredVoices } = voiceSelection;
    voiceType.value = "精品音色";
    await nextTick();
    expect(filteredVoices.value.length).toBeGreaterThan(0);
    expect(filteredVoices.value.every((v) => v.type === "精品音色")).toBe(true);
  });

  it("clearing voiceLanguage filter shows all voices", async () => {
    const { voiceLanguage, filteredVoices } = voiceSelection;
    const totalVoices = filteredVoices.value.length;

    voiceLanguage.value = "en";
    await nextTick();
    expect(filteredVoices.value.length).toBeLessThan(totalVoices);

    voiceLanguage.value = "";
    await nextTick();
    expect(filteredVoices.value.length).toBe(totalVoices);
  });

  it("availableEmotions returns neutral for unknown voice ID", async () => {
    const { selectedVoiceType, availableEmotions } = voiceSelection;
    selectedVoiceType.value = 999999; // unknown ID
    await nextTick();
    expect(availableEmotions.value).toEqual(["neutral"]);
  });
});
