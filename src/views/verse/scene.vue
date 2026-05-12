<template>
  <div class="verse-scene">
    <KnightDataDialog ref="knightDataRef"></KnightDataDialog>
    <MetaDialog @selected="selected" ref="metaDialogRef"></MetaDialog>
    <!--<PrefabDialog @selected="selected" ref="prefabDialogRef"></PrefabDialog>-->
    <el-container>
      <el-main style="padding: 0; overflow: hidden">
        <iframe
          :key="editorFrameKey"
          id="editor"
          ref="editor"
          :src="src"
          class="content"
          height="100%"
          width="100%"
          allow="xr-spatial-tracking; fullscreen; autoplay; clipboard-read; clipboard-write;"
        ></iframe>
      </el-main>
    </el-container>
    <ScriptDraftDialog
      :model-value="versionDialogVisible"
      :versions="draftVersions"
      :auto-save-enabled="autoSaveEnabled"
      :auto-save-interval-seconds="autoSaveIntervalSeconds"
      @update:model-value="versionDialogVisible = $event"
      @update:auto-save-enabled="autoSaveEnabled = $event"
      @update:auto-save-interval-seconds="autoSaveIntervalSeconds = $event"
      @clear-history="clearDraftHistory"
      @restore="restoreDraftVersion"
    ></ScriptDraftDialog>
    <el-dialog
      v-model="unityPreviewVisible"
      width="min(1120px, calc(100vw - 64px))"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      class="unity-preview-dialog"
      @closed="handleUnityPreviewClosed"
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="unity-preview-header">
          <div class="unity-preview-title-wrap">
            <span :id="titleId" :class="titleClass">{{
              t("common.unityPreview.title")
            }}</span>
            <el-tooltip
              effect="dark"
              placement="bottom-start"
              popper-class="unity-preview-help-tooltip"
            >
              <template #content>
                <div class="unity-preview-help">
                  <div>{{ t("common.unityPreview.helpClick") }}</div>
                  <div>{{ t("common.unityPreview.helpRotate") }}</div>
                  <div>{{ t("common.unityPreview.helpZoomPan") }}</div>
                  <div>{{ t("common.unityPreview.helpFullscreen") }}</div>
                </div>
              </template>
              <el-icon class="unity-preview-help-icon">
                <QuestionFilled></QuestionFilled>
              </el-icon>
            </el-tooltip>
          </div>
          <div class="unity-preview-header-actions">
            <button
              class="unity-preview-header-button"
              type="button"
              :aria-label="t('common.unityPreview.fullscreen')"
              @click="toggleUnityPreviewFullscreen"
            >
              <el-icon><FullScreen></FullScreen></el-icon>
            </button>
            <button
              class="unity-preview-header-button"
              type="button"
              :aria-label="t('common.unityPreview.close')"
              @click="close"
            >
              <el-icon><Close></Close></el-icon>
            </button>
          </div>
        </div>
      </template>
      <div ref="unityPreviewFrameWrap" class="unity-preview-frame-wrap">
        <iframe
          v-if="unityPreviewFrameVisible"
          :key="unityPreviewFrameKey"
          ref="unityPreviewFrame"
          class="unity-preview-frame"
          :src="unityPreviewSrc"
          allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
          @load="handleUnityPreviewLoad"
        ></iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { takePhoto } from "@/api/v1/verse";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
//import PrefabDialog from "@/components/MrPP/PrefabDialog.vue";
import MetaDialog from "@/components/MrPP/MetaDialog.vue";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import { Message } from "@/components/Dialog";
import {
  putVerse,
  getVerse,
  type meta,
  type VerseData,
  type VerseMetasWithJsCode,
} from "@/api/v1/verse";
import type { JsonValue } from "@/api/v1/types/common";
import { getPrefab } from "@/api/v1/prefab";
import { useAppStore } from "@/store/modules/app";
import { useUserStore } from "@/store/modules/user";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment";
import { useFileStore } from "@/store/modules/config";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import type {
  ScriptDraftVersion,
  ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import { useIframeMessaging } from "@/composables/useIframeMessaging";
import { useSceneSaveGuard } from "@/composables/useSceneSaveGuard";
import { VERSE_SCENE_EXPAND, buildVerseEditorInitConfig } from "./sceneSpace";
import { Close, FullScreen, QuestionFilled } from "@element-plus/icons-vue";
import {
  extractUnityPreviewLuaActions,
  normalizeUnityPreviewMetaLua,
  normalizeUnityPreviewVerseLua,
  readUnityPreviewMetaJavaScriptCode,
  readUnityPreviewMetaLuaCode,
} from "@/utils/unityPreviewLua";

// 组件状态
const userStore = useUserStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const editor = ref<HTMLIFrameElement>();
import qs from "querystringify";
let init = false;
const saveable = ref(false);
let unsavedCheckPollingTimer: number | null = null;
const editorFrameKey = ref(0);
const isRestoringDraft = ref(false);
const versionDialogVisible = ref(false);
const draftVersions = ref<ScriptDraftVersion[]>([]);
const autoSaveEnabled = ref(true);
const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 300;
const DRAFT_SETTINGS_VERSION = 2;
const autoSaveIntervalSeconds = ref(DEFAULT_AUTO_SAVE_INTERVAL_SECONDS);
const isSavingVersion = ref(false);
const lastSaveTrigger = ref<ScriptSaveTrigger | null>(null);
const lastSavedAt = ref<string | null>(null);
const pendingRestorePayload = ref<VerseEditorPayload | null>(null);
let currentSaveTrigger: ScriptSaveTrigger = "manual";
let autoSaveTimer: number | null = null;

const toolbarOwner = "verse-scene-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();
const toolbarStatus = computed<EditorToolbarStatus>(() => {
  if (isSavingVersion.value) return "saving";
  if (pendingRestorePayload.value || hasUnsavedChangesBeforeUnload.value) {
    return "dirty";
  }
  if (lastSaveTrigger.value === "auto" && lastSavedAt.value) {
    return "autosaved";
  }
  return "saved";
});

const safeClone = <T,>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
};

const buildSceneDraftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `scene-draft:verse:${id.value}` : null
);

const buildSceneDraftSettingsKey = computed(() =>
  buildSceneDraftStorageKey.value
    ? `${buildSceneDraftStorageKey.value}:settings`
    : null
);

// 对话框引用
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>();
//const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();

const decodeRouteText = (value: string): string => {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
};

// 计算属性
const title = computed(() => {
  const decodedTitle = decodeRouteText((route.query.title as string) || "");
  const match = decodedTitle.match(/【(.*?)】/);
  return match ? match[0] : "";
});

const id = computed(() => parseInt(route.query.id as string));

const src = computed(() => {
  const query: Record<string, string | number> = {
    language: appStore.language,
    v: env.buildVersion,
    api: env.api,
  };

  const url =
    `${env.editor}/three.js/editor/verse-editor.html` +
    qs.stringify(query, true);

  return url;
});

const unityPreviewVisible = ref(false);
const unityPreviewFrameVisible = ref(false);
const unityPreviewReady = ref(false);
const unityPreviewStatus = ref("正在加载 Unity 运行器...");
const unityPreviewFrameKey = ref(0);
const unityPreviewFrame = ref<HTMLIFrameElement | null>(null);
const unityPreviewFrameWrap = ref<HTMLElement | null>(null);
const verseMetasWithLuaCodeData = ref<VerseMetasWithJsCode>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const pendingUnityPreviewPayload = ref<unknown>(null);
const unityPreviewPanMode = ref(false);
let unityPreviewRunningFallbackTimer: number | undefined;
const UNITY_PREVIEW_VERSE_EXPAND =
  "id,name,description,data,metas,metas.code,metas.metaCode,resources,code,uuid,verseCode";

const unityPreviewSrc = computed(() => {
  const url = new URL(env.unityPreview, window.location.href);
  url.searchParams.set("embed", "1");
  url.searchParams.set("v", String(unityPreviewFrameKey.value));
  return url.toString();
});

const unityPreviewTargetOrigin = computed(() => {
  try {
    return new URL(env.unityPreview, window.location.href).origin;
  } catch (error) {
    logger.warn(
      "Unity preview url is invalid, falling back to wildcard",
      error
    );
    return "*";
  }
});

const unityPreviewProxyOrigin = computed(() => {
  try {
    const url = new URL(env.unityPreview, window.location.href);
    const host = url.host === "localhost:8080" ? "127.0.0.1:8080" : url.host;
    return `http://${host}`;
  } catch {
    return "http://127.0.0.1:8080";
  }
});

const cloneForPreview = (value: unknown): unknown => {
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

const normalizePreviewData = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return cloneForPreview(value);
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const UNITY_PREVIEW_ASSET_PATH_RE =
  /\.(?:png|jpe?g|gif|webp|bmp|svg|mp3|wav|ogg|m4a|mp4|webm|glb|gltf|fbx|obj|vox)(?:[?#]|$)/i;
const UNITY_PREVIEW_LEGACY_COS_HOST =
  "7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com";
const UNITY_PREVIEW_CDN_HOST = "data.7dgame.com";

const unityPreviewAssetBaseOrigin = (): string => {
  try {
    if (/^https?:\/\//i.test(env.api)) {
      return new URL(env.api).origin;
    }
  } catch {
    // Fall back to the current page origin below.
  }

  return window.location.origin;
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

const toUnityPreviewProxyUrl = (value: string): string => {
  const normalizedValue = value.replace(/\\\//g, "/");
  if (!/^https?:\/\//i.test(normalizedValue)) {
    if (normalizedValue.startsWith("//")) {
      const absoluteUrl = normalizeUnityPreviewRemoteAssetUrl(
        `${window.location.protocol}${normalizedValue}`
      );
      return `${unityPreviewProxyOrigin.value}/__xrugc_proxy__?url=${encodeURIComponent(
        absoluteUrl
      )}`;
    }

    if (
      normalizedValue.startsWith("/__xrugc_proxy__") ||
      normalizedValue.startsWith("\\/__xrugc_proxy__")
    ) {
      return `${unityPreviewProxyOrigin.value}${normalizedValue.replace(
        /^\\\//,
        "/"
      )}`;
    }

    if (
      !normalizedValue.startsWith("/") ||
      !UNITY_PREVIEW_ASSET_PATH_RE.test(normalizedValue)
    ) {
      return value;
    }

    const absoluteUrl = new URL(
      normalizedValue,
      unityPreviewAssetBaseOrigin()
    ).toString();
    const normalizedAssetUrl = normalizeUnityPreviewRemoteAssetUrl(absoluteUrl);
    logger.log("[WebPreview][Payload] proxy relative asset url", {
      url: normalizedValue,
      absoluteUrl: normalizedAssetUrl,
    });

    return `${unityPreviewProxyOrigin.value}/__xrugc_proxy__?url=${encodeURIComponent(
      normalizedAssetUrl
    )}`;
  }

  try {
    const url = new URL(normalizedValue);
    if (url.pathname === "/__xrugc_proxy__") {
      return `${unityPreviewProxyOrigin.value}${url.pathname}${url.search}`;
    }

    if (url.origin === unityPreviewProxyOrigin.value) {
      return normalizedValue;
    }
  } catch {
    return value;
  }

  const normalizedAssetUrl =
    normalizeUnityPreviewRemoteAssetUrl(normalizedValue);
  return `${unityPreviewProxyOrigin.value}/__xrugc_proxy__?url=${encodeURIComponent(
    normalizedAssetUrl
  )}`;
};

const rewriteUnityPreviewStringUrls = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    trimmed.length >= 2
  ) {
    try {
      const parsed = JSON.parse(value);
      rewriteUnityPreviewUrls(parsed);
      return JSON.stringify(parsed);
    } catch {
      // Fall through to plain text URL replacement.
    }
  }

  const proxied = toUnityPreviewProxyUrl(value);
  if (proxied !== value) {
    return proxied;
  }

  return value.replace(/https?:\\?\/\\?\/[^\s"'<>]+/gi, (url) =>
    toUnityPreviewProxyUrl(url)
  );
};

const rewriteUnityPreviewUrls = (value: unknown): void => {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string") {
        value[index] = rewriteUnityPreviewStringUrls(item);
      } else {
        rewriteUnityPreviewUrls(item);
      }
    });
    return;
  }

  const record = value as Record<string, unknown>;
  Object.entries(record).forEach(([key, item]) => {
    if (typeof item === "string") {
      record[key] = rewriteUnityPreviewStringUrls(item);
    } else {
      rewriteUnityPreviewUrls(item);
    }
  });
};

