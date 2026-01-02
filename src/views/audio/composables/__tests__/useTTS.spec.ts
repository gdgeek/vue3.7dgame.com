import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTTS } from "../useTTS";
import { ref, nextTick } from "vue";
import axios from "axios";

// Mock dependencies
vi.mock("axios");
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("element-plus", () => ({
  ElMessage: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  ElMessageBox: {
    prompt: vi.fn(),
  },
}));
vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      publicHandler: vi.fn().mockResolvedValue("handler"),
      fileMD5: vi.fn().mockResolvedValue("hash"),
      fileHas: vi.fn().mockResolvedValue(false),
      fileUpload: vi.fn().mockResolvedValue(true),
      fileUrl: vi.fn().mockReturnValue("http://mock-url"),
    },
  }),
}));
vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn().mockResolvedValue({ data: { id: 1 } }),
}));
vi.mock("@/api/v1/resources/index", () => ({
  postAudio: vi.fn().mockResolvedValue({ data: { id: 1 } }),
}));

describe("useTTS", () => {
  // Setup URL mocks
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  const createProps = () => ({
    text: ref("Hello World"),
    volume: ref(50),
    speed: ref(1.0),
    selectedVoiceType: ref(101002),
    codec: ref("mp3"),
    sampleRate: ref(16000),
    voiceLanguage: ref("中文"),
    voiceType: ref("精品音色"),
    emotionCategory: ref("neutral"),
    emotionIntensity: ref(100),
    checkTextLanguage: vi.fn(),
  });

  it("should warn if text is empty on synthesis", async () => {
    const props = createProps();
    props.text.value = "";
    const tts = useTTS(props);

    await tts.synthesizeSpeech();
  });

  it("should call API and play audio on successful synthesis", async () => {
    const props = createProps();
    const tts = useTTS(props);

    // Mock Audio Element
    const mockAudio = {
      play: vi.fn(),
      addEventListener: vi.fn(),
      pause: vi.fn(),
      currentTime: 0,
      duration: 10,
    } as unknown as HTMLAudioElement;
    tts.audioPlayerRef.value = mockAudio;

    // Mock Axios response
    (axios.post as any).mockResolvedValueOnce({
      data: {
        Audio: "base64audiocontent", // "audio" in base64
        SessionId: "123",
      },
    });

    await tts.synthesizeSpeech();

    expect(axios.post).toHaveBeenCalledWith(
      "https://sound.bujiaban.com/tencentTTS",
      expect.objectContaining({
        Text: "Hello World",
        VoiceType: 101002,
      }),
      expect.any(Object)
    );

    expect(URL.createObjectURL).toHaveBeenCalled();
    // Wait for internal promises and assignments
    await new Promise((r) => setTimeout(r, 0));

    expect(tts.isPlaying.value).toBe(true);
    expect(mockAudio.play).toHaveBeenCalled();
  });
});
