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

type AudioRuntimeInput =
  | HTMLAudioElement
  | {
      url?: string;
      src?: string;
    }
  | undefined
  | null;

type VideoRuntimeInput =
  | HTMLVideoElement
  | string
  | {
      video?: HTMLVideoElement;
      url?: string;
      src?: string;
      data?: unknown;
    }
  | undefined
  | null;

type VideoCallback = () => Promise<void> | void;

type RuntimeTransform = {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  scale: THREE.Vector3;
};

/** ScenePlayer 中 sources Map 的值类型 */
export type SceneSource = {
  type: string;
  data: {
    mesh?: THREE.Object3D;
    setText?: (text: string) => void;
    setVisibility?: (visible: boolean) => void;
    url?: string;
    src?: string;
    video?: HTMLVideoElement;
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
 * 同步返回首次查找结果；首次未命中时按间隔重试，并通过回调交付稍后命中的值。
 * 适用于必须保持同步返回形态、但资源可能稍晚注册到 ScenePlayer 的句柄。
 */
export const resolveWithRetry = <T>(
  lookup: () => T | null,
  onResolved: (value: T) => void,
  retries: number = 3,
  delayMs: number = 100
): T | null => {
  const value = lookup();
  if (value !== null) return value;
  if (retries <= 0) return null;

  setTimeout(() => {
    const retriedValue = resolveWithRetry(
      lookup,
      onResolved,
      retries - 1,
      delayMs
    );
    if (retriedValue !== null) onResolved(retriedValue);
  }, delayMs);
  return null;
};

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

  // ---- handleText / handleEntity / handleVoxel（访问 SceneSource.data）----
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

  const handleVoxel = (uuid: string) => {
    const source = scenePlayerRef.value?.sources.get(uuid);
    if (!source) {
      logger.error(`找不到UUID为 ${uuid} 的体素实体`);
      return null;
    }
    // ScenePlayer 当前将 VOX 与普通模型统一登记为 model source。
    return source.data;
  };

  const handlePicture = (uuid: string) => {
    const source = scenePlayerRef.value?.sources.get(uuid);
    if (!source || source.type !== "picture") {
      logger.error(`找不到UUID为 ${uuid} 的图片资源`);
      return null;
    }
    return source.data;
  };

  // ---- handleVideo / video ----
  // 旧版 Blockly 曾生成：
  // handleVideo('handleVideo("uuid"), true', callback)
  // 这里继续识别该格式，避免历史脚本必须重新保存后才能预览。
  const videoUrlCache = new Map<string, HTMLVideoElement>();
  const videoSourceCache = new WeakMap<object, HTMLVideoElement>();

  const parseLegacyVideoRequest = (value: string) => {
    const match = value.match(/^\s*handleVideo\((.+)\)\s*,\s*(true|false)\s*$/);
    if (!match) return null;

    let uuid = match[1].trim();
    try {
      const parsed = JSON.parse(uuid) as unknown;
      if (typeof parsed === "string") uuid = parsed;
    } catch {
      if (
        (uuid.startsWith("'") && uuid.endsWith("'")) ||
        (uuid.startsWith('"') && uuid.endsWith('"'))
      ) {
        uuid = uuid.slice(1, -1);
      }
    }

    return { uuid, occupy: match[2] === "true" };
  };

  const resolveVideoElement = (
    videoInput: VideoRuntimeInput
  ): HTMLVideoElement | undefined => {
    if (!videoInput) return undefined;
    if (videoInput instanceof HTMLVideoElement) return videoInput;
    if (typeof videoInput === "string") {
      const legacyRequest = parseLegacyVideoRequest(videoInput);
      const uuid = legacyRequest?.uuid ?? videoInput;
      const source = scenePlayerRef.value?.sources.get(uuid);
      if (source) {
        return resolveVideoElement(source.data as VideoRuntimeInput);
      }
      return videoUrlCache.get(uuid);
    }
    if (isRecord(videoInput)) {
      if (videoInput.video instanceof HTMLVideoElement) {
        return videoInput.video;
      }
      const cached = videoSourceCache.get(videoInput);
      if (cached) return cached;
      if (videoInput.data) {
        const nestedVideo = resolveVideoElement(
          videoInput.data as VideoRuntimeInput
        );
        if (nestedVideo) {
          videoSourceCache.set(videoInput, nestedVideo);
          return nestedVideo;
        }
      }
      const url = videoInput.url ?? videoInput.src;
      if (typeof url === "string" && url.trim()) {
        const element =
          videoUrlCache.get(url) ?? document.createElement("video");
        if (!element.src) element.src = url;
        videoUrlCache.set(url, element);
        videoSourceCache.set(videoInput, element);
        return element;
      }
    }
    return undefined;
  };

  const videoPlaybackSettlers = new WeakMap<
    HTMLVideoElement,
    Set<() => void>
  >();

  const settleVideoPlayback = (videoElement: HTMLVideoElement) => {
    const settlers = videoPlaybackSettlers.get(videoElement);
    if (!settlers) return;
    [...settlers].forEach((settle) => settle());
  };

  const playVideoElement = (videoElement: HTMLVideoElement): Promise<void> =>
    new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        videoElement.removeEventListener("ended", settle);
        videoElement.removeEventListener("error", settle);
        videoElement.removeEventListener("pause", settle);
        videoPlaybackSettlers.get(videoElement)?.delete(settle);
        resolve();
      };

      const settlers = videoPlaybackSettlers.get(videoElement) ?? new Set();
      settlers.add(settle);
      videoPlaybackSettlers.set(videoElement, settlers);
      videoElement.addEventListener("ended", settle, { once: true });
      videoElement.addEventListener("error", settle, { once: true });
      // ScenePlayer 自带的 UI 控件可能直接暂停原生 video；此时也必须释放
      // runtime 等待并推进串行播放队列。
      videoElement.addEventListener("pause", settle, { once: true });

      try {
        const playResult = videoElement.play();
        playResult?.catch((error) => {
          logger.error("视频播放失败", error);
          settle();
        });
      } catch (error) {
        logger.error("视频播放失败", error);
        settle();
      }
    });

  type VideoQueueItem = {
    videoElement: HTMLVideoElement;
    resolve: () => void;
  };
  const videoPlaybackQueue: VideoQueueItem[] = [];
  let isVideoQueueRunning = false;
  let activeVideoQueueItem: VideoQueueItem | null = null;

  const processVideoQueue = async () => {
    if (isVideoQueueRunning) return;
    isVideoQueueRunning = true;
    try {
      while (videoPlaybackQueue.length > 0) {
        const current = videoPlaybackQueue.shift()!;
        activeVideoQueueItem = current;
        await playVideoElement(current.videoElement);
        current.resolve();
        activeVideoQueueItem = null;
      }
    } finally {
      activeVideoQueueItem = null;
      isVideoQueueRunning = false;
    }
  };

  const cancelVideoPlayback = (videoElement: HTMLVideoElement) => {
    for (let index = videoPlaybackQueue.length - 1; index >= 0; index--) {
      const queued = videoPlaybackQueue[index];
      if (queued.videoElement !== videoElement) continue;
      videoPlaybackQueue.splice(index, 1);
      queued.resolve();
    }
    if (activeVideoQueueItem?.videoElement === videoElement) {
      settleVideoPlayback(videoElement);
    }
  };

  const playVideo = async (
    videoInput: VideoRuntimeInput,
    occupy: boolean = false
  ) => {
    const videoElement = resolveVideoElement(videoInput);
    if (!videoElement) {
      logger.error("视频资源无效");
      return;
    }

    // 与音频 skipQueue 的历史语义保持一致：独占播放不进入等待队列。
    if (occupy) {
      await playVideoElement(videoElement);
      return;
    }

    await new Promise<void>((resolve) => {
      videoPlaybackQueue.push({ videoElement, resolve });
      void processVideoQueue();
    });
  };

  const handleVideo = (
    uuidOrLegacyRequest: string,
    callback?: VideoCallback
  ) => {
    const legacyRequest = parseLegacyVideoRequest(uuidOrLegacyRequest);
    const uuid = legacyRequest?.uuid ?? uuidOrLegacyRequest;
    const source = scenePlayerRef.value?.sources.get(uuid);
    const videoElement = resolveVideoElement(source?.data as VideoRuntimeInput);
    if (!source || source.type !== "video" || !videoElement) {
      logger.error(`找不到UUID为 ${uuid} 的视频资源`);
      return null;
    }

    if (legacyRequest || callback) {
      void playVideo(source.data as VideoRuntimeInput, legacyRequest?.occupy)
        .then(() => callback?.())
        .catch((error) => logger.error("历史视频脚本执行失败", error));
    }
    return source.data;
  };

  const video = {
    play: playVideo,

    auto_play: async (
      videoInput: VideoRuntimeInput,
      occupy: boolean = false
    ) => {
      const videoElement = resolveVideoElement(videoInput);
      if (!videoElement) {
        logger.error("视频资源无效");
        return;
      }
      const isQueued = videoPlaybackQueue.some(
        (item) => item.videoElement === videoElement
      );
      if (isQueued) {
        cancelVideoPlayback(videoElement);
        return;
      }
      if (activeVideoQueueItem?.videoElement === videoElement) {
        videoElement.pause();
        cancelVideoPlayback(videoElement);
        settleVideoPlayback(videoElement);
        return;
      }
      if (!videoElement.paused) {
        videoElement.pause();
        cancelVideoPlayback(videoElement);
        settleVideoPlayback(videoElement);
        return;
      }
      if (videoElement.currentTime > 0) {
        try {
          await videoElement.play();
        } catch (error) {
          logger.error("视频恢复播放失败", error);
        }
        return;
      }
      await playVideo(videoElement, occupy);
    },

    pause: async (videoInput: VideoRuntimeInput) => {
      const videoElement = resolveVideoElement(videoInput);
      if (!videoElement) {
        logger.error("视频资源无效");
        return;
      }
      videoElement.pause();
      cancelVideoPlayback(videoElement);
      settleVideoPlayback(videoElement);
    },

    stop: async (videoInput: VideoRuntimeInput) => {
      const videoElement = resolveVideoElement(videoInput);
      if (!videoElement) {
        logger.error("视频资源无效");
        return;
      }
      videoElement.pause();
      cancelVideoPlayback(videoElement);
      try {
        videoElement.currentTime = 0;
      } catch (error) {
        logger.warn("视频资源暂时无法重置播放位置", error);
      }
      settleVideoPlayback(videoElement);
    },

    createTask: (videoInput: VideoRuntimeInput): TaskObject | null => {
      const videoElement = resolveVideoElement(videoInput);
      if (!videoElement) {
        logger.error("视频资源无效");
        return null;
      }
      return {
        type: "video",
        execute: async () => {
          await playVideo(videoElement);
        },
        data: videoElement,
      };
    },

    playTask: (videoInput: VideoRuntimeInput): TaskObject | null => {
      return video.createTask(videoInput);
    },
  };

  // ---- handleSound / audio sessions ----
  // handleSound 返回稳定控制句柄；每次实际播放使用独立 Audio，避免 ScenePlayer
  // 用 onended/onerror 管理队列时，同一元素并发播放互相覆盖完成回调。
  type AudioControlHandle = HTMLAudioElement & { stop?: () => void };
  type AudioPlaybackSession = {
    audio: HTMLAudioElement;
    cancelled: boolean;
    started: boolean;
    cancel: () => void;
  };
  const audioUuidCache = new Map<string, AudioControlHandle>();
  const audioUrlCache = new Map<string, AudioControlHandle>();
  const audioHandleUrls = new WeakMap<HTMLAudioElement, string>();
  const audioSessions = new WeakMap<
    HTMLAudioElement,
    Set<AudioPlaybackSession>
  >();
  const audioResumePositions = new WeakMap<HTMLAudioElement, number>();

  const pauseNativeAudio = (audio: HTMLAudioElement) => {
    try {
      HTMLMediaElement.prototype.pause.call(audio);
    } catch (error) {
      logger.warn("音频资源暂时无法暂停", error);
    }
  };

  const cancelAudioSessions = (
    handle: HTMLAudioElement,
    resetPosition: boolean
  ) => {
    const sessions = [...(audioSessions.get(handle) ?? [])];
    let resumePosition =
      audioResumePositions.get(handle) ?? handle.currentTime ?? 0;
    sessions.forEach((session) => {
      resumePosition = Math.max(resumePosition, session.audio.currentTime || 0);
      session.cancel();
    });
    audioSessions.delete(handle);
    audioResumePositions.set(handle, resetPosition ? 0 : resumePosition);
    try {
      handle.currentTime = resetPosition ? 0 : resumePosition;
    } catch (error) {
      logger.warn("音频控制句柄暂时无法更新播放位置", error);
    }
  };

  const createAudioHandle = (url: string): AudioControlHandle => {
    const cached = audioUrlCache.get(url);
    if (cached) return cached;
    const handle = new Audio(url) as AudioControlHandle;
    audioHandleUrls.set(handle, url);
    // 兼容历史脚本 handleSound(uuid).pause()/stop()。
    handle.pause = () => cancelAudioSessions(handle, false);
    handle.stop = () => cancelAudioSessions(handle, true);
    audioUrlCache.set(url, handle);
    return handle;
  };

  const handleSound = (uuid: string): HTMLAudioElement | undefined => {
    const cached = audioUuidCache.get(uuid);
    if (cached) return cached;
    const audioUrl = scenePlayerRef.value?.getAudioUrl(uuid);
    if (!audioUrl) {
      logger.error(`找不到UUID为 ${uuid} 的音频资源`);
      return undefined;
    }
    const handle = createAudioHandle(audioUrl);
    audioUuidCache.set(uuid, handle);
    return handle;
  };

  const resolveAudioElement = (
    audio: AudioRuntimeInput
  ): HTMLAudioElement | undefined => {
    if (!audio) return undefined;
    if (audio instanceof HTMLAudioElement) return audio;
    if (isRecord(audio)) {
      const url = audio.url ?? audio.src;
      if (typeof url === "string" && url.trim()) {
        return createAudioHandle(url);
      }
    }
    return undefined;
  };

  const playAudioSession = async (
    handle: HTMLAudioElement,
    skipQueue: boolean,
    resumePosition: number = 0
  ) => {
    const url =
      audioHandleUrls.get(handle) || handle.currentSrc || handle.src || "";
    const playbackAudio = new Audio(url);
    playbackAudio.loop = handle.loop;
    playbackAudio.muted = handle.muted;
    playbackAudio.volume = handle.volume;
    playbackAudio.playbackRate = handle.playbackRate;

    let resolveCancellation!: () => void;
    const cancellation = new Promise<void>((resolve) => {
      resolveCancellation = resolve;
    });
    const nativePlay = playbackAudio.play.bind(playbackAudio);
    const session: AudioPlaybackSession = {
      audio: playbackAudio,
      cancelled: false,
      started: false,
      cancel: () => {
        if (session.cancelled) return;
        session.cancelled = true;
        pauseNativeAudio(playbackAudio);
        playbackAudio.removeAttribute("src");
        try {
          playbackAudio.load();
        } catch {
          // 部分测试/旧浏览器没有实现 load；src 已清空即可阻止后续出声。
        }
        resolveCancellation();
        if (session.started) {
          playbackAudio.dispatchEvent(new Event("ended"));
        }
      },
    };

    playbackAudio.play = () => {
      if (session.cancelled) {
        return Promise.reject(new Error("音频播放已取消"));
      }
      session.started = true;
      if (resumePosition > 0) {
        try {
          playbackAudio.currentTime = resumePosition;
        } catch (error) {
          logger.warn("音频资源暂时无法恢复播放位置", error);
        }
      }
      return nativePlay();
    };

    const sessions = audioSessions.get(handle) ?? new Set();
    sessions.add(session);
    audioSessions.set(handle, sessions);
    try {
      const playback = Promise.resolve(
        scenePlayerRef.value?.playQueuedAudio(playbackAudio, skipQueue)
      );
      await Promise.race([playback, cancellation]);
    } finally {
      sessions.delete(session);
      if (sessions.size === 0 && audioSessions.get(handle) === sessions) {
        audioSessions.delete(handle);
      }
      if (!session.cancelled) audioResumePositions.set(handle, 0);
    }
  };

  const resolveMeshWrapper = (object: unknown): MeshWrapper | null => {
    if (object instanceof THREE.Object3D) return { mesh: object };
    if (!isRecord(object)) return null;
    if (object.mesh instanceof THREE.Object3D) {
      return object as MeshWrapper;
    }
    if (object.data) return resolveMeshWrapper(object.data);
    return null;
  };

  const callEntityMethod = (
    object: unknown,
    methodNames: string[],
    ...args: unknown[]
  ): { called: boolean; result?: unknown } => {
    if (!isRecord(object)) return { called: false };
    for (const methodName of methodNames) {
      const method = object[methodName];
      if (typeof method === "function") {
        return {
          called: true,
          result: method.apply(object, args),
        };
      }
    }
    return { called: false };
  };

  const emitRuntimeControl = (
    control: string,
    object: unknown,
    value: unknown
  ) => {
    const detail = { control, object, value };
    logger.log("脚本运行时控制:", detail);
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("xrugc:runtime-control", { detail })
      );
    }
    return detail;
  };

  const highlightHelpers = new WeakMap<THREE.Object3D, THREE.BoxHelper>();

  const setHighlight = (
    object: unknown,
    visible: boolean,
    colorName: string = "white"
  ) => {
    const delegated = callEntityMethod(
      object,
      ["setHighlight", "set_highlight"],
      visible,
      colorName
    );
    if (delegated.called) return delegated.result;

    const mesh = resolveMeshWrapper(object)?.mesh;
    if (!mesh) {
      logger.warn("高亮实体资源无效");
      return;
    }
    mesh.userData.xrugcHighlight = { visible, color: colorName };
    const existingHelper = highlightHelpers.get(mesh);
    if (existingHelper) {
      existingHelper.removeFromParent();
      existingHelper.geometry.dispose();
      existingHelper.material.dispose();
      highlightHelpers.delete(mesh);
    }
    if (visible) {
      const color = colorName && colorName !== "none" ? colorName : "white";
      const helper = new THREE.BoxHelper(mesh, new THREE.Color(color));
      (mesh.parent ?? mesh).add(helper);
      highlightHelpers.set(mesh, helper);
    }
    return emitRuntimeControl("highlight", object, { visible, colorName });
  };

  const setMoveable = (object: unknown, movable: boolean) => {
    const delegated = callEntityMethod(
      object,
      ["setMoveable", "setMovable", "set_moveable"],
      movable
    );
    if (delegated.called) return delegated.result;

    const mesh = resolveMeshWrapper(object)?.mesh;
    if (!mesh) {
      logger.warn("可移动实体资源无效");
      return;
    }
    mesh.userData.xrugcMoveable = movable;
    return emitRuntimeControl("moveable", object, movable);
  };

  const setAllMovable = (objects: unknown, movable: boolean) => {
    const list = Array.isArray(objects) ? objects : [objects];
    list.filter(Boolean).forEach((object) => setMoveable(object, movable));
  };

  const setRotatable = (object: unknown, rotatable: boolean) => {
    const delegated = callEntityMethod(
      object,
      ["setRotatable", "setRotating", "set_rotatable"],
      rotatable
    );
    if (delegated.called) return delegated.result;

    const mesh = resolveMeshWrapper(object)?.mesh;
    if (!mesh) {
      logger.warn("可旋转实体资源无效");
      return;
    }
    mesh.userData.xrugcRotatable = rotatable;
    return emitRuntimeControl("rotatable", object, rotatable);
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

    setHighlight,
    setMoveable,
    setAllMovable,
    setRotatable,

    setEmote: (polygenInstance: unknown, emote: string) => {
      const delegated = callEntityMethod(
        polygenInstance,
        ["setEmote", "set_emote"],
        emote
      );
      if (delegated.called) return delegated.result;
      if (
        isRecord(polygenInstance) &&
        typeof polygenInstance.playAnimation === "function"
      ) {
        return polygenInstance.playAnimation(emote);
      }
      logger.warn("polygen实例不支持表情设置");
    },

    setVisemeClip: (polygenInstance: unknown, audio: AudioRuntimeInput) => {
      const delegated = callEntityMethod(
        polygenInstance,
        ["setVisemeClip", "set_viseme_clip"],
        audio
      );
      if (delegated.called) return delegated.result;
      const mesh = resolveMeshWrapper(polygenInstance)?.mesh;
      if (!mesh) {
        logger.warn("polygen实例不支持口型音频设置");
        return;
      }
      mesh.userData.xrugcVisemeClip = resolveAudioElement(audio) ?? audio;
    },
  };

  // ---- sound API ----
  const sound = {
    play: async (audio: AudioRuntimeInput, skipQueue: boolean = false) => {
      const handle = resolveAudioElement(audio);
      if (!handle) {
        logger.error("音频资源无效");
        return;
      }
      await playAudioSession(handle, skipQueue);
    },

    auto_play: async (audio: AudioRuntimeInput, skipQueue: boolean = false) => {
      const handle = resolveAudioElement(audio);
      if (!handle) {
        logger.error("音频资源无效");
        return;
      }
      if ((audioSessions.get(handle)?.size ?? 0) > 0) {
        cancelAudioSessions(handle, false);
        return;
      }
      const resumePosition = audioResumePositions.get(handle) ?? 0;
      await playAudioSession(handle, skipQueue, resumePosition);
    },

    stop: async (audio: AudioRuntimeInput) => {
      const handle = resolveAudioElement(audio);
      if (!handle) {
        logger.error("音频资源无效");
        return;
      }
      cancelAudioSessions(handle, true);
    },

    pause: async (audio: AudioRuntimeInput) => {
      const handle = resolveAudioElement(audio);
      if (!handle) {
        logger.error("音频资源无效");
        return;
      }
      cancelAudioSessions(handle, false);
    },

    createTask: (audio: AudioRuntimeInput): TaskObject | null => {
      const audioElement = resolveAudioElement(audio);
      if (!audioElement) {
        logger.error("音频资源无效");
        return null;
      }
      return {
        type: "audio",
        execute: async () => {
          await playAudioSession(audioElement, false);
        },
        data: audioElement,
      };
    },

    playTask: (audio: AudioRuntimeInput): TaskObject | null => {
      return sound.createTask(audio);
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

    parameters: (values: unknown) =>
      Array.isArray(values) ? [...values] : values == null ? [] : [values],

    // Blockly 历史脚本未生成 await。Web 端不能安全阻塞主线程，因此保留
    // 同名异步兼容入口；新脚本可显式 await，旧脚本至少不会因缺失 API 中断。
    sync_sleep: (seconds: number) => {
      const value = Number(seconds);
      const duration = Number.isFinite(value) ? Math.max(value, 0) : 0;
      return new Promise<void>((resolve) =>
        setTimeout(resolve, duration * 1000)
      );
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

  const executeTweenData = (tweenData: Record<string, unknown>) =>
    new Promise<void>((resolve) => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const duration = Number(tweenData.duration);
        const progress =
          Number.isFinite(duration) && duration > 0
            ? Math.min(elapsed / duration, 1)
            : 1;
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

  const parallelTaskArrays = new WeakSet<unknown[]>();

  const executeTaskValue = async (taskValue: unknown): Promise<unknown> => {
    if (taskValue == null) return;
    const wasPromise = taskValue instanceof Promise;
    const resolvedValue = wasPromise ? await taskValue : taskValue;
    if (Array.isArray(resolvedValue)) {
      if (parallelTaskArrays.has(resolvedValue)) {
        await Promise.all(resolvedValue.map((item) => executeTaskValue(item)));
        return;
      }
      for (const item of resolvedValue) await executeTaskValue(item);
      return;
    }
    if (typeof resolvedValue === "function") {
      return await resolvedValue();
    }
    if (!isRecord(resolvedValue)) return wasPromise ? resolvedValue : undefined;
    if (typeof resolvedValue.execute === "function") {
      return await resolvedValue.execute();
    }
    if (resolvedValue.type === "audio") {
      return await sound.play(
        resolvedValue.data as HTMLAudioElement | undefined
      );
    }
    if (resolvedValue.type === "object" || resolvedValue.type === "data") {
      return await executeTweenData(resolvedValue);
    }
    logger.warn("无法执行的任务类型:", resolvedValue);
  };

  const task = {
    circle: async (count: number, taskToRepeat: unknown) => {
      logger.log("Executing circle task:", { count, taskToRepeat });
      if (typeof count !== "number" || count < 0) {
        logger.warn("循环次数必须是正数:", count);
        return;
      }
      const resolvedTask =
        taskToRepeat instanceof Promise ? await taskToRepeat : taskToRepeat;
      for (let i = 0; i < count; i++) {
        logger.log(`执行第 ${i + 1}/${count} 次任务`);
        try {
          await executeTaskValue(resolvedTask);
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
        parallelTaskArrays.add(result);
      } else {
        logger.warn(`未知的数组类型: ${type}，默认使用 LIST 类型`);
        result = processArrayItems(items);
      }
      logger.log("Processed array result:", result);
      return result;
    },

    execute: executeTaskValue,

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
          polygenInstance.playAnimation!(animationName);
        },
        data: { instance: polygenInstance, animationName },
      };
    },

    playTask: (
      polygenInstance: MeshWrapper,
      animationName: string
    ): TaskObject | null => {
      return animation.createTask(polygenInstance, animationName);
    },
  };

  // ---- event API（宿主 signal 优先，Web 预览提供安全事件桥）----
  const signal =
    extraEvent?.signal ??
    ((moduleUuid: unknown, eventUuid: unknown, parameter?: unknown) => {
      const detail = { moduleUuid, eventUuid, parameter };
      logger.log("触发信号:", detail);
      if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("xrugc:signal", { detail }));
      }
    });

  const event = {
    trigger: (index: unknown, eventId: string) => {
      logger.log("触发事件:", index, eventId);
    },
    ...extraEvent,
    signal,
    signal_array: (entries: unknown) => {
      if (!Array.isArray(entries)) {
        logger.warn("批量信号参数必须为数组", entries);
        return;
      }
      entries.forEach((entry) => {
        const moduleUuid = Array.isArray(entry)
          ? entry[0]
          : isRecord(entry)
            ? (entry.index ?? entry.moduleUuid)
            : undefined;
        const eventUuid = Array.isArray(entry)
          ? entry[1]
          : isRecord(entry)
            ? (entry.uuid ?? entry.eventUuid)
            : undefined;
        const parameter =
          isRecord(entry) && "parameter" in entry ? entry.parameter : undefined;
        if (moduleUuid == null || eventUuid == null) {
          logger.warn("忽略无效的批量信号项", entry);
          return;
        }
        signal(moduleUuid, eventUuid, parameter);
      });
    },
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
  const toVector3 = (
    value: unknown,
    fallback: THREE.Vector3
  ): THREE.Vector3 => {
    if (value instanceof THREE.Vector3) return value.clone();
    if (!isRecord(value)) return fallback;
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    return new THREE.Vector3(
      Number.isFinite(x) ? x : fallback.x,
      Number.isFinite(y) ? y : fallback.y,
      Number.isFinite(z) ? z : fallback.z
    );
  };

  const normalizeTransform = (value: unknown): RuntimeTransform | null => {
    if (!isRecord(value)) return null;
    return {
      position: toVector3(value.position, new THREE.Vector3()),
      rotation: toVector3(value.rotation ?? value.rotate, new THREE.Vector3()),
      scale: toVector3(value.scale, new THREE.Vector3(1, 1, 1)),
    };
  };

  const explodedPositions = new WeakMap<
    THREE.Object3D,
    Map<THREE.Object3D, THREE.Vector3>
  >();
  const tweenQueues = new WeakMap<THREE.Object3D, Promise<void>>();

  const createLine = (from: THREE.Object3D, to: THREE.Object3D) => {
    from.updateWorldMatrix(true, false);
    to.updateWorldMatrix(true, false);
    const fromPosition = from.getWorldPosition(new THREE.Vector3());
    const toPosition = to.getWorldPosition(new THREE.Vector3());

    const fromAncestors = new Set<THREE.Object3D>();
    let ancestor: THREE.Object3D | null = from;
    while (ancestor) {
      fromAncestors.add(ancestor);
      ancestor = ancestor.parent;
    }
    let commonParent: THREE.Object3D | null = to;
    while (commonParent && !fromAncestors.has(commonParent)) {
      commonParent = commonParent.parent;
    }
    commonParent ??= from.parent ?? from;
    commonParent.updateWorldMatrix(true, false);

    const geometry = new THREE.BufferGeometry().setFromPoints([
      commonParent.worldToLocal(fromPosition),
      commonParent.worldToLocal(toPosition),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    commonParent.add(line);
    return line;
  };

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

    setHighlight,
    setMoveable,
    setAllMovable,
    setRotatable,

    setTooltipVisual: (object: unknown, visible: boolean) => {
      const delegated = callEntityMethod(
        object,
        ["setTooltipVisual", "setTooltipVisibility", "set_tooltip_visual"],
        visible
      );
      if (delegated.called) return delegated.result;
      const mesh = resolveMeshWrapper(object)?.mesh;
      if (!mesh) {
        logger.warn("提示实体资源无效");
        return;
      }
      mesh.userData.xrugcTooltipVisible = visible;
      return emitRuntimeControl("tooltip-visual", object, visible);
    },

    setTooltipsVisual: (objects: unknown, visible: boolean) => {
      const list = Array.isArray(objects) ? objects : [objects];
      list.filter(Boolean).forEach((object) => {
        const delegated = callEntityMethod(
          object,
          ["setTooltipVisual", "setTooltipVisibility", "set_tooltip_visual"],
          visible
        );
        if (!delegated.called) {
          const mesh = resolveMeshWrapper(object)?.mesh;
          if (mesh) {
            mesh.userData.xrugcTooltipVisible = visible;
            emitRuntimeControl("tooltip-visual", object, visible);
          }
        }
      });
    },

    toTransformData: (object: unknown): RuntimeTransform | null => {
      const delegated = callEntityMethod(object, [
        "toTransformData",
        "to_transform_data",
      ]);
      if (delegated.called && isRecord(delegated.result)) {
        return normalizeTransform(delegated.result);
      }
      const mesh = resolveMeshWrapper(object)?.mesh;
      if (!mesh) {
        logger.warn("无法读取实体空间数据");
        return null;
      }
      return {
        position: mesh.position.clone(),
        rotation: new THREE.Vector3(
          THREE.MathUtils.radToDeg(mesh.rotation.x),
          THREE.MathUtils.radToDeg(mesh.rotation.y),
          THREE.MathUtils.radToDeg(mesh.rotation.z)
        ),
        scale: mesh.scale.clone(),
      };
    },

    explode: (object: unknown, distance: number) => {
      const delegated = callEntityMethod(
        object,
        ["explode", "explodeEntity"],
        distance
      );
      if (delegated.called) return delegated.result;

      const wrapper = resolveMeshWrapper(object);
      if (!wrapper) {
        logger.error("爆炸展开的实体资源无效");
        return;
      }
      const root = wrapper.mesh;
      const pieces = root.children.length > 0 ? root.children : [root];
      if (!explodedPositions.has(root)) {
        explodedPositions.set(
          root,
          new Map(pieces.map((piece) => [piece, piece.position.clone()]))
        );
      }

      const amount = Number(distance);
      if (!Number.isFinite(amount)) return;
      const center = pieces
        .reduce((sum, piece) => sum.add(piece.position), new THREE.Vector3())
        .divideScalar(Math.max(pieces.length, 1));
      pieces.forEach((piece, index) => {
        const direction = piece.position.clone().sub(center);
        if (direction.lengthSq() === 0) {
          const angle = (index / Math.max(pieces.length, 1)) * Math.PI * 2;
          direction.set(Math.cos(angle), Math.sin(angle), index % 2 ? 1 : -1);
        }
        piece.position.add(direction.normalize().multiplyScalar(amount));
      });
    },

    unexplode: (object: unknown) => {
      const delegated = callEntityMethod(object, [
        "unexplode",
        "unexploded",
        "restoreExplosion",
      ]);
      if (delegated.called) return delegated.result;

      const wrapper = resolveMeshWrapper(object);
      if (!wrapper) {
        logger.error("爆炸还原的实体资源无效");
        return;
      }
      const positions = explodedPositions.get(wrapper.mesh);
      positions?.forEach((position, piece) => piece.position.copy(position));
      explodedPositions.delete(wrapper.mesh);
    },

    line: (fromObject: unknown, toObject: unknown) => {
      const delegated = callEntityMethod(
        fromObject,
        ["line", "lineTo"],
        toObject
      );
      if (delegated.called) return delegated.result;

      const from = resolveMeshWrapper(fromObject)?.mesh;
      const to = resolveMeshWrapper(toObject)?.mesh;
      if (!from || !to) {
        logger.error("连线的实体资源无效");
        return null;
      }
      return createLine(from, to);
    },

    tween: async (
      object: unknown,
      transformData: unknown,
      duration: number,
      occupy: boolean = false
    ) => {
      const delegated = callEntityMethod(
        object,
        ["tween", "tweenTo"],
        transformData,
        duration,
        occupy
      );
      if (delegated.called) {
        await delegated.result;
        return;
      }

      const wrapper = resolveMeshWrapper(object);
      const normalizedTransform = normalizeTransform(transformData);
      if (!wrapper || !normalizedTransform) {
        logger.error("补间动画的实体或空间数据无效");
        return;
      }

      const seconds = Number(duration);
      const runTween = async () => {
        const tweenData = tween.to_data(
          wrapper,
          normalizedTransform,
          Number.isFinite(seconds) ? Math.max(seconds, 0) : 0,
          "LINEAR"
        );
        await task.execute(tweenData);
      };
      if (!occupy) {
        await runTween();
        return;
      }

      const previous = tweenQueues.get(wrapper.mesh) ?? Promise.resolve();
      const current = previous.catch(() => undefined).then(runTween);
      tweenQueues.set(wrapper.mesh, current);
      try {
        await current;
      } finally {
        if (tweenQueues.get(wrapper.mesh) === current) {
          tweenQueues.delete(wrapper.mesh);
        }
      }
    },
  };

  // ---- managers API ----
  // 正式宿主可以在事件 parameter 上提供同名方法；纯 Web 预览则维护最小状态并
  // 派发事件，保证 Blockly 生成脚本可运行且宿主有稳定的接入点。
  const gameState = { score: 0, countdownSeconds: 0 };
  const callManagerDelegate = (
    parameter: unknown,
    methodName: string,
    ...args: unknown[]
  ) => {
    if (!isRecord(parameter)) return { called: false as const };
    const directMethod = parameter[methodName];
    if (typeof directMethod === "function") {
      return {
        called: true as const,
        result: directMethod.apply(parameter, args),
      };
    }
    const managerObject = parameter.managers;
    if (isRecord(managerObject)) {
      const managerMethod = managerObject[methodName];
      if (typeof managerMethod === "function") {
        return {
          called: true as const,
          result: managerMethod.apply(managerObject, args),
        };
      }
    }
    return { called: false as const };
  };

  const emitGameManagerEvent = (
    action: "game_add_score" | "game_countdown" | "game_reset",
    parameter: unknown
  ) => {
    const detail = { action, parameter, ...gameState };
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent("xrugc:game-manager", { detail }));
    }
    logger.log("游戏管理器事件:", detail);
    return detail;
  };

  const managers = {
    game_add_score: (score: number, parameter?: unknown) => {
      const value = Number(score);
      const normalizedScore = Number.isFinite(value) ? value : 0;
      const delegated = callManagerDelegate(
        parameter,
        "game_add_score",
        normalizedScore
      );
      if (delegated.called) return delegated.result;
      gameState.score += normalizedScore;
      return emitGameManagerEvent("game_add_score", parameter);
    },

    game_countdown: (seconds: number, parameter?: unknown) => {
      const value = Number(seconds);
      const normalizedSeconds = Number.isFinite(value) ? Math.max(value, 0) : 0;
      const delegated = callManagerDelegate(
        parameter,
        "game_countdown",
        normalizedSeconds
      );
      if (delegated.called) return delegated.result;
      gameState.countdownSeconds = normalizedSeconds;
      return emitGameManagerEvent("game_countdown", parameter);
    },

    game_reset: (parameter?: unknown) => {
      const delegated = callManagerDelegate(parameter, "game_reset");
      if (delegated.called) return delegated.result;
      gameState.score = 0;
      gameState.countdownSeconds = 0;
      return emitGameManagerEvent("game_reset", parameter);
    },
  };

  // ---- transform ----
  const transform = (position: unknown, rotation: unknown, scale: unknown) => ({
    position: position instanceof Vector3 ? position : new Vector3(),
    rotation: rotation instanceof Vector3 ? rotation : new Vector3(),
    scale: scale instanceof Vector3 ? scale : new Vector3(1, 1, 1),
  });

  // ---- system / log ----
  const system = {
    parameter: (value: unknown) => value,

    task: (method: unknown, parameter?: unknown): TaskObject => {
      const detail = { method, parameter };
      return {
        type: "system",
        data: detail,
        execute: async () => {
          logger.log("执行系统任务:", detail);
          if (
            typeof window !== "undefined" &&
            typeof CustomEvent !== "undefined"
          ) {
            window.dispatchEvent(
              new CustomEvent("xrugc:system-task", { detail })
            );
          }
        },
      };
    },
  };

  const createLogUuid = () =>
    globalThis.crypto?.randomUUID?.() ??
    `runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let runtimeLogUuid = createLogUuid();
  const log = {
    post: (dataType: string, key: string, value: string) => {
      const entry = {
        uuid: runtimeLogUuid,
        dataType: String(dataType),
        key: String(key),
        value: String(value),
      };
      logger.log("Blockly日志:", entry);
      if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("xrugc:script-log", { detail: entry })
        );
      }
      return entry;
    },
    resetUuid: () => {
      runtimeLogUuid = createLogUuid();
      return runtimeLogUuid;
    },
  };

  // ---- argument API ----
  const argument = {
    boolean: (value: boolean) => value,
    number: (value: number) => value,
    string: (value: string) => value,
    indexPlayer: (value: number) => value,
    idPlayer: (value: number) => value,
    serverPlayer: () => "server",
    randomPlayer: () => "random_client",
    anchor: (key: string) => {
      const source = scenePlayerRef.value?.sources.get(String(key));
      const mesh = resolveMeshWrapper(source?.data)?.mesh;
      if (!mesh) return new Vector3();
      return mesh.getWorldPosition(new Vector3());
    },
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
    handleVoxel,
    handlePicture,
    handleSound,
    handleVideo,
    video,
    tween,
    task,
    animation,
    event,
    text,
    point,
    managers,
    transform,
    system,
    log,
    argument,
  };
}

/**
 * `new Function` 的参数名与实参数组必须严格保持相同顺序。
 * 三个脚本预览入口统一复用该列表，新增运行时能力时不会再出现漏注入。
 */
export const SCRIPT_RUNTIME_BINDING_NAMES = [
  "Vector3",
  "polygen",
  "sound",
  "helper",
  "handleText",
  "handleEntity",
  "handleVoxel",
  "handlePicture",
  "handleSound",
  "handleVideo",
  "video",
  "tween",
  "task",
  "animation",
  "event",
  "text",
  "point",
  "managers",
  "transform",
  "system",
  "log",
  "argument",
] as const;

export const getScriptRuntimeBindingValues = (
  runtime: ReturnType<typeof buildScriptRuntime>
): unknown[] => SCRIPT_RUNTIME_BINDING_NAMES.map((name) => runtime[name]);
