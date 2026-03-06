import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  const MockAnimationMixer = vi.fn().mockImplementation(() => ({
    stopAllAction: vi.fn(),
    clipAction: vi.fn().mockReturnValue({
      reset: vi.fn().mockReturnThis(),
      setLoop: vi.fn().mockReturnThis(),
      fadeIn: vi.fn().mockReturnThis(),
      play: vi.fn(),
    }),
  }));
  return { ...actual, AnimationMixer: MockAnimationMixer, LoopRepeat: 2201 };
});

describe("useSceneAnimation", () => {
  let sources: Map<string, { type: string; data: { mesh: { userData: { animations?: { name: string }[] } } } }>;
  let mixers: Map<string, { stopAllAction: () => void; clipAction: (clip: unknown) => { reset: () => unknown; setLoop: () => unknown; fadeIn: () => unknown; play: () => void } }>;

  beforeEach(() => {
    vi.clearAllMocks();
    sources = new Map();
    mixers = new Map();
  });

  const getComposable = async () => {
    const { useSceneAnimation } = await import(
      "@/components/ScenePlayer/composables/useSceneAnimation"
    );
    return useSceneAnimation(sources as Map<string, never>, mixers as Map<string, never>);
  };

  describe("playAnimation", () => {
    it("plays animation when all resources exist", async () => {
      const mockPlay = vi.fn();
      const mockMixer = {
        stopAllAction: vi.fn(),
        clipAction: vi.fn().mockReturnValue({
          reset: vi.fn().mockReturnThis(),
          setLoop: vi.fn().mockReturnThis(),
          fadeIn: vi.fn().mockReturnThis(),
          play: mockPlay,
        }),
      };

      const clip = { name: "Walk" };
      const mesh = { userData: { animations: [clip] } };

      sources.set("model1", { type: "model", data: { mesh } } as never);
      mixers.set("model1", mockMixer as never);

      const { playAnimation } = await getComposable();
      playAnimation("model1", "Walk");

      expect(mockMixer.stopAllAction).toHaveBeenCalled();
      expect(mockMixer.clipAction).toHaveBeenCalledWith(clip);
      expect(mockPlay).toHaveBeenCalled();
    });

    it("logs error when source not found", async () => {
      const { logger } = await import("@/utils/logger");
      const { playAnimation } = await getComposable();
      playAnimation("nonexistent", "Walk");
      expect(logger.error).toHaveBeenCalled();
    });

    it("logs error when mixer not found", async () => {
      const { logger } = await import("@/utils/logger");
      const mesh = { userData: { animations: [{ name: "Walk" }] } };
      sources.set("model1", { type: "model", data: { mesh } } as never);
      // No mixer set

      const { playAnimation } = await getComposable();
      playAnimation("model1", "Walk");
      expect(logger.error).toHaveBeenCalled();
    });

    it("logs error when animation not found by name", async () => {
      const { logger } = await import("@/utils/logger");
      const mockMixer = {
        stopAllAction: vi.fn(),
        clipAction: vi.fn(),
      };
      const mesh = { userData: { animations: [{ name: "Run" }] } };

      sources.set("model1", { type: "model", data: { mesh } } as never);
      mixers.set("model1", mockMixer as never);

      const { playAnimation } = await getComposable();
      playAnimation("model1", "Walk"); // "Walk" doesn't exist, only "Run"
      expect(logger.error).toHaveBeenCalled();
    });

    it("logs error when model has no animations", async () => {
      const { logger } = await import("@/utils/logger");
      const mockMixer = { stopAllAction: vi.fn(), clipAction: vi.fn() };
      const mesh = { userData: { animations: [] } };

      sources.set("model1", { type: "model", data: { mesh } } as never);
      mixers.set("model1", mockMixer as never);

      const { playAnimation } = await getComposable();
      playAnimation("model1", "Walk");
      expect(logger.error).toHaveBeenCalled();
    });

    it("logs error when source type is not model", async () => {
      const { logger } = await import("@/utils/logger");
      sources.set("audio1", { type: "audio", data: { url: "test.mp3" } } as never);

      const { playAnimation } = await getComposable();
      playAnimation("audio1", "Walk");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