const normalizeUnityPreviewMetas = (metas: unknown): unknown[] => {
  if (!Array.isArray(metas)) return [];

  return metas.map((meta) => {
    const cloned = cloneForPreview(meta);
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

const summarizeUnityPreviewPayload = (payload: unknown) => {
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

const readUnityPreviewVerseCode = (
  runtimeData: VerseMetasWithJsCode | undefined,
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

const ensureUnityPreviewRuntimeData = async () => {
  if (verseMetasWithLuaCodeData.value && verseMetasWithJsCodeData.value) return;
  if (!Number.isFinite(id.value)) return;

  const [responseLua, responseJs] = await Promise.all([
    getVerse(id.value, UNITY_PREVIEW_VERSE_EXPAND, "lua"),
    getVerse(id.value, UNITY_PREVIEW_VERSE_EXPAND, "js"),
  ]);
  verseMetasWithLuaCodeData.value =
    responseLua.data as unknown as VerseMetasWithJsCode;
  verseMetasWithJsCodeData.value =
    responseJs.data as unknown as VerseMetasWithJsCode;
};

const buildUnityPreviewPayload = () => {
  const runtimeData =
    verseMetasWithLuaCodeData.value ?? verseMetasWithJsCodeData.value;
  const scriptJsRuntimeData =
    verseMetasWithJsCodeData.value ?? verseMetasWithLuaCodeData.value;
  const luaCode = readUnityPreviewVerseCode(runtimeData, "lua");
  const jsCode = readUnityPreviewVerseCode(scriptJsRuntimeData, "javascript");
  const metasJavaScriptCode = (
    (scriptJsRuntimeData?.metas ?? []) as unknown as meta[]
  )
    .map((item) => readUnityPreviewMetaJavaScriptCode(item))
    .join("\n");

  return {
    protocolVersion: 1,
    source: "xrugc-web-scene-editor",
    sceneType: "verse",
    scene: {
      id: verse.value?.id ?? id.value,
      uuid: verse.value?.uuid ?? runtimeData?.uuid ?? null,
      name: verse.value?.name ?? runtimeData?.name ?? "",
      description: verse.value?.description ?? runtimeData?.description ?? "",
      data: normalizePreviewData(
        runtimeData?.data ?? verse.value?.data ?? null
      ),
    },
    resources: cloneForPreview(runtimeData?.resources ?? []),
    metas: normalizeUnityPreviewMetas(runtimeData?.metas ?? []),
    script: {
      blockly: null,
      lua: normalizeUnityPreviewVerseLua(luaCode),
      javascript: jsCode,
      metasJavaScript: metasJavaScriptCode,
    },
  };
};

const postUnityPreviewPayload = (payload: unknown) => {
  const targetWindow = unityPreviewFrame.value?.contentWindow;
  if (!targetWindow) {
    ElMessage.error("Unity 运行器尚未加载完成");
    return;
  }

  const postablePayload = cloneForPreview(payload);
  rewriteUnityPreviewUrls(postablePayload);
  targetWindow.postMessage(
    {
      type: "xrugc-load-scene-json",
      payload: postablePayload,
    },
    unityPreviewTargetOrigin.value
  );
  unityPreviewStatus.value = "场景数据已发送到 Unity";
  clearUnityPreviewRunningFallbackTimer();
  unityPreviewRunningFallbackTimer = window.setTimeout(() => {
    if (unityPreviewVisible.value) {
      unityPreviewStatus.value =
        "Unity 已接收场景数据，若画面为空请刷新运行器或重新打包";
    }
  }, 15000);
  logger.log(
    "[UnityPreview] scene payload sent",
    summarizeUnityPreviewPayload(postablePayload)
  );
};

const postUnityPreviewCameraMode = () => {
  const targetWindow = unityPreviewFrame.value?.contentWindow;
  if (!targetWindow) {
    return;
  }

  const mode = unityPreviewPanMode.value ? "pan" : "orbit";
  targetWindow.postMessage(
    {
      type: "unity-web-preview-camera-mode",
      mode,
    },
    unityPreviewTargetOrigin.value
  );
  logger.log("[UnityPreview] camera mode sent", mode);
};

const clearUnityPreviewRunningFallbackTimer = () => {
  if (unityPreviewRunningFallbackTimer !== undefined) {
    window.clearTimeout(unityPreviewRunningFallbackTimer);
    unityPreviewRunningFallbackTimer = undefined;
  }
};

const sendSceneToUnityPreview = async () => {
  await ensureUnityPreviewRuntimeData();
  const payload = buildUnityPreviewPayload();
  pendingUnityPreviewPayload.value = payload;
  postUnityPreviewPayload(payload);
};

const handleUnityPreviewMessage = (event: MessageEvent) => {
  if (event.source !== unityPreviewFrame.value?.contentWindow) return;
  if (!isRecord(event.data)) return;

  if (event.data.type === "unity-web-preview-ready") {
    unityPreviewReady.value = true;
    unityPreviewStatus.value = "Unity 已就绪，正在发送场景...";
    void sendSceneToUnityPreview();
    postUnityPreviewCameraMode();
  }

  if (event.data.type === "unity-web-preview-scene-forwarded") {
    unityPreviewStatus.value = "Unity 桥接已接收场景数据，正在本地加载...";
  }

  if (event.data.type === "unity-web-preview-scene-running") {
    clearUnityPreviewRunningFallbackTimer();
    unityPreviewStatus.value = "场景已在 Unity 中运行";
  }
};

const handleUnityPreviewLoad = () => {
  unityPreviewStatus.value = "Unity 运行器加载中...";
};

const openUnityPreview = async () => {
  if (!verse.value && !Number.isFinite(id.value)) {
    ElMessage.error("场景数据尚未加载完成");
    return;
  }

  await ensureUnityPreviewRuntimeData();
  pendingUnityPreviewPayload.value = buildUnityPreviewPayload();
  unityPreviewReady.value = false;
  unityPreviewPanMode.value = false;
  unityPreviewStatus.value = "正在加载 Unity 运行器...";
  unityPreviewFrameKey.value += 1;
  unityPreviewFrameVisible.value = true;
  unityPreviewVisible.value = true;
};

const toggleUnityPreviewFullscreen = () => {
  const target = unityPreviewFrameWrap.value;
  if (!target) return;

  if (document.fullscreenElement === target) {
    document.exitFullscreen?.();
    return;
  }

  target.requestFullscreen?.();
};

const handleUnityPreviewClosed = () => {
  clearUnityPreviewRunningFallbackTimer();
  unityPreviewReady.value = false;
  unityPreviewFrameVisible.value = false;
  unityPreviewPanMode.value = false;
  unityPreviewStatus.value = "正在加载 Unity 运行器...";
};

// 监听语言变化
watch(
  () => appStore.language,
  async () => {
    await refresh();
  }
);
const verse = ref<VerseData | null>(null);
const pushVerseToEditor = (nextVerse: VerseData) => {
  postStandardMessage("INIT", {
    token: null,
    config: buildVerseEditorInitConfig({
      id: id.value,
      verse: nextVerse,
      saveable: saveable.value,
      user: {
        id: userStore.userInfo?.id || null,
        role: userStore.getRole(),
      },
    }),
  });
};

// 刷新场景数据
const refresh = async () => {
  const response = await getVerse(id.value, VERSE_SCENE_EXPAND);
  verse.value = response.data;
  saveable.value = verse.value ? verse.value.editable : false;
  if (verse.value) {
    pushVerseToEditor(verse.value);
  }
};

// 向编辑器发送消息
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toMetaId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickMetaNameFromPayload = (payload: Record<string, unknown>): string => {
  const candidates = [
    payload.meta_title,
    payload.meta_name,
    payload.title,
    payload.name,
    payload.metaTitle,
    payload.metaName,
  ];
  const found = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  return typeof found === "string" ? found.trim() : "";
};

const buildMetaSceneTitle = (
  metaId: number,
  payload: Record<string, unknown>
): string => {
  const payloadName = pickMetaNameFromPayload(payload);
  const matchedMeta = Array.isArray(verse.value?.metas)
    ? verse.value?.metas.find((item) => item.id === metaId)
    : undefined;
  const metaName =
    payloadName ||
    String(matchedMeta?.title || matchedMeta?.name || "").trim() ||
    String(t("meta.list.unnamed"));

  return encodeURIComponent(
    t("meta.list.editorTitle", {
      name: metaName,
    })
  );
};

type PrefabSetupPayload = {
  meta_id: number | string;
  data: string;
  uuid: string;
};

type SelectedMetaPayload = {
  data: unknown;
  setup?: unknown;
  title?: string;
};

type VerseModule = {
  parameters: {
    title: string;
  } & Record<string, unknown>;
};

type VerseEditorData = {
  children?: {
    modules?: VerseModule[];
  };
} & Record<string, unknown>;

type VerseEditorPayload = {
  verse?: VerseEditorData;
};

type CoverUploadPayload = {
  imageData: string;
};

type UnsavedChangesResultPayload = {
  requestId: string;
  changed: boolean;
};

const collectVerseModuleTitles = (
  modules: VerseModule[] | undefined,
  titles: string[] = []
) => {
  (modules || []).forEach((module) => {
    const title =
      typeof module?.parameters?.title === "string"
        ? module.parameters.title.trim()
        : "";
    if (title) {
      titles.push(title);
    }
  });
  return titles;
};

const formatVerseDraftSummary = (payload: VerseEditorPayload) => {
  const titles = collectVerseModuleTitles(payload.verse?.children?.modules);
  if (titles.length === 0) {
    return t("common.scriptDraft.emptySummary");
  }
  const preview = titles.slice(0, 3).join("、");
  const extra = titles.length > 3 ? ` +${titles.length - 3}` : "";
  return `${preview}${extra}`;
};

const formatVerseDraftChangeSummary = (
  payload: VerseEditorPayload,
  previousVersion?: ScriptDraftVersion
): {
  summary: string;
  summaryI18nKey?: string;
  summaryI18nParams?: Record<string, string>;
} => {
  const fallbackSummary = formatVerseDraftSummary(payload);
  if (!previousVersion) {
    return {
      summary: fallbackSummary,
      summaryI18nKey:
        fallbackSummary === t("common.scriptDraft.emptySummary")
          ? "common.scriptDraft.emptySummary"
          : undefined,
    };
  }
  const currentTitles = collectVerseModuleTitles(
    payload.verse?.children?.modules
  );
  const previousPayload = isRecord(previousVersion.blocklyData)
    ? (previousVersion.blocklyData as VerseEditorPayload)
    : {};
  const previousTitles = collectVerseModuleTitles(
    previousPayload.verse?.children?.modules
  );
  const addedTitles = currentTitles.filter(
    (title) => !previousTitles.includes(title)
  );
  if (addedTitles.length > 0) {
    const items = addedTitles.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryAdded", { items }),
      summaryI18nKey: "common.scriptDraft.summaryAdded",
      summaryI18nParams: { items },
    };
  }
  const removedTitles = previousTitles.filter(
    (title) => !currentTitles.includes(title)
  );
  if (removedTitles.length > 0) {
    const items = removedTitles.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryRemoved", { items }),
      summaryI18nKey: "common.scriptDraft.summaryRemoved",
      summaryI18nParams: { items },
    };
  }
  for (let index = 0; index < currentTitles.length; index += 1) {
    if (currentTitles[index] !== previousTitles[index]) {
      const items = currentTitles[index] || previousTitles[index];
      return {
        summary: t("common.scriptDraft.summaryModified", { items }),
        summaryI18nKey: "common.scriptDraft.summaryModified",
        summaryI18nParams: { items },
      };
    }
  }
  return {
    summary: fallbackSummary,
    summaryI18nKey:
      fallbackSummary === t("common.scriptDraft.emptySummary")
        ? "common.scriptDraft.emptySummary"
        : undefined,
  };
};

const persistSceneDraftVersions = () => {
  if (!buildSceneDraftStorageKey.value) return;
  try {
    window.localStorage.setItem(
      buildSceneDraftStorageKey.value,
      JSON.stringify(draftVersions.value)
    );
  } catch (error) {
    logger.error("persistVerseSceneDraftVersions error", error);
  }
};

const persistSceneDraftSettings = () => {
  if (!buildSceneDraftSettingsKey.value) return;
  try {
    window.localStorage.setItem(
      buildSceneDraftSettingsKey.value,
      JSON.stringify({
        settingsVersion: DRAFT_SETTINGS_VERSION,
        autoSaveEnabled: autoSaveEnabled.value,
        autoSaveIntervalSeconds: autoSaveIntervalSeconds.value,
      })
    );
  } catch (error) {
    logger.error("persistVerseSceneDraftSettings error", error);
  }
};

const normalizeAutoSaveInterval = (parsed: Record<string, unknown>) => {
  const interval = Number(parsed.autoSaveIntervalSeconds);
  if (!Number.isFinite(interval) || interval < 60) {
    return DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;
  }
  const settingsVersion = Number(parsed.settingsVersion || 0);
  if (settingsVersion < DRAFT_SETTINGS_VERSION && interval === 60) {
    return DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;
  }
  return interval;
};

const loadSceneDraftState = () => {
  draftVersions.value = [];
  autoSaveEnabled.value = true;
  autoSaveIntervalSeconds.value = DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;

  if (!buildSceneDraftStorageKey.value || !buildSceneDraftSettingsKey.value) {
    return;
  }

  try {
    const rawVersions = window.localStorage.getItem(
      buildSceneDraftStorageKey.value
    );
    if (rawVersions) {
      const parsed = JSON.parse(rawVersions);
      if (Array.isArray(parsed)) {
        draftVersions.value = parsed;
        const latestVersion = parsed[0] as ScriptDraftVersion | undefined;
        if (latestVersion) {
          lastSaveTrigger.value = latestVersion.trigger;
          lastSavedAt.value = latestVersion.savedAt;
        }
      }
    }
  } catch (error) {
    logger.error("loadVerseSceneDraftState versions error", error);
  }

  try {
    const rawSettings = window.localStorage.getItem(
      buildSceneDraftSettingsKey.value
    );
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      autoSaveEnabled.value = parsed.autoSaveEnabled !== false;
      if (parsed && typeof parsed === "object") {
        autoSaveIntervalSeconds.value = normalizeAutoSaveInterval(
          parsed as Record<string, unknown>
        );
      }
    }
  } catch (error) {
    logger.error("loadVerseSceneDraftState settings error", error);
  }
};

const addSceneDraftVersion = (
  payload: VerseEditorPayload,
  trigger: ScriptSaveTrigger
) => {
  const latestVersion = draftVersions.value[0];
  const nextSummary = formatVerseDraftChangeSummary(payload, latestVersion);
  const nextVersion: ScriptDraftVersion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    trigger,
    summary: nextSummary.summary,
    summaryI18nKey: nextSummary.summaryI18nKey,
    summaryI18nParams: nextSummary.summaryI18nParams,
    blocklyData: safeClone(payload),
    lua: "",
    js: "",
  };
  const nextSignature = JSON.stringify(nextVersion.blocklyData ?? null);
  const latestSignature = latestVersion
    ? JSON.stringify(latestVersion.blocklyData ?? null)
    : "";
  if (latestSignature === nextSignature) {
    return null;
  }
  draftVersions.value = [nextVersion, ...draftVersions.value].slice(0, 20);
  persistSceneDraftVersions();
  return nextVersion.savedAt;
};

const openVersionDialog = () => {
  versionDialogVisible.value = true;
};

const clearDraftHistory = () => {
  draftVersions.value = [];
  pendingRestorePayload.value = null;
  if (!buildSceneDraftStorageKey.value) return;
  try {
    window.localStorage.removeItem(buildSceneDraftStorageKey.value);
  } catch (error) {
    logger.error("clearVerseSceneDraftHistory error", error);
  }
};

const restoreDraftVersion = (draftId: string) => {
  const target = draftVersions.value.find((draft) => draft.id === draftId);
  if (!target || !verse.value) return;
  const payload = isRecord(target.blocklyData)
    ? (target.blocklyData as VerseEditorPayload)
    : {};
  verse.value = {
    ...verse.value,
    data: safeClone(payload.verse ?? verse.value.data),
  };
  pendingRestorePayload.value = safeClone(payload);
  isRestoringDraft.value = true;
  editorFrameKey.value += 1;
  hasUnsavedChangesBeforeUnload.value = true;
  Message.success(t("common.scriptDraft.restoreSuccess"));
  versionDialogVisible.value = false;
};

const clearAutoSaveTimer = () => {
  if (autoSaveTimer !== null) {
    window.clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

const restartAutoSaveTimer = () => {
  clearAutoSaveTimer();
  if (!autoSaveEnabled.value || !buildSceneDraftStorageKey.value) return;

  autoSaveTimer = window.setInterval(async () => {
    if (!pendingRestorePayload.value && !hasUnsavedChangesBeforeUnload.value) {
      return;
    }
    if (isSavingVersion.value) return;
    if (!verse.value?.editable) return;
    try {
      await requestSceneSave("auto");
    } catch (error) {
      logger.error("verse scene auto save failed", error);
    }
  }, autoSaveIntervalSeconds.value * 1000);
};

const isPrefabSetupPayload = (value: unknown): value is PrefabSetupPayload =>
  isRecord(value) && "meta_id" in value && "data" in value && "uuid" in value;

const isCoverUploadPayload = (value: unknown): value is CoverUploadPayload =>
  isRecord(value) && typeof value.imageData === "string";

const _isUnsavedChangesResultPayload = (
  value: unknown
): value is UnsavedChangesResultPayload =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.changed === "boolean";

// 消息发送基础设施
const { postStandardMessage, sendRequest, pendingRequests } =
  useIframeMessaging(editor, {
    onError: () => ElMessage.error(t("verse.view.sceneEditor.error1")),
  });

const confirmSaveCurrentScene = () =>
  ElMessageBox.confirm(t("common.sceneSaveConfirm.message"), "", {
    showClose: true,
    center: true,
    distinguishCancelAndClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    showCancelButton: true,
    customClass: "script-save-confirm-box",
    confirmButtonText: t("common.sceneSaveConfirm.confirm"),
    cancelButtonText: t("common.sceneSaveConfirm.cancel"),
  });

const {
  hasUnsavedChangesBeforeUnload,
  syncUnsavedChangesForBeforeUnload,
  resolveLeaveSave,
  requestSceneSave,
  resolveUnsavedBeforeLeave,
  handleBeforeUnload,
  cleanupPendingResolver,
} = useSceneSaveGuard({
  sendRequest,
  pendingRequests,
  pendingRestorePayload,
  isSavingVersion,
  confirmDialog: confirmSaveCurrentScene,
  onBeforeSave: (trigger) => {
    currentSaveTrigger = trigger;
  },
});

// 设置预制件属性
const setupPrefab = async ({ meta_id, data, uuid }: PrefabSetupPayload) => {
  const response = await getPrefab(Number(meta_id));
  knightDataRef.value?.open({
    schema: JSON.parse(response.data.data!),
    data: JSON.parse(data),
    callback: (setup: unknown) => {
      sendRequest("setup-module", { uuid, setup } as Record<string, unknown>);
    },
  });
};

// 添加预制件
//const addPrefab = () => {
//  prefabDialogRef.value?.open(id.value);
//};

// 添加实体
const addMeta = () => {
  metaDialogRef.value?.open(id.value);
};

// 选择元素后的回调
const selected = async ({ data, setup, title }: SelectedMetaPayload) => {
  sendRequest("add-module", { data, setup, title } as Record<string, unknown>);
};

// 保存场景数据
const saveVerse = async (
  data: unknown,
  trigger: ScriptSaveTrigger = "manual"
) => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    return;
  }

  const verse = payload.verse;

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.info3"));
    return;
  }

  // 处理重复标题，确保标题唯一
  const retitleVerses = (verses: VerseModule[]) => {
    const titleCount: Record<string, number> = {};

    verses.forEach((verse) => {
      let title = verse.parameters.title;

      // 提取基础标题和计数
      const match = title.match(/^(.*?)(?: \((\d+)\))?$/);
      const baseTitle = match?.[1]?.trim() || title;
      const currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!titleCount[baseTitle]) {
        titleCount[baseTitle] = currentCount > 0 ? currentCount : 1;
      } else {
        titleCount[baseTitle]++;
      }

      // 生成唯一标题
      const newCount = titleCount[baseTitle];
      verse.parameters.title =
        newCount > 1 ? `${baseTitle} (${newCount})` : baseTitle;
    });
  };

  if (verse?.children?.modules) {
    retitleVerses(verse.children.modules);
  }
  await putVerse(id.value, { data: verse as unknown as JsonValue });
  if (verse.value) {
    verse.value = {
      ...verse.value,
      data: safeClone(verse),
    };
  }

  if (trigger === "manual") {
    ElMessageBox.confirm(
      t("verse.view.sceneEditor.saveAndPublishConfirm"),
      t("verse.view.sceneEditor.publishScene"),
      {
        confirmButtonText: t("verse.view.sceneEditor.confirm"),
        cancelButtonText: t("verse.view.sceneEditor.cancel"),
        type: "warning",
      }
    )
      .then(async () => {
        await takePhoto(id.value);
        ElMessage({
          type: "success",
          message: t("verse.view.sceneEditor.publishSuccess"),
        });
      })
      .catch(() => {
        ElMessage({
          type: "info",
          message: t("verse.view.sceneEditor.publishCanceled"),
        });
      });
  }
};

