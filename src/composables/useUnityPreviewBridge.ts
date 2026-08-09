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

type UnityPreviewProtocol = "pending" | "session-v1" | "legacy-v0";

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
  const runnerProtocol = ref<UnityPreviewProtocol>("pending");
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

  const bindRunnerSession = (
    message: Record<string, unknown>,
    session: string
  ): Record<string, unknown> =>
    runnerProtocol.value === "legacy-v0" ? message : { ...message, session };

  const postDispose = () => {
    const session = runSession.value;
    if (!session) return;

    dialogRef.value?.postMessage(
      bindRunnerSession({ type: "webgl-preview-dispose" }, session),
      targetOrigin.value
    );
  };

  const acceptsRunnerMessage = (
    message: Record<string, unknown>,
    session: string
  ): boolean => {
    const hasSession = Object.prototype.hasOwnProperty.call(message, "session");

    if (runnerProtocol.value === "pending") {
      // Only a READY from the current iframe and exact runner origin may select
      // the protocol for this load epoch. Older runners either omit session or
      // echo an empty session; current runners must echo the exact nonce.
      if (message.type !== "unity-web-preview-ready") return false;
      if (hasSession && message.session !== "" && message.session !== session) {
        return false;
      }

      runnerProtocol.value =
        hasSession && message.session === session ? "session-v1" : "legacy-v0";
      if (runnerProtocol.value === "legacy-v0") {
        logger.warn(
          "[UnityPreview] trusted legacy runner selected for this load epoch"
        );
      }
      return true;
    }

    if (runnerProtocol.value === "session-v1") {
      return hasSession && message.session === session;
    }

    // Once legacy mode is selected, never accept a later session-bearing
    // message. Protocol selection is immutable until the iframe is replaced.
    return !hasSession || message.session === "";
  };

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
      bindRunnerSession(
        {
          type: "xrugc-load-scene-json",
          payload: postablePayload,
        },
        session
      ),
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
      bindRunnerSession(
        {
          type: "unity-web-preview-camera-mode",
          mode,
        },
        session
      ),
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
    if (!runSession.value) return;

    const generation = runGeneration;
    const session = runSession.value;
    if (!acceptsRunnerMessage(event.data, session)) return;

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

    postDispose();
    const generation = ++runGeneration;
    const session = createUnityPreviewSession();
    clearRunningFallbackTimer();
    ready.value = false;
    frameVisible.value = false;
    runSession.value = "";
    runnerProtocol.value = "pending";
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
    postDispose();
    runGeneration += 1;
    clearRunningFallbackTimer();
    visible.value = false;
    ready.value = false;
    frameVisible.value = false;
    panMode.value = false;
    status.value = initialStatus;
    runSession.value = "";
    runnerProtocol.value = "pending";
    pendingPayload.value = null;
    hasPendingPayload = false;
  };

  onMounted(() => {
    window.addEventListener("message", handleMessage);
  });

  onBeforeUnmount(() => {
    postDispose();
    runGeneration += 1;
    runSession.value = "";
    runnerProtocol.value = "pending";
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
    runnerProtocol,
    panMode,
    pendingPayload,
    src,
    open,
    send,
    handleLoad,
    handleClosed,
  };
};
