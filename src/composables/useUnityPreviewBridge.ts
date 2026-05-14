import { computed, onActivated, onBeforeUnmount, onMounted, ref } from "vue";
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

const dialogRef = ref<UnityPreviewDialogExpose | null>(null);
const visible = ref(false);
const frameVisible = ref(false);
const ready = ref(false);
const status = ref(initialStatus);
const frameKey = ref(0);
const panMode = ref(false);
const pendingPayload = ref<unknown>(null);
const hasPendingPayload = ref(false);

let activeOptions: UseUnityPreviewBridgeOptions | null = null;
let pendingOptions: UseUnityPreviewBridgeOptions | null = null;
let runningFallbackTimer: number | undefined;

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

const notifyActiveError = (message: string) => {
  if (activeOptions) {
    activeOptions.notifyError(message);
    return;
  }

  logger.warn("[UnityPreview]", message);
};

const postPayload = (
  payload: unknown,
  notifyError: (message: string) => void = notifyActiveError
) => {
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

const sendWithOptions = async (
  options: UseUnityPreviewBridgeOptions | null
) => {
  if (!options) {
    notifyActiveError("Unity 预览上下文尚未初始化");
    return;
  }

  await options.ensureRuntimeData?.();
  const payload = await options.buildPayload();
  pendingPayload.value = payload;
  hasPendingPayload.value = true;
  postPayload(payload, options.notifyError);
};

const send = () => sendWithOptions(pendingOptions ?? activeOptions);

const handleMessage = (event: MessageEvent) => {
  if (!dialogRef.value?.isFrameSource(event.source)) return;
  if (!event.data || typeof event.data !== "object") return;

  if (event.data.type === "unity-web-preview-ready") {
    ready.value = true;
    status.value = "Unity 已就绪，正在发送场景...";
    if (visible.value && pendingOptions) {
      void sendWithOptions(pendingOptions);
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

const openWithOptions = async (options: UseUnityPreviewBridgeOptions) => {
  activeOptions = options;
  const openResult = options.canOpen?.() ?? true;
  if (openResult !== true) {
    options.notifyError(openResult);
    return;
  }

  pendingOptions = options;
  pendingPayload.value = null;
  hasPendingPayload.value = false;
  panMode.value = false;
  status.value = ready.value ? "Unity 已就绪，正在发送场景..." : initialStatus;
  frameVisible.value = true;
  visible.value = true;
  if (ready.value) {
    await sendWithOptions(options);
    postCameraMode();
  }
};

const handleClosed = () => {
  clearRunningFallbackTimer();
  pendingOptions = null;
  panMode.value = false;
  status.value = ready.value ? "Unity 已就绪" : initialStatus;
};

export const useUnityPreviewHost = () => {
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
    send,
    handleLoad,
    handleClosed,
  };
};

export const useUnityPreviewBridge = (
  options: UseUnityPreviewBridgeOptions
) => {
  const activate = () => {
    activeOptions = options;
  };

  onMounted(activate);
  onActivated(activate);

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
    open: () => openWithOptions(options),
    send,
    handleLoad,
    handleClosed,
  };
};
