/**
 * 脚本运行时 API 构建器，供 meta/script.vue 和 verse/script.vue 共用。
 * 封装 tween / task / animation / sound / helper / text / point / transform / argument
 * 等执行引擎 API 对象，这些对象在两个文件中 ~350 行代码几乎完全相同。
 */
import * as THREE from "three";
import { logger } from "@/utils/logger";

// ---------- 共享类型 ----------

export type MeshWrapper = {
  mesh: THREE.Object3D;
  playAnimation?: (animationName: string) => void;
  setText?: (text: string) => void;
  setVisibility?: (visible: boolean) => void;
};

export type TaskObject = {
  type?: string;
  execute?: () => Promise<void> | void;
  data?: unknown;
};

/** ScenePlayer 中 sources Map 的值类型 */
export type SceneSource = {
  type: string;
  data: {
    mesh?: THREE.Object3D;
    setText?: (text: string) => void;
    setVisibility?: (visible: boolean) => void;
    url?: string;
  };
};

/** ScenePlayer 暴露的最小接口 */
export type ScenePlayerLike = {
  sources: Map<string, SceneSource | { type: string; data: unknown }>;
  playAnimation: (uuid: string, animationName: string) => void;
  getAudioUrl: (uuid: string) => string | undefined;
  playQueuedAudio: (
    audio: HTMLAudioElement,
    skipQueue?: boolean
  ) => Promise<void> | void;
};

// ---------- 工具类型守卫 ----------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * 构建脚本运行时所需的全部 API 对象。
 * @param scenePlayerRef - Vue ref，持有 ScenePlayer 实例
 * @param extraEvent - 额外的 event API 方法（verse 额外需要 signal）
 */
