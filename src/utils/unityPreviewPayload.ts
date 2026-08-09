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
const UNITY_PREVIEW_MRPP_COS_HOST =
  "mrpp-1257979353.cos.ap-chengdu.myqcloud.com";
const UNITY_PREVIEW_ASSET_ORIGINS = new Set([
  `https://${UNITY_PREVIEW_LEGACY_COS_HOST}`,
  `https://${UNITY_PREVIEW_CDN_HOST}`,
  `https://${UNITY_PREVIEW_MRPP_COS_HOST}`,
]);

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

const isUnityPreviewLoopback = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const isUnityPreviewLocalDevelopment = (): boolean =>
  isUnityPreviewLoopback(window.location.hostname);

const readUnityPreviewOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const unwrapLegacyUnityPreviewProxyUrl = (
  value: string,
  legacyProxyOrigin: string
): string => {
  try {
    const url = new URL(value, legacyProxyOrigin);
    if (url.pathname !== "/__xrugc_proxy__") return value;
    return url.searchParams.get("url") || value;
  } catch {
    return value;
  }
};

const normalizeLegacyUnityPreviewAssetUrl = (value: string): string => {
  if (!/^(?:https?:)?\/\//i.test(value)) return value;

  try {
    const parsed = value.startsWith("//")
      ? new URL(`${window.location.protocol}${value}`)
      : new URL(value);
    if (
      parsed.hostname !== UNITY_PREVIEW_LEGACY_COS_HOST ||
      parsed.username ||
      parsed.password
    ) {
      return value;
    }

    // Replace only the scheme/authority. Keeping the remainder byte-for-byte
    // preserves signed query ordering, repeated parameters and percent escapes.
    const remainder = value.replace(/^(?:https?:)?\/\/[^/?#]*/i, "");
    return `https://${UNITY_PREVIEW_CDN_HOST}${remainder}`;
  } catch {
    return value;
  }
};

const toUnityPreviewDirectAssetUrl = (
  value: string,
  legacyProxyOrigin: string,
  assetBaseOrigin: string
): string => {
  const normalizedValue = value.replace(/\\\//g, "/");
  const candidate = normalizeLegacyUnityPreviewAssetUrl(
    unwrapLegacyUnityPreviewProxyUrl(normalizedValue, legacyProxyOrigin)
  );
  const explicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate);
  if (explicitScheme && !/^https?:\/\//i.test(candidate)) {
    throw new Error("WGP-ASSET-DENIED");
  }
  const absoluteUrl = /^(?:https?:)?\/\//i.test(candidate);
  if (!absoluteUrl && !candidate.startsWith("/")) {
    return value;
  }
  // Relative strings need an asset-shaped path before being interpreted as a
  // URL. Absolute URLs are always origin-checked, regardless of extension.
  if (!absoluteUrl && !UNITY_PREVIEW_ASSET_PATH_RE.test(candidate)) {
    return value;
  }

  let url: URL;
  try {
    url = candidate.startsWith("//")
      ? new URL(`${window.location.protocol}${candidate}`)
      : new URL(candidate, assetBaseOrigin);
  } catch {
    return value;
  }

  const assetBase = readUnityPreviewOrigin(assetBaseOrigin);
  const allowedOrigins = new Set(UNITY_PREVIEW_ASSET_ORIGINS);
  if (assetBase) allowedOrigins.add(assetBase);
  const localDevelopment =
    isUnityPreviewLocalDevelopment() &&
    url.protocol === "http:" &&
    isUnityPreviewLoopback(url.hostname);
  if (
    (url.protocol !== "https:" && !localDevelopment) ||
    (!allowedOrigins.has(url.origin) && !localDevelopment) ||
    url.username ||
    url.password
  ) {
    throw new Error("WGP-ASSET-DENIED");
  }

  // Preserve validated absolute URLs byte-for-byte so signed query ordering
  // and percent-encoding are not changed by URL serialization.
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith("//")) return `${url.protocol}${candidate}`;
  return url.toString();
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      // Fall through to plain text URL replacement.
    }
    if (parsed !== undefined) {
      // Keep recursive validation outside the JSON parse catch. A denied URL
      // must propagate instead of falling back to the original encoded text.
      rewriteUnityPreviewUrls(parsed, proxyOrigin, assetBaseOrigin);
      return JSON.stringify(parsed);
    }
  }

  const direct = toUnityPreviewDirectAssetUrl(
    value,
    proxyOrigin,
    assetBaseOrigin
  );
  if (direct !== value) {
    return direct;
  }

  return value.replace(/https?:\\?\/\\?\/[^\s"'<>]+/gi, (url) =>
    toUnityPreviewDirectAssetUrl(url, proxyOrigin, assetBaseOrigin)
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