const saveVerseBeforeLeave = async (
  data: unknown,
  trigger: ScriptSaveTrigger = currentSaveTrigger
): Promise<boolean> => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    return false;
  }

  const verse = payload.verse;

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.info3"));
    return true;
  }

  const retitleVerses = (verses: VerseModule[]) => {
    const titleCount: Record<string, number> = {};

    verses.forEach((item) => {
      const title = item.parameters.title;
      const match = title.match(/^(.*?)(?: \((\d+)\))?$/);
      const baseTitle = match?.[1]?.trim() || title;
      const currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!titleCount[baseTitle]) {
        titleCount[baseTitle] = currentCount > 0 ? currentCount : 1;
      } else {
        titleCount[baseTitle]++;
      }

      const newCount = titleCount[baseTitle];
      item.parameters.title =
        newCount > 1 ? `${baseTitle} (${newCount})` : baseTitle;
    });
  };

  if (verse?.children?.modules) {
    retitleVerses(verse.children.modules);
  }

  try {
    await putVerse(id.value, { data: verse as unknown as JsonValue });
    if (verse.value) {
      verse.value = {
        ...verse.value,
        data: safeClone(verse),
      };
    }
    if (trigger === "manual") {
      ElMessage.success(t("verse.view.sceneEditor.saveCompleted"));
    }
    return true;
  } catch {
    ElMessage.error(t("verse.view.sceneEditor.error1"));
    return false;
  }
};

