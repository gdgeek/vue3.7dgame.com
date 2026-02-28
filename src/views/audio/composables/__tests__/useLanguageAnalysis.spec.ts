/**
 * Unit tests for src/views/audio/composables/useLanguageAnalysis.ts
 *
 * Tests the pure character-counting and language-detection logic inside
 * checkTextLanguage().  Side effects (ElMessage, setTimeout) are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useLanguageAnalysis } from "../useLanguageAnalysis";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("element-plus", () => ({
  ElMessage: Object.assign(vi.fn(), {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function makeRefs(lang = "", autoSwitch = false) {
  return {
    voiceLanguage: ref(lang),
    autoSwitchLanguage: ref(autoSwitch),
  };
}

// -----------------------------------------------------------------------
// Language detection
// -----------------------------------------------------------------------
describe("useLanguageAnalysis — language detection", () => {
  let result: ReturnType<typeof useLanguageAnalysis>;

  beforeEach(() => {
    vi.useFakeTimers();
    result = useLanguageAnalysis();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("detects pure Chinese text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.detectedLanguage).toBe("中文");
    expect(result.languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("detects pure English text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("hello world", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.detectedLanguage).toBe("英文");
    expect(result.languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("detects pure Japanese kana text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage(
      "こんにちはせかい",
      voiceLanguage,
      autoSwitchLanguage
    );
    expect(result.languageAnalysis.value.detectedLanguage).toBe("日文");
    expect(result.languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("marks mixed Chinese+English as multi-language", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("Hello 你好", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.isMultiLanguage).toBe(true);
  });

  it("marks mixed Chinese+Japanese as multi-language", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("你好こんにちは", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.isMultiLanguage).toBe(true);
  });

  it("returns early without changes when text is empty", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    const before = { ...result.languageAnalysis.value };
    result.checkTextLanguage("", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value).toEqual(before);
  });

  it("dominant language wins when mixed — Chinese majority", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    // 4 Chinese chars vs 1 English word (5 letters) → Chinese wins by char count
    result.checkTextLanguage("你好世界 hi", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.detectedLanguage).toBe("中文");
  });

  it("dominant language wins when mixed — English majority", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage(
      "hello world test 你",
      voiceLanguage,
      autoSwitchLanguage
    );
    expect(result.languageAnalysis.value.detectedLanguage).toBe("英文");
  });
});

// -----------------------------------------------------------------------
// Character counting
// -----------------------------------------------------------------------
describe("useLanguageAnalysis — character counts", () => {
  let result: ReturnType<typeof useLanguageAnalysis>;

  beforeEach(() => {
    vi.useFakeTimers();
    result = useLanguageAnalysis();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("counts Chinese characters correctly", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.chineseCount).toBe(4);
  });

  it("counts English letters correctly", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("hello", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.englishCount).toBe(5);
  });

  it("counts Japanese kana correctly", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("こんにちは", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.japaneseCount).toBe(5);
  });

  it("totalChars equals text.length", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    const text = "Hello 你好!";
    result.checkTextLanguage(text, voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.totalChars).toBe(text.length);
  });

  it("percentages sum to approximately 100", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("Hello 你好 こんにちは!", voiceLanguage, autoSwitchLanguage);
    const { chinesePercentage, japanesePercentage, englishPercentage, otherPercentage } =
      result.languageAnalysis.value;
    const sum = chinesePercentage + japanesePercentage + englishPercentage + otherPercentage;
    // Allow ±1 for rounding
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });
});

// -----------------------------------------------------------------------
// Auto language switching
// -----------------------------------------------------------------------
describe("useLanguageAnalysis — auto language switching", () => {
  let result: ReturnType<typeof useLanguageAnalysis>;

  beforeEach(() => {
    vi.useFakeTimers();
    result = useLanguageAnalysis();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("switches voiceLanguage when autoSwitch is on and language differs", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs("英文", true);
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(voiceLanguage.value).toBe("中文");
  });

  it("does not switch voiceLanguage when autoSwitch is off", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs("英文", false);
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(voiceLanguage.value).toBe("英文");
  });

  it("sets voiceLanguage when it is empty and autoSwitch is on", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs("", true);
    result.checkTextLanguage("hello world", voiceLanguage, autoSwitchLanguage);
    expect(voiceLanguage.value).toBe("英文");
  });

  it("does not change voiceLanguage when language already matches", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs("中文", true);
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(voiceLanguage.value).toBe("中文");
  });
});

// -----------------------------------------------------------------------
// suggestion text
// -----------------------------------------------------------------------
describe("useLanguageAnalysis — suggestion", () => {
  let result: ReturnType<typeof useLanguageAnalysis>;

  beforeEach(() => {
    vi.useFakeTimers();
    result = useLanguageAnalysis();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("sets a non-empty suggestion for pure Chinese text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.suggestion.length).toBeGreaterThan(0);
  });

  it("sets a non-empty suggestion for pure English text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("hello world", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.suggestion.length).toBeGreaterThan(0);
  });

  it("suggestion contains mixedLanguageDetected key for multi-language text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("Hello 你好", voiceLanguage, autoSwitchLanguage);
    // t() is a passthrough returning the key itself
    expect(result.languageAnalysis.value.suggestion).toContain(
      "tts.mixedLanguageDetected"
    );
  });

  it("suggestion contains mainLanguageDetected key for single-language text", () => {
    const { voiceLanguage, autoSwitchLanguage } = makeRefs();
    result.checkTextLanguage("你好世界", voiceLanguage, autoSwitchLanguage);
    expect(result.languageAnalysis.value.suggestion).toContain(
      "tts.mainLanguageDetected"
    );
  });
});
