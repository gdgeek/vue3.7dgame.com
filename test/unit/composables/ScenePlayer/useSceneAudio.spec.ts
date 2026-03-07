import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const createAudioMock = () => {
  const audio = {
    src: "https://example.com/audio.mp3",
    currentTime: 0,
    duration: 10,
    error: null,
    onended: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
  } as unknown as HTMLAudioElement;
  return audio;
};

describe("useSceneAudio", () => {
  let sources: Map<string, { type: string; data: { url: string } }>;

  beforeEach(async () => {
    vi.clearAllMocks();
    sources = new Map();
  });

  const getComposable = async () => {
    const { useSceneAudio } = await import(
      "@/components/ScenePlayer/composables/useSceneAudio"
    );
    return useSceneAudio(sources as Map<string, never>);
  };

  describe("getAudioUrl", () => {
    it("returns url for audio source", async () => {
      sources.set("abc", {
        type: "audio",
        data: { url: "https://example.com/audio.mp3" },
      });
      const { getAudioUrl } = await getComposable();
      expect(getAudioUrl("abc")).toBe("https://example.com/audio.mp3");
    });

    it("returns undefined when source not found", async () => {
      const { getAudioUrl } = await getComposable();
      const result = getAudioUrl("nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns undefined for non-audio source type", async () => {
      sources.set("video1", { type: "video", data: { url: "" } } as never);
      const { getAudioUrl } = await getComposable();
      const result = getAudioUrl("video1");
      expect(result).toBeUndefined();
    });
  });

  describe("playQueuedAudio", () => {
    it("resolves after audio ends", async () => {
      const { playQueuedAudio } = await getComposable();
      const audio = createAudioMock();

      const promise = playQueuedAudio(audio);

      // Trigger the ended event
      if (audio.onended) {
        audio.onended(new Event("ended"));
      }

      await expect(promise).resolves.toBeUndefined();
    });

    it("resolves even when audio errors", async () => {
      const { playQueuedAudio } = await getComposable();
      const audio = createAudioMock();
      audio.play = vi.fn().mockRejectedValue(new Error("autoplay blocked"));

      const promise = playQueuedAudio(audio);

      await expect(promise).resolves.toBeUndefined();
    });

    it("skipQueue plays audio directly without queueing", async () => {
      const { playQueuedAudio } = await getComposable();
      const audio1 = createAudioMock();
      const audio2 = createAudioMock();

      // Start first in queue (keeps queue busy)
      const p1 = playQueuedAudio(audio1);

      // Second with skipQueue should start immediately
      const p2 = playQueuedAudio(audio2, true);

      // Resolve audio2 (skip queue)
      if (audio2.onended) audio2.onended(new Event("ended"));
      await expect(p2).resolves.toBeUndefined();

      // Resolve audio1
      if (audio1.onended) audio1.onended(new Event("ended"));
      await expect(p1).resolves.toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("clears audio queue and stops playback", async () => {
      const { playQueuedAudio, cleanup } = await getComposable();
      const audio = createAudioMock();

      // Add to queue without resolving
      playQueuedAudio(audio);

      // Cleanup should resolve all pending items
      cleanup();

      expect(audio.pause).toHaveBeenCalled();
      expect(audio.load).toHaveBeenCalled();
    });
  });
});
