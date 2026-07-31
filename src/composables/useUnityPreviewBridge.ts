import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import env from "@/environment";
import { logger } from "@/utils/logger";
import {
  cloneForUnityPreview,
  rewriteUnityPreviewUrls,
  summarizeUnityPreviewPayload,
} from "@/utils/unityPreviewPayload";
import type UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";

type MaybePromise<T> = T | Promise<T>;

type UnityPreviewDialogExpose = InstanceType<typeof UnityPreviewDialog>;

type UseUnityPreviewBridgeOptions = {
  buildPayload: () => MaybePromise<unknown>;
  ensureRuntimeData?: () => MaybePromise<void>;
  canOpen?: () => true | string;
  notifyError: (message: string) => void;
};

const initialStatus = "正在加载 Unity 运行器...";

const createUnityPreviewSession = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `unity-preview-${globalThis.crypto.randomUUID()}`;
  }

  const entropy = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(entropy);
  const suffix = [...entropy]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
  return `unity-preview-${Date.now()}-${suffix}`;
};

const resolveUnityPreviewUrl = () => {
  try {
    return new URL(env.unityPreview, window.location.href);
  } catch (error) {
    logger.warn(
      "Unity preview url is invalid, falling back to local preview",
      error
    );
    return new URL("/webgl-preview/embed.html", window.location.href);
  }
};

const resolveUnityPreviewRunnerOrigin = (): string => {
  try {
    const url = resolveUnityPreviewUrl();
    if (url.hostname === "localhost" && url.port === "3006") {
      return "http://127.0.0.1:3006";
    }

    return url.origin;
  } catch {
    return window.location.origin;
  }
};

const resolveUnityPreviewAssetBaseOrigin = (): string => {
  try {
    if (/^https?:\/\//i.test(env.api)) {
      return new URL(env.api).origin;
    }
  } catch {
    // Fall back to the current page origin below.
  }

  return window.location.origin;
};

