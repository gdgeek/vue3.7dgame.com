import { logger } from "@/utils/logger";
import type { SourceRecord, SourceAudioData } from "../types";

type AudioQueueItem = {
  audio: HTMLAudioElement;
  resolve: (value: void | PromiseLike<void>) => void;
};

export function useSceneAudio(sources: Map<string, SourceRecord>) {
  const audioPlaybackQueue: AudioQueueItem[] = [];
  let isPlaying = false;

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

    return new Promise<void>((resolve) => {
      audio.currentTime = 0;

      audio.onended = () => {
        logger.log("[ScenePlayer] Audio playback completed:", {
          src: audio.src,
          duration: audio.duration,
        });
        resolve();
      };

      audio.onerror = () => {
        logger.error("[ScenePlayer] Audio playback error:", {
          src: audio.src,
          error: audio.error,
        });
        resolve();
      };

      audio.play().catch((error) => {
        logger.error("[ScenePlayer] Failed to play audio:", {
          src: audio.src,
          error,
        });
        resolve();
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
      audioPlaybackQueue.shift();
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
    while (audioPlaybackQueue.length > 0) {
      const queueItem = audioPlaybackQueue.shift();
      if (queueItem) {
        queueItem.audio.pause();
        queueItem.audio.src = "";
        queueItem.audio.load();
        queueItem.resolve();
      }
    }
    isPlaying = false;
  };

  return { getAudioUrl, playQueuedAudio, cleanup };
}
