import { logger } from "@/utils/logger";
import {
  extractUnityPreviewLuaActions,
  normalizeUnityPreviewMetaLua,
  readUnityPreviewMetaLuaCode,
} from "@/utils/unityPreviewLua";

export const UNITY_PREVIEW_VERSE_EXPAND =
  "id,name,description,data,metas,metas.code,metas.metaCode,resources,code,uuid,verseCode";

const UNITY_PREVIEW_ASSET_PATH_RE =
  /\.(?:png|jpe?g|gif|webp|bmp|svg|mp3|wav|ogg|m4a|mp4|webm|glb|gltf|fbx|obj|vox)(?:[?#]|$)/i;
const UNITY_PREVIEW_LEGACY_COS_HOST =
  "7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com";
const UNITY_PREVIEW_CDN_HOST = "data.7dgame.com";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const cloneForUnityPreview = (value: unknown): unknown => {
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }
};

export const normalizeUnityPreviewData = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return cloneForUnityPreview(value);
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeUnityPreviewRemoteAssetUrl = (value: string): string => {
  try {
    const url = new URL(value.replace(/\\\//g, "/"));
    const originalUrl = url.toString();
    let changed = false;

    if (url.protocol === "http:") {
      url.protocol = "https:";
      changed = true;
    }

    if (url.hostname === UNITY_PREVIEW_LEGACY_COS_HOST) {
      url.protocol = "https:";
      url.hostname = UNITY_PREVIEW_CDN_HOST;
      changed = true;
    }

    const normalizedUrl = url.toString();
    if (changed) {
      logger.log("[WebPreview][Payload] normalize asset url", {
        url: originalUrl,
        normalizedUrl,
      });
    }

    return normalizedUrl;
  } catch {
    return value;
  }
};

const toUnityPreviewProxyUrl = (
  value: string,
  proxyOrigin: string,
  assetBaseOrigin: string
): string => {
  const normalizedValue = value.replace(/\\\//g, "/");
  if (!/^https?:\/\//i.test(normalizedValue)) {
    if (normalizedValue.startsWith("//")) {
      const absoluteUrl = normalizeUnityPreviewRemoteAssetUrl(
        `${window.location.protocol}${normalizedValue}`
      );
      return `${proxyOrigin}/__xrugc_proxy__?url=${encodeURIComponent(
        absoluteUrl
      )}`;
    }

    if (
      normalizedValue.startsWith("/__xrugc_proxy__") ||
      normalizedValue.startsWith("\\/__xrugc_proxy__")
    ) {
      return `${proxyOrigin}${normalizedValue.replace(/^\\\//, "/")}`;
    }

    if (
      !normalizedValue.startsWith("/") ||
      !UNITY_PREVIEW_ASSET_PATH_RE.test(normalizedValue)
    ) {
      return value;
    }

    const absoluteUrl = new URL(normalizedValue, assetBaseOrigin).toString();
    const normalizedAssetUrl = normalizeUnityPreviewRemoteAssetUrl(absoluteUrl);
    logger.log("[WebPreview][Payload] proxy relative asset url", {
      url: normalizedValue,
      absoluteUrl: normalizedAssetUrl,
    });

    return `${proxyOrigin}/__xrugc_proxy__?url=${encodeURIComponent(
      normalizedAssetUrl
    )}`;
  }

  try {
    const url = new URL(normalizedValue);
    if (url.pathname === "/__xrugc_proxy__") {
      return `${proxyOrigin}${url.pathname}${url.search}`;
    }

    if (url.origin === proxyOrigin) {
      return normalizedValue;
    }
  } catch {
    return value;
  }

  const normalizedAssetUrl =
    normalizeUnityPreviewRemoteAssetUrl(normalizedValue);
  return `${proxyOrigin}/__xrugc_proxy__?url=${encodeURIComponent(
    normalizedAssetUrl
  )}`;
};

const rewriteUnityPreviewStringUrls = (
  value: string,
  proxyOrigin: string,
  assetBaseOrigin: string
): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    trimmed.length >= 2
  ) {
    try {
      const parsed = JSON.parse(value);
      rewriteUnityPreviewUrls(parsed, proxyOrigin, assetBaseOrigin);
      return JSON.stringify(parsed);
    } catch {
      // Fall through to plain text URL replacement.
    }
  }

  const proxied = toUnityPreviewProxyUrl(value, proxyOrigin, assetBaseOrigin);
  if (proxied !== value) {
    return proxied;
  }

  return value.replace(/https?:\\?\/\\?\/[^\s"'<>]+/gi, (url) =>
    toUnityPreviewProxyUrl(url, proxyOrigin, assetBaseOrigin)
  );
};

export const rewriteUnityPreviewUrls = (
  value: unknown,
  proxyOrigin: string,
  assetBaseOrigin: string
): void => {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string") {
        value[index] = rewriteUnityPreviewStringUrls(
          item,
          proxyOrigin,
          assetBaseOrigin
        );
      } else {
        rewriteUnityPreviewUrls(item, proxyOrigin, assetBaseOrigin);
      }
    });
    return;
  }

  const record = value as Record<string, unknown>;
  Object.entries(record).forEach(([key, item]) => {
    if (typeof item === "string") {
      record[key] = rewriteUnityPreviewStringUrls(
        item,
        proxyOrigin,
        assetBaseOrigin
      );
    } else {
      rewriteUnityPreviewUrls(item, proxyOrigin, assetBaseOrigin);
    }
  });
};