export function buildScriptRuntime(
  scenePlayerRef: { value: ScenePlayerLike | null | undefined },
  extraEvent?: Record<string, (...args: unknown[]) => void>
) {
  const Vector3 = THREE.Vector3;

  // ---- handleText / handleEntity（访问 SceneSource.data）----
  const handleText = (uuid: string) => {
    const source = scenePlayerRef.value?.sources.get(uuid);
    if (!source) {
      logger.error(`找不到UUID为 ${uuid} 的文本实体`);
      return null;
    }
    return source.data;
  };

  const handleEntity = (uuid: string) => {
    const source = scenePlayerRef.value?.sources.get(uuid);
    if (!source) {
      logger.error(`找不到UUID为 ${uuid} 的实体`);
      return null;
    }
    return source.data;
  };

  // ---- handleSound ----
  const handleSound = (uuid: string): HTMLAudioElement | undefined => {
    const audioUrl = scenePlayerRef.value?.getAudioUrl(uuid);
    if (!audioUrl) {
      logger.error(`找不到UUID为 ${uuid} 的音频资源`);
      return undefined;
    }
    return new Audio(audioUrl);
  };

  // ---- polygen API ----
  const polygen = {
    playAnimation: (
      polygenInstance: MeshWrapper | null,
      animationName: string
    ) => {
      if (!polygenInstance) {
        logger.error("polygen实例为空");
        return;
      }
      if (typeof polygenInstance.playAnimation !== "function") {
        logger.error("polygen实例缺少playAnimation方法");
        return;
      }
      polygenInstance.playAnimation(animationName);
    },
  };

  // ---- sound API ----
  const sound = {
    play: async (
      audio: HTMLAudioElement | undefined,
      skipQueue: boolean = false
    ) => {
      if (!audio) {
        logger.error("音频资源无效");
        return;
      }
      await scenePlayerRef.value?.playQueuedAudio(audio, skipQueue);
    },

    createTask: (audio: HTMLAudioElement | undefined): TaskObject | null => {
      if (!audio) {
        logger.error("音频资源无效");
        return null;
      }
      return {
        type: "audio",
        execute: async () => {
          await scenePlayerRef.value?.playQueuedAudio(audio);
        },
        data: audio,
      };
    },

    playTask: (audio: HTMLAudioElement | undefined): TaskObject | null => {
      const taskObj = sound.createTask(audio);
      if (!taskObj) return null;
      taskObj.execute?.();
      return taskObj;
    },
  };

  // ---- helper API ----
  const helper = {
    handler: (index: string, uuid: string) => {
      const source = scenePlayerRef.value?.sources.get(uuid);
      logger.error("当前的source", source);
      if (!source) {
        logger.error(`找不到UUID为 ${uuid} 的实体`);
        return null;
      }
      return source.data;
    },
  };

  // ---- tween API（补间动画）----
  const tween = {
    to_object: (
      fromObj: MeshWrapper,
      toObj: MeshWrapper,
      duration: number,
      easing: string
    ) => {
      if (!fromObj || !toObj) {
        logger.error("补间动画对象无效");
        return null;
      }
      const startPos = fromObj.mesh.position.clone();
      const endPos = toObj.mesh.position.clone();
      return { type: "object", fromObj, startPos, endPos, duration, easing };
    },

    to_data: (
      obj: MeshWrapper,
      transformData: {
        position: THREE.Vector3;
        rotation: THREE.Vector3;
        scale: THREE.Vector3;
      },
      duration: number,
      easing: string
    ) => {
      if (!obj) {
        logger.error("目标对象无效");
        return null;
      }
      const startPos = obj.mesh.position.clone();
      const endPos = transformData.position;
      const endRotationRadians = new THREE.Vector3(
        THREE.MathUtils.degToRad(transformData.rotation.x),
        THREE.MathUtils.degToRad(transformData.rotation.y),
        THREE.MathUtils.degToRad(transformData.rotation.z)
      );
      return {
        type: "data",
        obj,
        startPos,
        endPos,
        startRotation: obj.mesh.rotation.clone(),
        endRotation: endRotationRadians,
        startScale: obj.mesh.scale.clone(),
        endScale: transformData.scale,
        duration,
        easing,
      };
    },
  };

  // ---- task API ----
  type EasingFunction = (t: number) => number;
  type EasingType =
    | "LINEAR"
    | "EASE_IN"
    | "EASE_OUT"
    | "EASE_IN_OUT"
    | "BOUNCE_IN"
    | "BOUNCE_OUT"
    | "BOUNCE_IN_OUT";

  const easingFunctions: Record<EasingType, EasingFunction> = {
    LINEAR: (t) => t,
    EASE_IN: (t) => t * t,
    EASE_OUT: (t) => 1 - Math.pow(1 - t, 2),
    EASE_IN_OUT: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    BOUNCE_IN: (t) => 1 - easingFunctions.BOUNCE_OUT(1 - t),
    BOUNCE_OUT: (t) => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    BOUNCE_IN_OUT: (t) =>
      t < 0.5
        ? (1 - easingFunctions.BOUNCE_OUT(1 - 2 * t)) / 2
        : (1 + easingFunctions.BOUNCE_OUT(2 * t - 1)) / 2,
  };

  const task = {
    circle: async (count: number, taskToRepeat: unknown) => {
      logger.log("Executing circle task:", { count, taskToRepeat });
      if (typeof count !== "number" || count < 0) {
        logger.warn("循环次数必须是正数:", count);
        return;
      }
      let resolvedTask: unknown = taskToRepeat;
      if (taskToRepeat instanceof Promise) {
        resolvedTask = await taskToRepeat;
      }
      for (let i = 0; i < count; i++) {
        logger.log(`执行第 ${i + 1}/${count} 次任务`);
        try {
          if (resolvedTask) {
            if (typeof resolvedTask === "function") {
              await resolvedTask();
            } else if (
              isRecord(resolvedTask) &&
              typeof resolvedTask.execute === "function"
            ) {
              await resolvedTask.execute();
            } else if (
              isRecord(resolvedTask) &&
              resolvedTask.type === "audio"
            ) {
              await sound.play(
                resolvedTask.data as HTMLAudioElement | undefined
              );
            } else if (
              isRecord(resolvedTask) &&
              resolvedTask.type === "animation"
            ) {
              await (resolvedTask.execute as () => Promise<void>)?.();
            } else {
              logger.warn(`无法执行的任务类型:`, resolvedTask);
              return;
            }
          }
          if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          logger.error(`第 ${i + 1} 次任务执行失败:`, error);
        }
      }
    },

    array: (type: string, items: unknown[]) => {
      logger.log("Creating array:", { type, items });
      const processArrayItems = (items: unknown[]): unknown[] =>
        items.map((item) => {
          if (Array.isArray(item)) return processArrayItems(item);
          if (isRecord(item) && "type" in item) return item;
          if (isRecord(item) && "url" in item) return "audio";
          if (item instanceof Promise) return item;
          return item;
        });
      let result: unknown[];
      if (type === "LIST") {
        result = processArrayItems(items);
      } else if (type === "SET") {
        result = Array.from(new Set(processArrayItems(items)));
      } else {
        logger.warn(`未知的数组类型: ${type}，默认使用 LIST 类型`);
        result = processArrayItems(items);
      }
      logger.log("Processed array result:", result);
      return result;
    },

    execute: async (tweenData: unknown) => {
      if (!tweenData) return;
      if (typeof tweenData === "function") {
        await tweenData();
        return;
      }
      if (tweenData instanceof Promise) return await tweenData;
      if (!isRecord(tweenData)) return;

      return new Promise<void>((resolve) => {
        const startTime = Date.now();
        const animate = () => {
          const elapsed = (Date.now() - startTime) / 1000;
          const progress = Math.min(elapsed / Number(tweenData.duration), 1);
          const easing = String(
            tweenData.easing || "LINEAR"
          ).toUpperCase() as EasingType;
          const easingFunction =
            easingFunctions[easing] || easingFunctions.LINEAR;
          const easeProgress = easingFunction(progress);

          if (tweenData.type === "object") {
            const newPos = (tweenData.startPos as THREE.Vector3)
              .clone()
              .lerp(tweenData.endPos as THREE.Vector3, easeProgress);
            (tweenData.fromObj as MeshWrapper).mesh.position.copy(newPos);
          } else if (tweenData.type === "data") {
            const newPos = (tweenData.startPos as THREE.Vector3)
              .clone()
              .lerp(tweenData.endPos as THREE.Vector3, easeProgress);
            (tweenData.obj as MeshWrapper).mesh.position.copy(newPos);
            (tweenData.obj as MeshWrapper).mesh.rotation.set(
              THREE.MathUtils.lerp(
                (tweenData.startRotation as THREE.Euler).x,
                (tweenData.endRotation as THREE.Vector3).x,
                easeProgress
              ),
              THREE.MathUtils.lerp(
                (tweenData.startRotation as THREE.Euler).y,
                (tweenData.endRotation as THREE.Vector3).y,
                easeProgress
              ),
              THREE.MathUtils.lerp(
                (tweenData.startRotation as THREE.Euler).z,
                (tweenData.endRotation as THREE.Vector3).z,
                easeProgress
              )
            );
            const newScale = (tweenData.startScale as THREE.Vector3)
              .clone()
              .lerp(tweenData.endScale as THREE.Vector3, easeProgress);
            (tweenData.obj as MeshWrapper).mesh.scale.copy(newScale);
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };
        animate();
      });
    },

    sleep: (seconds: number) => () =>
      new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000)),
  };

  // ---- animation API ----
  const animation = {
    createTask: (
      polygenInstance: MeshWrapper,
      animationName: string
    ): TaskObject | null => {
      if (!polygenInstance) {
        logger.error("polygen实例为空");
        return null;
      }
      if (typeof polygenInstance.playAnimation !== "function") {
        logger.error("polygen实例缺少playAnimation方法");
        return null;
      }
      return {
        type: "animation",
        execute: async () => {
          polygenInstance.playAnimation(animationName);
        },
        data: { instance: polygenInstance, animationName },
      };
    },

    playTask: (
      polygenInstance: MeshWrapper,
      animationName: string
    ): TaskObject | null => {
      const taskObj = animation.createTask(polygenInstance, animationName);
      if (!taskObj) return null;
      taskObj.execute?.();
      return taskObj;
    },
  };

  // ---- event API（trigger 为基础，可通过 extraEvent 扩展 signal 等）----
  const event = {
    trigger: (index: unknown, eventId: string) => {
      logger.log("触发事件:", index, eventId);
    },
    ...extraEvent,
  };

  // ---- text API ----
  const text = {
    setText: (object: unknown, setText: string) => {
      if (isRecord(object) && typeof object.setText === "function") {
        (object as { setText: (val: string) => void }).setText(setText);
      } else {
        logger.warn("object.setText is not a function");
      }
    },
  };

  // ---- point API ----
  const point = {
    setVisual: (object: unknown, setVisual: boolean) => {
      logger.error("setVisual", object, setVisual);
      if (isRecord(object) && typeof object.setVisibility === "function") {
        (object as { setVisibility: (val: boolean) => void }).setVisibility(
          setVisual
        );
      } else {
        logger.error("object.setVisibility is not a function");
      }
    },
  };

  // ---- transform ----
  const transform = (position: unknown, rotation: unknown, scale: unknown) => ({
    position: position instanceof Vector3 ? position : new Vector3(),
    rotation: rotation instanceof Vector3 ? rotation : new Vector3(),
    scale: scale instanceof Vector3 ? scale : new Vector3(1, 1, 1),
  });

  // ---- argument API ----
  const argument = {
    boolean: (value: boolean) => value,
    number: (value: number) => value,
    string: (value: string) => value,
    idPlayer: (value: number) => value,
    point: (position: unknown) =>
      position instanceof Vector3 ? position : new Vector3(),
    range: (centerPoint: THREE.Vector3, radius: number) => {
      const center =
        centerPoint instanceof Vector3 ? centerPoint : new Vector3();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());
      return new Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
      );
    },
  };

  return {
    Vector3,
    polygen,
    sound,
    helper,
    handleText,
    handleEntity,
    handleSound,
    tween,
    task,
    animation,
    event,
    text,
    point,
    transform,
    argument,
  };
}