export const useUnityPreviewBridge = ({
  buildPayload,
  ensureRuntimeData,
  canOpen,
  notifyError,
}: UseUnityPreviewBridgeOptions) => {
  const dialogRef = ref<UnityPreviewDialogExpose | null>(null);
  const visible = ref(false);
  const frameVisible = ref(false);
  const ready = ref(false);
  const status = ref(initialStatus);
  const frameKey = ref(0);
  const runSession = ref("");
  const panMode = ref(false);
  const pendingPayload = ref<unknown>(null);
  let runningFallbackTimer: number | undefined;
  let runGeneration = 0;
  let hasPendingPayload = false;

  const src = computed(() => {
    const url = resolveUnityPreviewUrl();
    url.searchParams.set("embed", "1");
    url.searchParams.set("v", String(frameKey.value));
    if (runSession.value) {
      url.searchParams.set("session", runSession.value);
    }
    return url.toString();
  });

  const targetOrigin = computed(() => {
    return resolveUnityPreviewUrl().origin;
  });

  const runnerOrigin = computed(resolveUnityPreviewRunnerOrigin);
  const assetBaseOrigin = computed(resolveUnityPreviewAssetBaseOrigin);

  const clearRunningFallbackTimer = () => {
    if (runningFallbackTimer !== undefined) {
      window.clearTimeout(runningFallbackTimer);
      runningFallbackTimer = undefined;
    }
  };

  const isCurrentGeneration = (generation: number): boolean =>
    generation === runGeneration;

  const isCurrentRun = (generation: number, session: string): boolean =>
    isCurrentGeneration(generation) &&
    session !== "" &&
    runSession.value === session &&
    frameVisible.value;

  const postPayload = (
    payload: unknown,
    session: string,
    generation: number
  ) => {
    if (!isCurrentRun(generation, session)) return;

    const dialog = dialogRef.value;
    if (!dialog) {
      notifyError("Unity 运行器尚未加载完成");
      return;
    }

    const postablePayload = cloneForUnityPreview(payload);
    try {
      rewriteUnityPreviewUrls(
        postablePayload,
        runnerOrigin.value,
        assetBaseOrigin.value
      );
    } catch {
      logger.warn("[UnityPreview] scene asset origin denied");
      notifyError("场景包含不受信任的资源地址，无法运行预览");
      return;
    }
    const sent = dialog.postMessage(
      {
        type: "xrugc-load-scene-json",
        session,
        payload: postablePayload,
      },
      targetOrigin.value
    );
    if (!sent) {
      notifyError("Unity 运行器尚未加载完成");
      return;
    }

    status.value = "场景数据已发送到 Unity";
    clearRunningFallbackTimer();
    runningFallbackTimer = window.setTimeout(() => {
      if (visible.value && isCurrentRun(generation, session)) {
        status.value = "Unity 已接收场景数据，若画面为空请刷新运行器或重新打包";
      }
    }, 15000);
    logger.log(
      "[UnityPreview] scene payload sent",
      summarizeUnityPreviewPayload(postablePayload)
    );
  };

  const postCameraMode = (session: string, generation: number) => {
    if (!isCurrentRun(generation, session)) return;

    const dialog = dialogRef.value;
    if (!dialog) return;

    const mode = panMode.value ? "pan" : "orbit";
    dialog.postMessage(
      {
        type: "unity-web-preview-camera-mode",
        session,
        mode,
      },
      targetOrigin.value
    );
    logger.log("[UnityPreview] camera mode sent", mode);
  };

  const send = async () => {
    const generation = runGeneration;
    const session = runSession.value;
    if (!isCurrentRun(generation, session)) return;

    await ensureRuntimeData?.();
    if (!isCurrentRun(generation, session)) return;
    const payload = await buildPayload();
    if (!isCurrentRun(generation, session)) return;
    pendingPayload.value = payload;
    hasPendingPayload = true;
    postPayload(payload, session, generation);
  };

  const handleMessage = (event: MessageEvent) => {
    if (!dialogRef.value?.isFrameSource(event.source)) return;
    if (event.origin !== targetOrigin.value) return;
    if (!event.data || typeof event.data !== "object") return;
    if (!runSession.value || event.data.session !== runSession.value) return;

    const generation = runGeneration;
    const session = runSession.value;

    if (event.data.type === "unity-web-preview-ready") {
      ready.value = true;
      status.value = "Unity 已就绪，正在发送场景...";
      if (hasPendingPayload) {
        postPayload(pendingPayload.value, session, generation);
      } else {
        void send();
      }
      postCameraMode(session, generation);
    }

    if (event.data.type === "unity-web-preview-scene-forwarded") {
      status.value = "Unity 桥接已接收场景数据，正在本地加载...";
    }

    if (event.data.type === "unity-web-preview-scene-running") {
      clearRunningFallbackTimer();
      status.value = "场景已在 Unity 中运行";
    }
  };

  const handleLoad = () => {
    status.value = "Unity 运行器加载中...";
  };

  const open = async () => {
    const openResult = canOpen?.() ?? true;
    if (openResult !== true) {
      notifyError(openResult);
      return;
    }

    if (runSession.value) {
      dialogRef.value?.postMessage(
        {
          type: "webgl-preview-dispose",
          session: runSession.value,
        },
        targetOrigin.value
      );
    }
    const generation = ++runGeneration;
    const session = createUnityPreviewSession();
    clearRunningFallbackTimer();
    ready.value = false;
    frameVisible.value = false;
    runSession.value = "";
    pendingPayload.value = null;
    hasPendingPayload = false;
    await ensureRuntimeData?.();
    if (!isCurrentGeneration(generation)) return;
    const payload = await buildPayload();
    if (!isCurrentGeneration(generation)) return;

    pendingPayload.value = payload;
    hasPendingPayload = true;
    ready.value = false;
    panMode.value = false;
    status.value = initialStatus;
    runSession.value = session;
    frameKey.value += 1;
    frameVisible.value = true;
    visible.value = true;
  };

  const handleClosed = () => {
    if (runSession.value) {
      dialogRef.value?.postMessage(
        {
          type: "webgl-preview-dispose",
          session: runSession.value,
        },
        targetOrigin.value
      );
    }
    runGeneration += 1;
    clearRunningFallbackTimer();
    visible.value = false;
    ready.value = false;
    frameVisible.value = false;
    panMode.value = false;
    status.value = initialStatus;
    runSession.value = "";
    pendingPayload.value = null;
    hasPendingPayload = false;
  };

  onMounted(() => {
    window.addEventListener("message", handleMessage);
  });

  onBeforeUnmount(() => {
    if (runSession.value) {
      dialogRef.value?.postMessage(
        {
          type: "webgl-preview-dispose",
          session: runSession.value,
        },
        targetOrigin.value
      );
    }
    runGeneration += 1;
    runSession.value = "";
    pendingPayload.value = null;
    hasPendingPayload = false;
    window.removeEventListener("message", handleMessage);
    clearRunningFallbackTimer();
  });

  return {
    dialogRef,
    visible,
    frameVisible,
    ready,
    status,
    frameKey,
    panMode,
    pendingPayload,
    src,
    open,
    send,
    handleLoad,
    handleClosed,
  };
};