//发布场景
const releaseVerse = async (data: unknown) => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    ElMessage.error(t("verse.view.sceneEditor.noProjectToPublish"));
    return;
  }

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.noPublishPermission"));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t("verse.page.list.releaseConfirm.message1"),
      t("verse.page.list.releaseConfirm.message2"),
      {
        confirmButtonText: t("verse.page.list.releaseConfirm.confirm"),
        cancelButtonText: t("verse.page.list.releaseConfirm.cancel"),
        type: "warning",
      }
    );

    await takePhoto(id.value);

    ElMessage.success(t("verse.page.list.releaseConfirm.success"));
  } catch {
    ElMessage.info(t("verse.page.list.releaseConfirm.info"));
  }
};

// 处理来自编辑器的消息（标准协议：msg.type 路由）
const handleMessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (!msg || typeof msg.type !== "string") return;

  const payload = (msg.payload ?? {}) as Record<string, unknown>;

  switch (msg.type) {
    case "PLUGIN_READY":
      hasUnsavedChangesBeforeUnload.value = false;
      if (isRestoringDraft.value && verse.value) {
        isRestoringDraft.value = false;
        pushVerseToEditor(verse.value);
        hasUnsavedChangesBeforeUnload.value = true;
      } else if (!init) {
        init = true;
        refresh();
      }
      break;

    case "RESPONSE": {
      const action = payload.action as string | undefined;

      if (action === "save" && !payload.noChange) {
        // Original save-verse logic
        currentSaveTrigger = "manual";
        isSavingVersion.value = true;
        await saveVerse(payload, currentSaveTrigger);
        if (payload.verse) {
          const savedAt = addSceneDraftVersion(
            payload as VerseEditorPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
        }
        hasUnsavedChangesBeforeUnload.value = false;
        isSavingVersion.value = false;
        ElMessage.success(t("verse.view.sceneEditor.saveCompleted"));
      } else if (action === "save" && payload.noChange) {
        // Original save-verse-none logic
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          await saveVerse(restoredPayload, currentSaveTrigger);
          const savedAt = addSceneDraftVersion(
            restoredPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          hasUnsavedChangesBeforeUnload.value = false;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        } else {
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          ElMessage.warning(t("verse.view.sceneEditor.noChanges"));
          hasUnsavedChangesBeforeUnload.value = false;
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        }
      } else if (action === "save-before-leave" && !payload.noChange) {
        // Original save-verse-before-leave logic
        isSavingVersion.value = true;
        const result = await saveVerseBeforeLeave(payload, currentSaveTrigger);
        if (result && payload.verse) {
          const savedAt = addSceneDraftVersion(
            payload as VerseEditorPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          hasUnsavedChangesBeforeUnload.value = false;
          if (currentSaveTrigger === "auto") {
            Message.success(t("common.scriptDraft.autoSavedNotice"));
          }
        }
        isSavingVersion.value = false;
        resolveLeaveSave(result);
      } else if (action === "save-before-leave" && payload.noChange) {
        // Original save-verse-before-leave-none logic
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          const result = await saveVerseBeforeLeave(
            restoredPayload,
            currentSaveTrigger
          );
          if (result) {
            const savedAt = addSceneDraftVersion(
              restoredPayload,
              currentSaveTrigger
            );
            pendingRestorePayload.value = null;
            hasUnsavedChangesBeforeUnload.value = false;
            lastSaveTrigger.value = currentSaveTrigger;
            lastSavedAt.value = savedAt || new Date().toISOString();
            if (currentSaveTrigger === "auto") {
              Message.success(t("common.scriptDraft.autoSavedNotice"));
            }
          }
          isSavingVersion.value = false;
          resolveLeaveSave(result);
        } else {
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          hasUnsavedChangesBeforeUnload.value = false;
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        }
      } else if (action === "check-unsaved-changes") {
        // Match via msg.requestId against pendingRequests Map callback
        const resolver = pendingRequests.get(msg.requestId);
        if (resolver) {
          resolver(payload);
        } else {
          // Fallback: direct update of hasUnsavedChangesBeforeUnload
          hasUnsavedChangesBeforeUnload.value = pendingRestorePayload.value
            ? true
            : Boolean(payload.changed);
        }
      }
      break;
    }

    case "EVENT": {
      const event = payload.event as string | undefined;

      if (event === "edit-meta") {
        const metaId = toMetaId(payload.meta_id);
        if (metaId !== null) {
          const title = buildMetaSceneTitle(metaId, payload);
          router.push({
            path: "/meta/scene",
            query: { id: String(metaId), title },
          });
        }
      } else if (event === "setup-prefab") {
        if (isPrefabSetupPayload(payload)) {
          setupPrefab(payload);
        }
      } else if (event === "add-meta") {
        addMeta();
      } else if (event === "release-verse") {
        releaseVerse(payload);
      } else if (event === "goto") {
        if (payload.target === "blockly.js") {
          const scriptRoute = router
            .getRoutes()
            .find((route) => route.path === "/verse/script");

          if (scriptRoute && scriptRoute.meta.title) {
            const metaTitle = translateRouteTitle(scriptRoute.meta.title);

            router.push({
              path: "/verse/script",
              query: {
                id: id.value,
                title: metaTitle + title.value,
              },
            });
          }
        }
      } else if (event === "upload-cover") {
        handleUploadCover(payload);
      }
      break;
    }
  }
};