export const normalizeUnityPreviewMetas = (metas: unknown): unknown[] => {
  if (!Array.isArray(metas)) return [];

  return metas.map((meta) => {
    const cloned = cloneForUnityPreview(meta);
    const record = isRecord(cloned) ? cloned : {};
    const code = readUnityPreviewMetaLuaCode(record);
    const normalizedCode = normalizeUnityPreviewMetaLua(code);
    return {
      ...record,
      code: normalizedCode,
      script: normalizedCode,
      prefab: record.prefab ?? record.prefabs ?? 0,
    };
  });
};

export const summarizeUnityPreviewPayload = (payload: unknown) => {
  const record = isRecord(payload) ? payload : {};
  const scene = isRecord(record.scene) ? record.scene : {};
  const script = isRecord(record.script) ? record.script : {};
  const metas = Array.isArray(record.metas) ? record.metas : [];

  return {
    sceneId: scene.id ?? record.sceneId ?? record.id,
    sceneName: scene.name ?? record.title ?? record.name,
    resources: Array.isArray(record.resources) ? record.resources.length : 0,
    metas: metas.length,
    luaLength: typeof script.lua === "string" ? script.lua.length : 0,
    luaActions: extractUnityPreviewLuaActions(script.lua),
    metaActions: metas.slice(0, 12).map((meta, index) => {
      const metaRecord = isRecord(meta) ? meta : {};
      const code = readUnityPreviewMetaLuaCode(metaRecord);
      return {
        index,
        id: metaRecord.id,
        title: metaRecord.title ?? metaRecord.name,
        codeLength: typeof code === "string" ? code.length : 0,
        actions: extractUnityPreviewLuaActions(code),
      };
    }),
    javascriptLength:
      typeof script.javascript === "string" ? script.javascript.length : 0,
  };
};

export const readUnityPreviewVerseCode = (
  runtimeData: unknown,
  language: "lua" | "javascript"
): string => {
  const record: Record<string, unknown> = isRecord(runtimeData)
    ? runtimeData
    : {};
  const verseCode: Record<string, unknown> = isRecord(record.verseCode)
    ? record.verseCode
    : {};
  const code: Record<string, unknown> = isRecord(record.code)
    ? record.code
    : {};
  const key = language === "javascript" ? "js" : "lua";
  const candidates = [
    verseCode[key],
    code[key],
    record[key],
    language === "javascript" ? record.javascript : undefined,
    typeof record.code === "string" ? record.code : undefined,
  ];
  const found = candidates.find((item) => typeof item === "string");
  return typeof found === "string" ? found : "";
};
