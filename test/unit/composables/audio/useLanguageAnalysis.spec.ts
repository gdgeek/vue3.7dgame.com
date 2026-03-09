/**
 * Unit tests for src/views/audio/composables/useLanguageAnalysis.ts
 *
 * Covers: initial state, language detection (zh/en/ja/mixed),
 * auto-switch of voiceLanguage, ElMessage warnings for text length,
 * and the debounced timer for multi-language notifications.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, createApp, defineComponent, h } from "vue";

// ── Module-level mock stubs ────────────────────────────────────────────────────
// Vitest hoists variables starting with "mock" before vi.mock factories run.
// Use WRAPPER lambdas inside factories so variables are captured lazily (not
// evaluated at factory-evaluation time, which would trigger TDZ errors).

const mockElMessageSuccess = vi.fn();
const mockElMessageWarning = vi.fn();
const mockElMessageInfo = vi.fn();
const mockElMessageError = vi.fn();
const mockElMessage = vi.fn();

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, args?: string[]) =>
      args ? `${key}:${args.join(",")}` : key,
  }),
}));

vi.mock("element-plus", () => ({
  // Wrap each stub in a lambda so the variable is NOT evaluated at factory time.
  ElMessage: Object.assign((...args: unknown[]) => mockElMessage(...args), {
    success: (...args: unknown[]) => mockElMessageSuccess(...args),
    warning: (...args: unknown[]) => mockElMessageWarning(...args),
    info: (...args: unknown[]) => mockElMessageInfo(...args),
    error: (...args: unknown[]) => mockElMessageError(...args),
  }),
  ElMessageBox: { prompt: vi.fn() },
}));

import { useLanguageAnalysis } from "@/views/audio/composables/useLanguageAnalysis";

// ── Setup / teardown ──────────────────────────────────────────────────────────
const cleanups: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
});

function mountUseLanguageAnalysis() {
  let result: ReturnType<typeof useLanguageAnalysis>;
  const app = createApp(
    defineComponent({
      setup() {
        result = useLanguageAnalysis();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  cleanups.push(() => app.unmount());
  return result!;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useLanguageAnalysis — initial state", () => {
  it("initialises all counts and flags to zero / empty", () => {
    const { languageAnalysis } = mountUseLanguageAnalysis();
    const a = languageAnalysis.value;
    expect(a.chineseCount).toBe(0);
    expect(a.englishCount).toBe(0);
    expect(a.japaneseCount).toBe(0);
    expect(a.totalChars).toBe(0);
    expect(a.detectedLanguage).toBe("");
    expect(a.isMultiLanguage).toBe(false);
    expect(a.suggestion).toBe("");
  });
});

describe("useLanguageAnalysis — checkTextLanguage", () => {
  it("returns early without updating state when text is empty", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("zh");
    const auto = ref(true);

    checkTextLanguage("", lang, auto);

    expect(languageAnalysis.value.totalChars).toBe(0);
    expect(languageAnalysis.value.detectedLanguage).toBe("");
  });

  it("detects pure Chinese text and sets correct counts", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("");
    const auto = ref(false);

    checkTextLanguage("你好世界", lang, auto);

    expect(languageAnalysis.value.detectedLanguage).toBe("zh");
    expect(languageAnalysis.value.chineseCount).toBe(4);
    expect(languageAnalysis.value.totalChars).toBe(4);
    expect(languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("detects pure English text correctly", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("");
    const auto = ref(false);

    checkTextLanguage("Hello", lang, auto);

    expect(languageAnalysis.value.detectedLanguage).toBe("en");
    expect(languageAnalysis.value.englishCount).toBe(5);
    expect(languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("detects pure Japanese hiragana text correctly", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("");
    const auto = ref(false);

    // "こんにちは" — five hiragana characters, no Chinese
    checkTextLanguage("こんにちは", lang, auto);

    expect(languageAnalysis.value.detectedLanguage).toBe("ja");
    expect(languageAnalysis.value.isMultiLanguage).toBe(false);
  });

  it("flags mixed Chinese + English as multi-language and picks the dominant language", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("zh");
    const auto = ref(false);

    // "Hello World": 10 en chars, "你好": 2 zh chars → en dominates
    checkTextLanguage("你好Hello World", lang, auto);

    expect(languageAnalysis.value.isMultiLanguage).toBe(true);
    expect(languageAnalysis.value.detectedLanguage).toBe("en");
  });

  it("sets suggestion text for single-language text", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("");
    const auto = ref(false);

    checkTextLanguage("你好世界", lang, auto);

    expect(languageAnalysis.value.suggestion).toContain(
      "tts.mainLanguageDetected"
    );
  });

  it("sets multi-language suggestion for mixed text", () => {
    const { languageAnalysis, checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("zh");
    const auto = ref(false);

    checkTextLanguage("你好 Hello World!", lang, auto);

    expect(languageAnalysis.value.isMultiLanguage).toBe(true);
    expect(languageAnalysis.value.suggestion).toContain(
      "tts.mixedLanguageDetected"
    );
  });

  it("auto-switches voiceLanguage when detected language differs from current", () => {
    const { checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref<string>("zh");
    const auto = ref(true);

    checkTextLanguage("Hello World", lang, auto);

    expect(lang.value).toBe("en");
    expect(mockElMessageSuccess).toHaveBeenCalled();
  });

  it("auto-sets voiceLanguage when it is empty", () => {
    const { checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref<string>("");
    const auto = ref(true);

    checkTextLanguage("Hello", lang, auto);

    expect(lang.value).toBe("en");
    expect(mockElMessageSuccess).toHaveBeenCalled();
  });

  it("shows ElMessage.warning when Chinese text exceeds 150 characters", () => {
    const { checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("zh");
    const auto = ref(false);

    const longChinese = "你".repeat(151);
    checkTextLanguage(longChinese, lang, auto);

    expect(mockElMessageWarning).toHaveBeenCalledWith(
      expect.stringContaining("tts.textLimitWarning")
    );
  });
});

describe("useLanguageAnalysis — debounced ElMessage for mixed language", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires ElMessage after 3000 ms for multi-language text longer than 10 chars", () => {
    const { checkTextLanguage } = mountUseLanguageAnalysis();
    const lang = ref("zh");
    const auto = ref(false);

    // Mixed text, length > 10
    checkTextLanguage("你好 Hello World!", lang, auto);

    expect(mockElMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(mockElMessage).toHaveBeenCalledOnce();
    const call = mockElMessage.mock.calls[0][0] as {
      type: string;
      duration: number;
    };
    expect(call.type).toBe("warning");
    expect(call.duration).toBe(5000);
  });
});
