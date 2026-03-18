/**
 * Unit tests for src/views/audio/composables/useTTS.ts
 *
 * Covers: initial state, synthesizeSpeech (success / error / empty text /
 * safeAtob failure), uploadAudio (no blob / cancel / success), and
 * audio-player event handlers (onTextInput, onAudioPlayerPlay, onAudioPlayerEnded).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// ── Hoisted mock stubs ─────────────────────────────────────────────────────────
// vi.hoisted() runs before any vi.mock() factory, guaranteeing these values
// are defined when the factories reference them.

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn().mockResolvedValue(undefined),
  axiosPost: vi.fn(),
  safeAtob: vi.fn(),
  postFile: vi.fn(),
  postAudio: vi.fn(),
  fileStorePublicHandler: vi.fn().mockResolvedValue("mock-handler"),
  fileStoreMd5: vi.fn().mockResolvedValue("deadbeef"),
  fileStoreHas: vi.fn().mockResolvedValue(false),
  fileStoreUpload: vi.fn().mockResolvedValue(undefined),
  fileStoreUrl: vi.fn().mockReturnValue("https://cdn.example.com/deadbeef.mp3"),
  elMessageSuccess: vi.fn(),
  elMessageWarning: vi.fn(),
  elMessageError: vi.fn(),
  elMessageInfo: vi.fn(),
  elMessageBoxPrompt: vi.fn(),
}));

// ── vi.mock declarations ────────────────────────────────────────────────────────

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("element-plus", () => ({
  ElMessage: Object.assign(vi.fn(), {
    success: mocks.elMessageSuccess,
    warning: mocks.elMessageWarning,
    error: mocks.elMessageError,
    info: mocks.elMessageInfo,
  }),
  ElMessageBox: { prompt: mocks.elMessageBoxPrompt },
}));

vi.mock("axios", () => ({ default: { post: mocks.axiosPost } }));

vi.mock("@/api/v1/files", () => ({ postFile: mocks.postFile }));

vi.mock("@/api/v1/resources/index", () => ({ postAudio: mocks.postAudio }));

vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      publicHandler: mocks.fileStorePublicHandler,
      fileMD5: mocks.fileStoreMd5,
      fileHas: mocks.fileStoreHas,
      fileUpload: mocks.fileStoreUpload,
      fileUrl: mocks.fileStoreUrl,
    },
  }),
}));

vi.mock("@/environment", () => ({
  default: { tts_api: "https://tts.test/api" },
}));

vi.mock("@/utils/base64", () => ({ safeAtob: mocks.safeAtob }));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { useTTS } from "@/views/audio/composables/useTTS";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    text: ref("Hello world"),
    volume: ref(0),
    speed: ref(0),
    selectedVoiceType: ref(101002),
    codec: ref("mp3"),
    sampleRate: ref(16000),
    voiceLanguage: ref("en"),
    voiceType: ref("精品音色"),
    emotionCategory: ref(""),
    emotionIntensity: ref(100),
    checkTextLanguage: vi.fn(),
    ...overrides,
  };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Stub URL methods required by synthesizeSpeech
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn().mockReturnValue("blob:mock-url"),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useTTS — initial state", () => {
  it("initialises loading/playing/upload flags and audioUrl to falsy defaults", () => {
    const { isLoading, isUploading, isPlaying, audioUrl, currentAudioBlob } =
      useTTS(makeProps());

    expect(isLoading.value).toBe(false);
    expect(isUploading.value).toBe(false);
    expect(isPlaying.value).toBe(false);
    expect(audioUrl.value).toBe("");
    expect(currentAudioBlob.value).toBeNull();
  });
});

describe("useTTS — synthesizeSpeech", () => {
  it("shows warning and returns early when text is empty", async () => {
    const props = makeProps({ text: ref("") });
    const { synthesizeSpeech } = useTTS(props);

    await synthesizeSpeech();

    expect(mocks.elMessageWarning).toHaveBeenCalledWith("tts.noText");
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });

  it("calls axios.post with the correct parameters", async () => {
    mocks.axiosPost.mockResolvedValue({ data: { Audio: "base64audio" } });
    mocks.safeAtob.mockReturnValue("A"); // minimal decoded audio

    const props = makeProps();
    const { synthesizeSpeech } = useTTS(props);

    await synthesizeSpeech();

    expect(mocks.axiosPost).toHaveBeenCalledWith(
      "https://tts.test/api",
      expect.objectContaining({
        Text: "Hello world",
        VoiceType: 101002,
        Codec: "mp3",
        SampleRate: 16000,
      }),
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("sets audioUrl, isPlaying and calls ElMessage.success on successful synthesis", async () => {
    mocks.axiosPost.mockResolvedValue({ data: { Audio: "base64audio" } });
    mocks.safeAtob.mockReturnValue("A");

    const props = makeProps();
    const { synthesizeSpeech, audioUrl, isPlaying, isLoading } = useTTS(props);

    await synthesizeSpeech();

    expect(audioUrl.value).toBe("blob:mock-url");
    expect(isPlaying.value).toBe(true);
    expect(mocks.elMessageSuccess).toHaveBeenCalledWith("tts.synthesisSuccess");
    expect(isLoading.value).toBe(false); // reset in finally
  });

  it("shows ElMessage.error and resets isLoading when axios throws", async () => {
    mocks.axiosPost.mockRejectedValue(new Error("Network error"));

    const props = makeProps();
    const { synthesizeSpeech, isLoading } = useTTS(props);

    await synthesizeSpeech();

    expect(mocks.elMessageError).toHaveBeenCalledWith("tts.synthesisError");
    expect(isLoading.value).toBe(false);
  });

  it("shows ElMessage.error and leaves audioUrl empty when safeAtob returns null", async () => {
    mocks.axiosPost.mockResolvedValue({ data: { Audio: "badinput" } });
    mocks.safeAtob.mockReturnValue(null);

    const props = makeProps();
    const { synthesizeSpeech, audioUrl } = useTTS(props);

    await synthesizeSpeech();

    expect(mocks.elMessageError).toHaveBeenCalledWith("tts.synthesisError");
    expect(audioUrl.value).toBe("");
  });
});

describe("useTTS — uploadAudio", () => {
  it("shows warning and returns early when no audio blob exists", async () => {
    const props = makeProps();
    const { uploadAudio } = useTTS(props);

    await uploadAudio();

    expect(mocks.elMessageWarning).toHaveBeenCalledWith("tts.noAudio");
    expect(mocks.elMessageBoxPrompt).not.toHaveBeenCalled();
  });

  it("shows ElMessage.info when the user cancels the prompt", async () => {
    mocks.elMessageBoxPrompt.mockRejectedValue("cancel");

    const props = makeProps();
    const { currentAudioBlob, uploadAudio } = useTTS(props);
    currentAudioBlob.value = new Blob(["audio"], { type: "audio/mp3" });

    await uploadAudio();

    expect(mocks.elMessageInfo).toHaveBeenCalledWith("tts.uploadCanceled");
  });

  it("calls postFile + postAudio, navigates and shows success on happy path", async () => {
    mocks.elMessageBoxPrompt.mockResolvedValue({ value: "My TTS Audio" });
    mocks.postFile.mockResolvedValue({ data: { id: 42 } });
    mocks.postAudio.mockResolvedValue({ data: { id: 99 } });

    const props = makeProps();
    const { currentAudioBlob, uploadAudio } = useTTS(props);
    currentAudioBlob.value = new Blob(["audio"], { type: "audio/mp3" });

    await uploadAudio();

    expect(mocks.postFile).toHaveBeenCalled();
    expect(mocks.postAudio).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My TTS Audio", file_id: 42 })
    );
    expect(mocks.routerPush).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/resource/audio/view",
        query: { id: 99 },
      })
    );
    expect(mocks.elMessageSuccess).toHaveBeenCalledWith("tts.uploadSuccess");
  });
});

describe("useTTS — uploadAudio error paths", () => {
  it("shows error when postFile returns no id (lines 254-255, 261-262)", async () => {
    const { logger } = await import("@/utils/logger");
    mocks.elMessageBoxPrompt.mockResolvedValue({ value: "My Audio" });
    // postFile returns data without id → triggers else branch at line 254
    mocks.postFile.mockResolvedValue({ data: {} });

    const props = makeProps();
    const { currentAudioBlob, uploadAudio } = useTTS(props);
    currentAudioBlob.value = new Blob(["audio"], { type: "audio/mp3" });

    await uploadAudio();

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("Upload error"),
      expect.any(Error)
    );
    expect(mocks.elMessageError).toHaveBeenCalledWith("tts.uploadError");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("shows error when postAudio returns no id (line 251, then 261-262)", async () => {
    const { logger } = await import("@/utils/logger");
    mocks.elMessageBoxPrompt.mockResolvedValue({ value: "My Audio" });
    mocks.postFile.mockResolvedValue({ data: { id: 10 } });
    // postAudio returns data without id → triggers throw at line 251
    mocks.postAudio.mockResolvedValue({ data: {} });

    const props = makeProps();
    const { currentAudioBlob, uploadAudio } = useTTS(props);
    currentAudioBlob.value = new Blob(["audio"], { type: "audio/mp3" });

    await uploadAudio();

    expect(vi.mocked(logger.error)).toHaveBeenCalled();
    expect(mocks.elMessageError).toHaveBeenCalledWith("tts.uploadError");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });
});

describe("useTTS — audio player event handlers", () => {
  it("onTextInput resets highlights, pauses the player and calls checkTextLanguage", () => {
    const checkTextLanguage = vi.fn();
    const props = makeProps({ checkTextLanguage });
    const {
      onTextInput,
      highlightedText,
      normalText,
      isPlaying,
      audioPlayerRef,
    } = useTTS(props);

    const mockAudio = { pause: vi.fn() } as unknown as HTMLAudioElement;
    audioPlayerRef.value = mockAudio;
    highlightedText.value = "partial highlighted text";
    isPlaying.value = true;

    onTextInput();

    expect(highlightedText.value).toBe("");
    expect(normalText.value).toBe("Hello world");
    expect(isPlaying.value).toBe(false);
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(checkTextLanguage).toHaveBeenCalled();
  });

  it("onAudioPlayerPlay sets isPlaying to true", () => {
    const { onAudioPlayerPlay, isPlaying } = useTTS(makeProps());

    onAudioPlayerPlay();

    expect(isPlaying.value).toBe(true);
  });

  it("onAudioPlayerEnded sets isPlaying to false and moves text to highlightedText", () => {
    const { onAudioPlayerEnded, isPlaying, highlightedText, normalText } =
      useTTS(makeProps());

    isPlaying.value = true;
    normalText.value = "some normal text";

    onAudioPlayerEnded();

    expect(isPlaying.value).toBe(false);
    expect(highlightedText.value).toBe("Hello world");
    expect(normalText.value).toBe("");
  });
});