// 处理上传封面图片
const handleUploadCover = async (data: unknown) => {
  try {
    if (!isCoverUploadPayload(data)) {
      ElMessage.error(t("verse.view.sceneEditor.coverUploadError"));
      return;
    }

    // 将base64图片数据转换为Blob对象
    const imageData = data.imageData;
    const byteString = atob(imageData.split(",")[1]);
    const mimeType = imageData.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const extension = mimeType.split("/")[1];
    const fileName = `cover_verse_${id.value}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: mimeType });

    // 处理文件上传
    const fileStore = useFileStore();
    const { postFile } = await import("@/api/v1/files");

    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("verse.view.sceneEditor.handlerError"));
      return;
    }

    // 检查文件是否已存在
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      "backup"
    );

    // 如果文件不存在，上传文件
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        file,
        (_progress: unknown) => {},
        handler,
        "backup"
      );
    }

    // 保存图片信息到服务器
    const fileData = {
      md5,
      key: md5 + `.${extension}`,
      filename: fileName,
      url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
    };

    const response = await postFile(fileData);

    if (response && response.data) {
      // 更新Verse的image_id
      const verse = await getVerse(id.value);
      if (verse && verse.data) {
        verse.data.image_id = response.data.id;
        await putVerse(id.value, {
          image_id: response.data.id,
          name: verse.data.name,
          uuid: verse.data.uuid,
          description: verse.data.description ?? undefined,
        });
        ElMessage.success(t("verse.view.sceneEditor.coverUploadSuccess"));
        await refresh();
      }
    }
  } catch (error) {
    logger.error("上传封面图片失败:", error);
    ElMessage.error(t("verse.view.sceneEditor.coverUploadFailed"));
  }
};

// 生命周期钩子
onMounted(() => {
  loadSceneDraftState();
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
    onRunPreview: openUnityPreview,
  });
  restartAutoSaveTimer();
  window.addEventListener("message", handleMessage);
  window.addEventListener("message", handleUnityPreviewMessage);
  window.addEventListener("beforeunload", handleBeforeUnload);
  void syncUnsavedChangesForBeforeUnload();
  unsavedCheckPollingTimer = window.setInterval(() => {
    void syncUnsavedChangesForBeforeUnload();
  }, 2000);
});

onBeforeRouteLeave(async (_to, _from, next) => {
  const canLeave = await resolveUnsavedBeforeLeave();
  next(canLeave);
});

watch(toolbarStatus, (status) => {
  updateToolbarStatus(toolbarOwner, status);
});

watch([autoSaveEnabled, autoSaveIntervalSeconds], () => {
  persistSceneDraftSettings();
  restartAutoSaveTimer();
});

watch(
  () => settingsStore.theme,
  (newTheme) => {
    postStandardMessage("THEME_CHANGE", {
      theme: newTheme === ThemeEnum.DARK ? "dark" : "light",
      dark: newTheme === ThemeEnum.DARK,
    });
  }
);

onBeforeUnmount(() => {
  postStandardMessage("DESTROY");
  unregisterToolbar(toolbarOwner);
  clearAutoSaveTimer();
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("message", handleUnityPreviewMessage);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  if (unsavedCheckPollingTimer !== null) {
    window.clearInterval(unsavedCheckPollingTimer);
    unsavedCheckPollingTimer = null;
  }
  pendingRequests.clear();
  cleanupPendingResolver();
});
</script>

<style lang="scss" scoped>
.verse-scene {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  overflow: hidden;

  :deep(.el-container) {
    flex: 1 1 auto;
    min-height: 0;
  }

  :deep(.el-main) {
    position: relative;
  }
}

.content {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  border: 0;
  outline: none;
}

:global(.unity-preview-dialog.el-dialog) {
  --el-dialog-padding-primary: 0;

  padding: 0 !important;
  overflow: hidden;
  background: #2f3a4a;
  border: 0;
  border-radius: 8px;
  outline: none;
  box-shadow: 0 18px 44px rgb(15 23 42 / 28%);
}

:global(.unity-preview-dialog *) {
  outline: none;
}

:global(.unity-preview-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
  background: #263443;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.unity-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px 0 18px;
}

.unity-preview-title-wrap {
  display: inline-flex;
  gap: 7px;
  align-items: center;
}

.unity-preview-help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  color: rgb(255 255 255 / 58%);
  cursor: help;
}

.unity-preview-help-icon:hover {
  color: rgb(255 255 255 / 86%);
}

:global(.unity-preview-help-tooltip) {
  max-width: 220px;
  font-size: 12px;
  line-height: 1.6;
}

.unity-preview-help {
  display: grid;
  gap: 2px;
}

:global(.unity-preview-dialog .el-dialog__title) {
  font-size: 15px;
  font-weight: 600;
  color: rgb(255 255 255 / 92%);
}

.unity-preview-header-actions {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.unity-preview-header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  color: rgb(255 255 255 / 88%);
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 6px;
}

.unity-preview-header-button:hover {
  color: #fff;
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 12%);
}

:global(.unity-preview-dialog .el-dialog__body) {
  display: flex;
  flex-direction: column;
  height: min(630px, calc(100vh - 156px));
  padding: 0;
  overflow: hidden;
  background: #2f3a4a;
}

.unity-preview-frame-wrap {
  display: flex;
  flex: 1;
  align-items: flex-start;
  justify-content: center;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: #2f3a4a;
}

.unity-preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 520px;
  background: #2f3a4a;
  border: 0;
  outline: none;
}

.unity-preview-frame-wrap:fullscreen {
  width: 100vw;
  height: 100vh;
}
</style>

<style lang="scss">
/* 隐藏当前页面的 footer */
.main-container:has(.verse-scene) > footer {
  display: none !important;
}
</style>
