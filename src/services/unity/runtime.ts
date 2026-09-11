export type UnityRuntimeStage =
  | "closed"
  | "preparing"
  | "downloading_runtime"
  | "initializing_runtime"
  | "loading_scene"
  | "running"
  | "stopping"
  | "error";

export type UnityRuntimeProgress = {
  kind: "bytes" | "fraction" | "indeterminate";
  loaded?: number;
  total?: number;
  value?: number;
  cached?: boolean;
  unit?: "decoded-response-bytes" | "transfer-bytes" | "unity-loader-callback";
  artifact?: "data" | "framework" | "wasm" | "loader";
};

export type UnityRuntimeFailure = {
  code: string;
  stage: UnityRuntimeStage;
  message: string;
  asset?: { field: string; origin: string | null; reason: string };
};

export type UnityRuntimeRelease = {
  protocolVersion: 1;
  runtimeReleaseId: string;
  buildId: string;
  entrypoint: string;
};

export type UnityRuntimeViewState = {
  stage: UnityRuntimeStage;
  status: string;
  progress: UnityRuntimeProgress;
  failure: UnityRuntimeFailure | null;
  sessionId: string | null;
  runtimeReleaseId: string | null;
  buildId: string | null;
  evidence: { kind: string } | null;
  elapsedSeconds: number;
};

export const unityRuntimeStageLabels: Record<UnityRuntimeStage, string> = {
  closed: "预览已关闭",
  preparing: "正在准备场景与运行器版本",
  downloading_runtime: "正在下载 Unity 运行文件",
  initializing_runtime: "正在初始化 Unity",
  loading_scene: "正在加载场景资源与脚本，等待运行确认",
  running: "场景已在 Unity 中运行",
  stopping: "正在停止 Unity 并释放资源",
  error: "Unity 运行预览失败",
};

export const unityRuntimeFailures: Record<string, string> = {
  RUNTIME_METADATA_FAILED:
    "无法读取主站内置运行器版本，请检查静态文件部署后重试",
  RUNTIME_METADATA_INVALID: "主站运行器版本信息无效，请检查部署制品",
  PREPARATION_TIMEOUT: "场景准备超时，请检查网络后重试",
  UNITY_DOWNLOAD_STALLED: "Unity 下载长时间没有进展，请检查网络后重试",
  DOWNLOAD_STALLED: "Unity 下载长时间没有进展，请检查网络后重试",
  INITIALIZATION_TIMEOUT: "Unity 初始化超时，请查看浏览器和运行器诊断后重试",
  UNITY_SCENE_CONFIRMATION_TIMEOUT:
    "未收到明确的场景运行确认；资源或脚本可能仍未完成",
  SCENE_CONFIRMATION_TIMEOUT:
    "未收到明确的场景运行确认；资源或脚本可能仍未完成",
  SCENE_PAYLOAD_FAILED: "场景数据准备失败，请刷新场景数据后重试",
  SCENE_ASSET_ORIGIN_DENIED:
    "当前运行器仅支持 HTTPS 资源来源 data.7dgame.com、7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com、mrpp-1257979353.cos.ap-chengdu.myqcloud.com；localhost、独立 API 和其他来源暂不支持，不会自动转发登录凭据。",
  SCENE_FORWARD_FAILED: "场景数据未能传入 Unity，请重试",
  UNITY_LOAD_FAILED: "Unity 运行文件加载失败，请检查部署与网络",
  "WGP-UNITY-LOADER": "Unity 加载器无法加载，请检查部署制品",
  "WGP-UNITY-START": "Unity 初始化失败，请检查运行器诊断",
  "WGP-UNITY-TIMEOUT": "Unity 初始化超时，请重试",
  "WGP-SERVICE-WORKER": "运行器资源适配服务未能启动，请检查安全连接与部署",
  "WGP-CACHE-MISMATCH": "Unity 缓存校验失败，请重试或清理运行器缓存",
  UNITY_RUNTIME_ERROR: "Unity 运行发生错误，请查看运行诊断后重试",
  "WGP-BUILD-MANIFEST": "运行器构建清单校验失败，请检查部署制品",
  RUNTIME_ERROR: "运行器报告错误，请查看运行诊断后重试",
};

export const readUnityRuntimeRelease = async (
  signal: AbortSignal
): Promise<UnityRuntimeRelease> => {
  const response = await fetch("/webgl-preview/active.json", {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "error",
    signal,
  }).catch(() => {
    throw new Error("RUNTIME_METADATA_FAILED");
  });
  if (!response.ok) throw new Error("RUNTIME_METADATA_FAILED");
  const value: unknown = await response.json().catch(() => {
    throw new Error("RUNTIME_METADATA_INVALID");
  });
  if (!value || typeof value !== "object")
    throw new Error("RUNTIME_METADATA_INVALID");
  const release = value as UnityRuntimeRelease;
  if (
    release.protocolVersion !== 1 ||
    typeof release.runtimeReleaseId !== "string" ||
    !/^[a-f0-9]{24}$/.test(release.runtimeReleaseId) ||
    typeof release.buildId !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(release.buildId) ||
    release.entrypoint !==
      `/webgl-preview/releases/${release.runtimeReleaseId}/embed.html`
  )
    throw new Error("RUNTIME_METADATA_INVALID");
  return {
    protocolVersion: 1,
    runtimeReleaseId: release.runtimeReleaseId,
    buildId: release.buildId,
    entrypoint: release.entrypoint,
  };
};

/** Accept measurements only. Scene loading without measurements stays indeterminate. */
export const readUnityRuntimeProgress = (
  value: unknown
): UnityRuntimeProgress => {
  if (!value || typeof value !== "object") return { kind: "indeterminate" };
  const progress = value as UnityRuntimeProgress;
  const cached = progress.cached === true;
  const unit = [
    "decoded-response-bytes",
    "transfer-bytes",
    "unity-loader-callback",
  ].includes(progress.unit ?? "")
    ? progress.unit
    : undefined;
  const artifact = ["data", "framework", "wasm", "loader"].includes(
    progress.artifact ?? ""
  )
    ? progress.artifact
    : undefined;
  if (
    progress.kind === "bytes" &&
    Number.isFinite(progress.loaded) &&
    Number.isFinite(progress.total) &&
    progress.loaded! >= 0 &&
    progress.total! > 0 &&
    progress.loaded! <= progress.total!
  )
    return {
      kind: "bytes",
      loaded: progress.loaded,
      total: progress.total,
      cached,
      unit,
      artifact,
    };
  if (
    progress.kind === "fraction" &&
    Number.isFinite(progress.value) &&
    progress.value! >= 0 &&
    progress.value! <= 1
  )
    return { kind: "fraction", value: progress.value, cached, unit };
  return { kind: "indeterminate", cached, unit, artifact };
};
