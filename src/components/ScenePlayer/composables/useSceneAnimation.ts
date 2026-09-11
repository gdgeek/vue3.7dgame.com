import * as THREE from "three";
import { getCurrentScope, onScopeDispose } from "vue";
import { logger } from "@/utils/logger";
import type { SourceRecord, SourceModelData } from "../types";

export function useSceneAnimation(
  sources: Map<string, SourceRecord>,
  mixers: Map<string, THREE.AnimationMixer>
) {
  const pending = new Map<string, () => void>();
  if (getCurrentScope())
    onScopeDispose(() => {
      for (const finish of pending.values()) finish();
    });
  const playAnimation = (
    uuid: string,
    animationName: string,
    options?: { loop?: boolean }
  ) => {
    const source = sources.get(uuid.toString());
    if (!source || source.type !== "model") {
      logger.error(`[ScenePlayer] Model resource not found for UUID: ${uuid}`);
      return;
    }

    const model = (source.data as SourceModelData).mesh;
    const mixer = mixers.get(uuid);

    if (!model) {
      logger.error(
        `[ScenePlayer] Model not found for UUID: ${uuid}, available models:`,
        Array.from(sources.keys())
      );
      return;
    }

    if (!mixer) {
      logger.error(`[ScenePlayer] Animation mixer not found for UUID: ${uuid}`);
      return;
    }

    const animations = model.userData?.animations;
    if (!animations || animations.length === 0) {
      logger.error(`[ScenePlayer] Model ${uuid} has no animation data`);
      return;
    }

    const clip = animations.find(
      (anim: THREE.AnimationClip) => anim.name === animationName
    );
    if (!clip) {
      logger.error(
        `[ScenePlayer] Animation "${animationName}" not found, available animations:`,
        animations.map((a: THREE.AnimationClip) => a.name)
      );
      return;
    }

    pending.get(uuid)?.();
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    const once = options?.loop === false;
    action.setLoop(
      once ? THREE.LoopOnce : THREE.LoopRepeat,
      once ? 1 : Infinity
    );
    action.clampWhenFinished = once;
    action.play();
    if (once)
      return new Promise<void>((resolve) => {
        const finish = () => {
          mixer.removeEventListener("finished", onFinished);
          pending.delete(uuid);
          resolve();
        };
        const onFinished = (event: { action: THREE.AnimationAction }) => {
          if (event.action === action) finish();
        };
        pending.set(uuid, finish);
        mixer.addEventListener("finished", onFinished);
      });
  };

  return { playAnimation };
}
