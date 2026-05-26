/*
function mrpp(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function mrcn(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "01xr.com" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
}*/

/*
function title(): string {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes("mrpp.com")) {
    return "不加班官方网站";
  }
  if (hostname.includes("01xr.com")) {
    return "不加班官方网站";
  }
  if (hostname.includes("hololens2.cn")) {
    return "上海不加班网络科技";
  }
  if (hostname.includes("bujiaban.com")) {
    return "不加班AR编程";
  }
  if (hostname.includes("localhost")) {
    return "不加班AR编程";
  }
  if (hostname.includes("7dgame.com")) {
    return "不加班官方网站";
  }
  return ""; // Fallback to domainStore.author
}
*/

const productionUnityPreviewUrl = "/webgl-preview/embed.html";
const developUnityPreviewUrl = "/webgl-preview/embed.html";

const getRuntimeEnv = () =>
  (window as unknown as { __ENV__?: Record<string, string | undefined> })
    .__ENV__ || {};

type DeploymentMode = "cloud" | "local";
type FileStorageDriver = "cos" | "local";

export interface RuntimeDeploymentConfig {
  deploymentMode?: string;
  storageDriver?: string;
  storage?: {
    publicBaseUrl?: string;
    publicBucket?: string;
    privateBucket?: string;
    tempBucket?: string;
  };
  features?: Record<string, boolean | undefined>;
}

let runtimeDeploymentConfig: RuntimeDeploymentConfig | null = null;
let runtimeDeploymentConfigFailed = false;

const normalizeDeploymentMode = (
  value: string | undefined
): DeploymentMode | null => {
  const mode = value?.trim().toLowerCase();
  if (mode === "local" || mode === "private") return "local";
  if (mode === "cloud") return "cloud";
  return null;
};

const normalizeFileStorageDriver = (
  value: string | undefined
): FileStorageDriver | null => {
  const driver = value?.trim().toLowerCase();
  if (driver === "local") return "local";
  if (driver === "cos" || driver === "cloud") return "cos";
  return null;
};

const resolveApiBase = () =>
  import.meta.env.DEV ? import.meta.env.VITE_APP_API_URL || "" : "/api";

const deploymentConfigEndpoint = () => {
  const apiBase = resolveApiBase().replace(/\/+$/, "");
  return `${apiBase}/v1/system/deployment`;
};

const hasExplicitStorageDriver = () =>
  Boolean(
    normalizeFileStorageDriver(getRuntimeEnv().FILE_STORAGE_DRIVER) ||
      normalizeFileStorageDriver(getRuntimeEnv().VITE_APP_FILE_STORAGE_DRIVER) ||
      normalizeFileStorageDriver(import.meta.env.VITE_APP_FILE_STORAGE_DRIVER)
  );

const hasExplicitDeploymentMode = () =>
  Boolean(
    normalizeDeploymentMode(getRuntimeEnv().DEPLOYMENT_MODE) ||
      normalizeDeploymentMode(getRuntimeEnv().VITE_APP_DEPLOYMENT_MODE) ||
      normalizeDeploymentMode(import.meta.env.VITE_APP_DEPLOYMENT_MODE)
  );

const resolveDeploymentMode = (): DeploymentMode =>
  normalizeDeploymentMode(runtimeDeploymentConfig?.deploymentMode) ||
  normalizeDeploymentMode(getRuntimeEnv().DEPLOYMENT_MODE) ||
  normalizeDeploymentMode(getRuntimeEnv().VITE_APP_DEPLOYMENT_MODE) ||
  normalizeDeploymentMode(import.meta.env.VITE_APP_DEPLOYMENT_MODE) ||
  (runtimeDeploymentConfigFailed && !hasExplicitDeploymentMode()
    ? "local"
    : null) ||
  (import.meta.env.VITE_APP_BASE_MODE === "local" ? "local" : "cloud");

const resolveFileStorageDriver = (): FileStorageDriver =>
  normalizeFileStorageDriver(runtimeDeploymentConfig?.storageDriver) ||
  normalizeFileStorageDriver(getRuntimeEnv().FILE_STORAGE_DRIVER) ||
  normalizeFileStorageDriver(getRuntimeEnv().VITE_APP_FILE_STORAGE_DRIVER) ||
  normalizeFileStorageDriver(import.meta.env.VITE_APP_FILE_STORAGE_DRIVER) ||
  (resolveDeploymentMode() === "local" ? "local" : "cos");

export const setRuntimeDeploymentConfig = (
  config: RuntimeDeploymentConfig | null
) => {
  runtimeDeploymentConfig = config;
  runtimeDeploymentConfigFailed = false;
};

export const clearRuntimeDeploymentConfig = () => {
  runtimeDeploymentConfig = null;
  runtimeDeploymentConfigFailed = false;
};

export const deploymentConfigLoadFailed = () => runtimeDeploymentConfigFailed;

export async function initializeDeploymentConfig(
  fetcher: typeof fetch = window.fetch.bind(window)
): Promise<RuntimeDeploymentConfig | null> {
  try {
    const response = await fetcher(deploymentConfigEndpoint(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Deployment config request failed: ${response.status}`);
    }

    const config = (await response.json()) as RuntimeDeploymentConfig;
    setRuntimeDeploymentConfig(config);
    return config;
  } catch (error) {
    runtimeDeploymentConfig = null;
    runtimeDeploymentConfigFailed = true;
    console.warn("[deployment] Failed to load runtime deployment config", error);
    return null;
  }
}

const featureEnabled = (name: string, defaultValue: boolean) => {
  const value = runtimeDeploymentConfig?.features?.[name];
  return typeof value === "boolean" ? value : defaultValue;
};

const isDevelopHost = () => {
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname.includes(".dev.xrugc.com") || hostname.includes(".d.xrugc.com")
  );
};

const resolveUnityPreviewUrl = () => {
  const configuredUrl =
    getRuntimeEnv().UNITY_PREVIEW_URL ||
    import.meta.env.VITE_APP_UNITY_PREVIEW_URL ||
    "";

  if (
    isDevelopHost() &&
    (!configuredUrl || configuredUrl === productionUnityPreviewUrl)
  ) {
    return developUnityPreviewUrl;
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  return productionUnityPreviewUrl;
};

const environment = {
  api: resolveApiBase(),
  config_api: "/api-config/api",
  doc: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOC_API || ""
    : "/api-doc",
  blockly:
    (window as unknown as Record<string, Record<string, string>>).__ENV__
      ?.BLOCKLY_URL ||
    import.meta.env.VITE_APP_BLOCKLY_URL ||
    "",
  editor:
    (window as unknown as Record<string, Record<string, string>>).__ENV__
      ?.EDITOR_URL ||
    import.meta.env.VITE_APP_EDITOR_URL ||
    "",
  unityPreview: resolveUnityPreviewUrl(),
  domain_info: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOMAIN_INFO_API_URL || ""
    : "/api-domain",
  version: 1,
  buildVersion: import.meta.env.VITE_DEV_DATE || Date.now().toString(),
  subtitle: () => "支持Rokid设备",
  deploymentMode: resolveDeploymentMode,
  fileStorageDriver: resolveFileStorageDriver,
  featureEnabled,
  useCloud: () =>
    runtimeDeploymentConfigFailed && !hasExplicitStorageDriver()
      ? false
      : resolveFileStorageDriver() !== "local",
  local: () => resolveDeploymentMode() === "local",
  /** 替换 API URL 中的 IP（兼容旧代码，目前直接返回原 URL） */
  replaceIP: (url: string) => url,
};

export default environment;
