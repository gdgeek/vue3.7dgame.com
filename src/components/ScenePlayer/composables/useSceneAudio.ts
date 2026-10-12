import { logger } from "@/utils/logger";
import type { SourceRecord, SourceAudioData } from "../types";

type AudioQueueItem = {
  audio: HTMLAudioElement;
  resolve: (value: void | PromiseLike<void>) => void;
};

export function useSceneAudio(sources: Map<string, SourceRecord>) {
  const audioPlaybackQueue: AudioQueueItem[] = [];
  let isPlaying = false;
  const activePlayback = new Map<HTMLAudioElement, () => void>();

  const getAudioUrl = (uuid: string): string | undefined => {
    const source = sources.get(uuid.toString());
    if (!source || source.type !== "audio") {
      logger.error(`[ScenePlayer] Audio resource not found for UUID: ${uuid}`);
      return undefined;
    }
    return (source.data as SourceAudioData).url;
  };

  const handleAudioPlay = (audio: HTMLAudioElement): Promise<void> => {
    logger.log("[ScenePlayer] Processing audio playback:", {
      src: audio.src,
      duration: audio.duration,
      currentTime: audio.currentTime,
    });

    activePlayback.get(audio)?.();
    return new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener("xrugc-audio-stop", finish);
        audio.onended = null;
        audio.onerror = null;
        if (activePlayback.get(audio) === finish) activePlayback.delete(audio);
        resolve();
      };
      activePlayback.set(audio, finish);
      audio.addEventListener("xrugc-audio-stop", finish, { once: true });
      audio.currentTime = 0;

      audio.onended = () => {
        logger.log("[ScenePlayer] Audio playback completed:", {
          src: audio.src,
          duration: audio.duration,
        });
        finish();
      };

      audio.onerror = () => {
        logger.error("[ScenePlayer] Audio playback error:", {
          src: audio.src,
          error: audio.error,
        });
        finish();
      };

      audio.play().catch((error) => {
        logger.error("[ScenePlayer] Failed to play audio:", {
          src: audio.src,
          error,
        });
        finish();
      });
    });
  };

  const processAudioQueue = async () => {
    logger.log("[ScenePlayer] Processing audio queue:", {
      isPlaying,
      queueLength: audioPlaybackQueue.length,
    });

    if (isPlaying || audioPlaybackQueue.length === 0) return;

    isPlaying = true;

    while (audioPlaybackQueue.length > 0) {
      const current = audioPlaybackQueue[0];
      logger.log("[ScenePlayer] Playing audio in queue:", {
        src: current.audio.src,
        queueLength: audioPlaybackQueue.length,
      });
      await handleAudioPlay(current.audio);
      current.resolve();
      if (audioPlaybackQueue[0] === current) audioPlaybackQueue.shift();
    }

    isPlaying = false;
    logger.log("[ScenePlayer] Audio queue processing complete");
  };

  const playQueuedAudio = async (
    audio: HTMLAudioElement,
    skipQueue: boolean = false
  ): Promise<void> => {
    logger.log("[ScenePlayer] Adding audio to queue:", {
      src: audio.src,
      skipQueue,
      currentQueueLength: audioPlaybackQueue.length,
    });

    if (skipQueue) {
      return handleAudioPlay(audio);
    }

    return new Promise<void>((resolve) => {
      audioPlaybackQueue.push({ audio, resolve });
      processAudioQueue();
    });
  };

  const cleanup = () => {
    for (const [audio, finish] of activePlayback) {
      audio.pause();
      audio.currentTime = 0;
      finish();
    }
    while (audioPlaybackQueue.length > 0) {
      const queueItem = audioPlaybackQueue.shift();
      if (queueItem) {
        queueItem.audio.pause();
        queueItem.audio.src = "";
        queueItem.audio.load();
        queueItem.resolve();
      }
    }
    // The queue processor releases its lock after its current await resumes.
  };

  return { getAudioUrl, playQueuedAudio, cleanup };
}
