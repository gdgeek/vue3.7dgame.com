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

const resolveUnityPreviewUrl = () => {
  try {
    return new URL(env.unityPreview, window.location.href);
  } catch (error) {
    logger.warn(
      "Unity preview url is invalid, falling back to local preview",
      error
    );
    return new URL("http://127.0.0.1:8080/");
  }
};

const resolveUnityPreviewProxyOrigin = (): string => {
  try {
    const url = resolveUnityPreviewUrl();
    if (url.hostname === "localhost" && url.port === "8080") {
      return "http://127.0.0.1:8080";
    }

    return url.origin;
  } catch {
    return "http://127.0.0.1:8080";
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
  const panMode = ref(false);
  const pendingPayload = ref<unknown>(null);
  const hasPendingPayload = ref(false);
  let runningFallbackTimer: number | undefined;

  const src = computed(() => {
    const url = resolveUnityPreviewUrl();
    url.searchParams.set("embed", "1");
    url.searchParams.set("runner", env.buildVersion);
    return url.toString();
  });

  const targetOrigin = computed(() => {
    return resolveUnityPreviewUrl().origin;
  });

  const proxyOrigin = computed(resolveUnityPreviewProxyOrigin);
  const assetBaseOrigin = computed(resolveUnityPreviewAssetBaseOrigin);

  const clearRunningFallbackTimer = () => {
    if (runningFallbackTimer !== undefined) {
      window.clearTimeout(runningFallbackTimer);
      runningFallbackTimer = undefined;
    }
  };

  const postPayload = (payload: unknown) => {
    const dialog = dialogRef.value;
    if (!dialog) {
      notifyError("Unity 运行器尚未加载完成");
      return;
    }

    const postablePayload = cloneForUnityPreview(payload);
    rewriteUnityPreviewUrls(
      postablePayload,
      proxyOrigin.value,
      assetBaseOrigin.value
    );
    const sent = dialog.postMessage(
      {
        type: "xrugc-load-scene-json",
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
      if (visible.value) {
        status.value = "Unity 已接收场景数据，若画面为空请刷新运行器或重新打包";
      }
    }, 15000);
    logger.log(
      "[UnityPreview] scene payload sent",
      summarizeUnityPreviewPayload(postablePayload)
    );
  };

  const postCameraMode = () => {
    const dialog = dialogRef.value;
    if (!dialog) return;

    const mode = panMode.value ? "pan" : "orbit";
    dialog.postMessage(
      {
        type: "unity-web-preview-camera-mode",
        mode,
      },
      targetOrigin.value
    );
    logger.log("[UnityPreview] camera mode sent", mode);
  };

  const send = async () => {
    await ensureRuntimeData?.();
    const payload = await buildPayload();
    pendingPayload.value = payload;
    hasPendingPayload.value = true;
    postPayload(payload);
  };

  const handleMessage = (event: MessageEvent) => {
    if (!dialogRef.value?.isFrameSource(event.source)) return;
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "unity-web-preview-ready") {
      ready.value = true;
      status.value = "Unity 已就绪，正在发送场景...";
      if (hasPendingPayload.value) {
        postPayload(pendingPayload.value);
      } else {
        void send();
      }
      postCameraMode();
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

    await ensureRuntimeData?.();
    pendingPayload.value = await buildPayload();
    hasPendingPayload.value = true;
    panMode.value = false;
    status.value = ready.value
      ? "Unity 已就绪，正在发送场景..."
      : initialStatus;
    frameVisible.value = true;
    visible.value = true;
    if (ready.value) {
      postPayload(pendingPayload.value);
      postCameraMode();
    }
  };

  const handleClosed = () => {
    clearRunningFallbackTimer();
    panMode.value = false;
    status.value = initialStatus;
  };

  onMounted(() => {
    window.addEventListener("message", handleMessage);
  });

  onBeforeUnmount(() => {
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
