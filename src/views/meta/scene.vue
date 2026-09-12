<template>
  <div class="verse-scene">
    <phototype-dialog
      @selected="selectedPhototype"
      ref="phototypeDialogRef"
      v-show="false"
    ></phototype-dialog>
    <resource-dialog
      @selected="selected"
      :on-get-datas="getDatas"
      ref="dialog"
      v-show="false"
    >
      <template #bar="{ item }">
        <div v-if="isAudioBarItem(item)" class="info-container">
          <audio
            id="audio"
            controls
            style="width: 100%; height: 30px"
            :src="getAudioSource(item)"
            @play="handleAudioPlay"
          ></audio>
        </div>
      </template>
    </resource-dialog>
    <el-container class="editor-wrapper">
      <el-main class="editor-container">
        <iframe
          :key="editorFrameKey"
          ref="editor"
          id="editor"
          :src="src"
          class="content"
          height="100%"
          width="100%"
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
  </div>
</template>

<script setup lang="ts">
import {
  createWriteOptions,
  applyWriteRevision,
  type WriteOptions,
} from "@/api/v1/write-contract";
import { writeOptionsForPreview } from "@/services/webmcp/operation-context";
import { WebMcpCompletionError } from "@/services/webmcp/completion-result";
import { createIframeRpc } from "@/utils/iframeRpc";
import {
  useIframeInitialization,
  type IframeInitializationTicket,
} from "@/composables/useIframeInitialization";
import { logger } from "@/utils/logger";
import type { CardInfo, DataInput, DataOutput } from "@/utils/types";
import {
  getAudio,
  getParticle,
  getPolygen,
  getPicture,
  getResources,
  getVideo,
  getVoxel,
  putAudio,
  putParticle,
  putPolygen,
  putPicture,
  putVideo,
  putVoxel,
} from "@/api/v1/resources";
import { getPhototypes } from "@/api/v1/phototype";
import type { PhototypeType } from "@/api/v1/types/phototype";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { JsonSchema } from "@/components/JsonSchemaForm/types";

type ResourceListItem = ResourceInfo & { title?: string };
type MetaEntity = {
  parameters: {
    name: string;
  };
  children?: {
    entities?: MetaEntity[];
  };
};

type MetaPayload = {
  children?: {
    entities?: MetaEntity[];
  };
};

type RestorableResourceType =
  | "polygen"
  | "picture"
  | "video"
  | "voxel"
  | "audio"
  | "particle";

type MetaResourceRef = {
  id: number;
  type: RestorableResourceType;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPhototypeType = (value: unknown): value is PhototypeType =>
  isRecord(value) && "schema" in value && "title" in value;

const hasTypeField = (value: unknown): value is { type: string } =>
  isRecord(value) && typeof value.type === "string";

const hasImageData = (value: unknown): value is { imageData: string } =>
  isRecord(value) && typeof value.imageData === "string";

const isJsonSchema = (value: unknown): value is JsonSchema =>
  isRecord(value) && typeof value.type === "string";

const isAudioBarItem = (
  value: unknown
): value is { type: "audio"; context: unknown } =>
  isRecord(value) && value.type === "audio";

const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 300;
const DRAFT_SETTINGS_VERSION = 2;

const getAudioSource = (value: unknown): string => {
  if (!isRecord(value) || !isRecord(value.context)) return "";
  const file = value.context.file;
  if (!isRecord(file) || typeof file.url !== "string") return "";
  return file.url;
};

const currentPlayingAudio = ref<HTMLAudioElement | null>(null);

const handleAudioPlay = (event: Event) => {
  const audioElement = event.target as HTMLAudioElement;
  if (currentPlayingAudio.value && currentPlayingAudio.value !== audioElement) {
    currentPlayingAudio.value.pause();
  }
  currentPlayingAudio.value = audioElement;
};

const getDatas = (input: DataInput): Promise<DataOutput> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (input.type === "phototype") {
        const response = await getPhototypes(
          input.sorted,
          input.searched,
          input.current,
          "resource,image,author",
          24
        );

        logger.error(response.data);
        // 处理响应数据，转换为 CardInfo 数组
        const items = response.data.map((item: PhototypeType) => {
          return {
            id: item.id,
            context: item,
            type: "phototype",
            created_at: item.created_at,
            name: item.name ? item.name : (item.title ?? ""), // 使用name或title
            image: item.image ? { url: item.image.url } : null,
            enabled: true,
          } as CardInfo;
        });

        const pagination = {
          current: parseInt(response.headers["x-pagination-current-page"]),
          count: parseInt(response.headers["x-pagination-page-count"]),
          size: parseInt(response.headers["x-pagination-per-page"]),
          total: parseInt(response.headers["x-pagination-total-count"]),
        };
        resolve({ items, pagination });
      } else {
        const response = await getResources(
          input.type,
          input.sorted,
          input.searched,
          input.current,
          "image",
          24
        );

        const items = response.data.map((item: ResourceListItem) => {
          let enabled: boolean = true;
          if (item.type === "polygen" && !item.image) {
            enabled = false;
          }
          return {
            id: item.id,
            context: item,
            type: item.type,
            created_at: item.created_at,
            name: item.name ? item.name : (item.title ?? ""), // 使用name或title
            image: item.image ? { url: item.image.url } : null,
            enabled,
          } as CardInfo;
        });

        const pagination = {
          current: parseInt(response.headers["x-pagination-current-page"]),
          count: parseInt(response.headers["x-pagination-page-count"]),
          size: parseInt(response.headers["x-pagination-per-page"]),
          total: parseInt(response.headers["x-pagination-total-count"]),
        };
        resolve({ items, pagination });
      }
    } catch (error) {
      logger.error("Failed to fetch data", error);
      reject(error);
    }
  });
};
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import PhototypeDialog from "@/components/MrPP/PhototypeDialog.vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import { Message } from "@/components/Dialog";
import { putMeta, getMeta, type metaInfo } from "@/api/v1/meta";
import type { UpdateMetaRequest } from "@/api/v1/types/meta";
import { getVerse, getVerses, type VerseData } from "@/api/v1/verse";
import { useAppStore } from "@/store/modules/app";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment";
import { safeAtob } from "@/utils/base64";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { AbilityEdit } from "@/utils/ability";
import { useAbility } from "@casl/vue";
import { useUserStore } from "@/store/modules/user";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { until } from "@vueuse/core";
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
import {
  sceneWriteFailure,
  writeFailureMessageKey,
} from "@/services/webmcp/scene-write-failure";
import { registerEntityEditorWebMcpTools } from "@/services/webmcp/entity-editor-tools";
import type {
  NodeTransformPreview,
  NodeTransformSnapshot,
} from "@/services/webmcp/entity-transform-tools";
import type {
  NodePropertyPreview,
  NodePropertySnapshot,
} from "@/services/webmcp/entity-node-property-tools";
import type { ResourcePlacementPreview } from "@/services/webmcp/entity-resource-placement-tools";
import type {
  NodeParentSnapshot,
  NodeReparentPreview,
} from "@/services/webmcp/entity-hierarchy-tools";
import type { NodeDeletionPreview } from "@/services/webmcp/entity-node-deletion-tools";
import type {
  NodeOrderPreview,
  NodeOrderSnapshot,
} from "@/services/webmcp/entity-node-order-tools";
import type { NodeClonePreview } from "@/services/webmcp/entity-node-clone-tools";
import type {
  NodeBatchCompletion,
  NodeBatchPreview,
  NodeBatchPreviewItem,
} from "@/services/webmcp/entity-node-batch-tools";
import type {
  AssetRenamePreview,
  EntityAssetType,
} from "@/services/webmcp/entity-asset-lifecycle-tools";
import type {
  ComponentBatchCompletion,
  ComponentBatchPreview,
  ComponentBatchPreviewItem,
  NodeComponentList,
} from "@/services/webmcp/entity-component-tools";
import type {
  EntitySignalList,
  SignalBatchCompletion,
  SignalBatchPreview,
  SignalBatchPreviewItem,
  SignalReference,
} from "@/services/webmcp/entity-signal-tools";

import pako from "pako";
import qs from "querystringify";

// 组件状态
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const { t } = useI18n();
const dialog = ref();
const phototypeDialogRef = ref<InstanceType<typeof PhototypeDialog>>();
const editor = ref<HTMLIFrameElement | null>();
const ability = useAbility();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

let unsavedCheckPollingTimer: number | null = null;
const editorFrameKey = ref(0);
const isRestoringDraft = ref(false);
const metaDetail = ref<unknown>(null);
const entityScenes = ref<EntitySceneItem[]>([]);
const versionDialogVisible = ref(false);
const draftVersions = ref<ScriptDraftVersion[]>([]);
const autoSaveEnabled = ref(true);
const autoSaveIntervalSeconds = ref(DEFAULT_AUTO_SAVE_INTERVAL_SECONDS);
const isSavingVersion = ref(false);
const lastSaveTrigger = ref<ScriptSaveTrigger | null>(null);
const lastSavedAt = ref<string | null>(null);
const pendingRestorePayload = ref<{
  meta?: MetaPayload;
  events?: unknown;
} | null>(null);
let currentSaveTrigger: ScriptSaveTrigger = "manual";
let autoSaveTimer: number | null = null;
let webMcpLifecycle: AbortController | null = null;

const toolbarOwner = "meta-scene-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();

const activateToolbar = () => {
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
};
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
  Number.isFinite(id.value) ? `scene-draft:meta:${id.value}` : null
);

const buildSceneDraftSettingsKey = computed(() =>
  buildSceneDraftStorageKey.value
    ? `${buildSceneDraftStorageKey.value}:settings`
    : null
);

type EntitySceneItem = {
  id: number;
  name: string;
};

const normalizeRestorableResourceType = (
  type: unknown
): RestorableResourceType | null => {
  if (typeof type !== "string") return null;
  switch (type.toLowerCase()) {
    case "polygen":
      return "polygen";
    case "picture":
      return "picture";
    case "video":
      return "video";
    case "voxel":
      return "voxel";
    case "audio":
    case "sound":
      return "audio";
    case "particle":
      return "particle";
    default:
      return null;
  }
};

const collectMetaResourceRefs = (
  value: unknown,
  refs: MetaResourceRef[] = []
): MetaResourceRef[] => {
  if (!isRecord(value)) return refs;

  const normalizedType = normalizeRestorableResourceType(value.type);
  const parameters = isRecord(value.parameters) ? value.parameters : null;
  const rawResourceId = parameters?.resource;
  const resourceId =
    typeof rawResourceId === "number" ? rawResourceId : Number(rawResourceId);

  if (normalizedType && Number.isFinite(resourceId)) {
    refs.push({ id: resourceId, type: normalizedType });
  }

  const children = isRecord(value.children) ? value.children : null;
  if (!children) return refs;

  Object.values(children).forEach((child) => {
    if (Array.isArray(child)) {
      child.forEach((item) => {
        collectMetaResourceRefs(item, refs);
      });
      return;
    }
    collectMetaResourceRefs(child, refs);
  });

  return refs;
};

const fetchResourceByRef = async (
  ref: MetaResourceRef
): Promise<ResourceInfo | null> => {
  try {
    switch (ref.type) {
      case "polygen":
        return (
          (await getPolygen(ref.id)) as {
            data: ResourceInfo;
          }
        ).data;
      case "picture":
        return (await getPicture(ref.id)).data;
      case "video":
        return (await getVideo(ref.id)).data;
      case "voxel":
        return (
          (await getVoxel(ref.id)) as {
            data: ResourceInfo;
          }
        ).data;
      case "audio":
        return (await getAudio(ref.id)).data;
      case "particle":
        return (await getParticle(ref.id)).data;
      default:
        return null;
    }
  } catch (error) {
    logger.error("Failed to hydrate restored meta resource", ref, error);
    return null;
  }
};

const updateResourceName = async (
  resourceType: EntityAssetType,
  resourceId: number,
  name: string
): Promise<ResourceInfo | null> => {
  const payload = { name };
  switch (resourceType) {
    case "polygen":
      return (await putPolygen(resourceId, payload)).data as ResourceInfo;
    case "picture":
      return (await putPicture(resourceId, payload)).data as ResourceInfo;
    case "video":
      return (await putVideo(resourceId, payload)).data as ResourceInfo;
    case "voxel":
      return (await putVoxel(resourceId, payload)).data as ResourceInfo;
    case "audio":
      return (await putAudio(resourceId, payload)).data as ResourceInfo;
    case "particle":
      return (await putParticle(resourceId, payload)).data as ResourceInfo;
    default:
      return null;
  }
};

const RESOURCE_UPLOAD_ROUTES: Record<EntityAssetType, string> = {
  polygen: "/resource/polygen/index",
  picture: "/resource/picture/index",
  video: "/resource/video/index",
  voxel: "/resource/voxel/index",
  audio: "/resource/audio/index",
  particle: "/resource/particle/index",
};

const hydrateMetaResources = async (
  metaData: unknown,
  currentResources: ResourceInfo[] = []
) => {
  const refs = collectMetaResourceRefs(metaData);
  if (refs.length === 0) return [];

  const uniqueRefs = Array.from(
    new Map(refs.map((ref) => [`${ref.type}:${ref.id}`, ref])).values()
  );
  const existingMap = new Map(
    currentResources.map((resource) => [
      `${resource.type}:${resource.id}`,
      resource,
    ])
  );
  const missingRefs = uniqueRefs.filter(
    (ref) => !existingMap.has(`${ref.type}:${ref.id}`)
  );

  if (missingRefs.length > 0) {
    const results = await Promise.all(
      missingRefs.map(async (ref) => ({
        key: `${ref.type}:${ref.id}`,
        resource: await fetchResourceByRef(ref),
      }))
    );
    results.forEach(({ key, resource }) => {
      if (resource) {
        existingMap.set(key, resource);
      }
    });
  }

  return uniqueRefs
    .map((ref) => existingMap.get(`${ref.type}:${ref.id}`))
    .filter((resource): resource is ResourceInfo => Boolean(resource));
};

const collectMetaEntityNames = (
  entities: MetaEntity[] | undefined,
  names: string[] = []
) => {
  (entities || []).forEach((entity) => {
    const name =
      typeof entity?.parameters?.name === "string"
        ? entity.parameters.name.trim()
        : "";
    if (name) {
      names.push(name);
    }
    collectMetaEntityNames(entity.children?.entities, names);
  });
  return names;
};

const formatMetaDraftSummary = (payload: {
  meta?: MetaPayload;
  events?: unknown;
}) => {
  const names = collectMetaEntityNames(payload.meta?.children?.entities);
  if (names.length === 0) {
    return t("common.scriptDraft.emptySummary");
  }
  const preview = names.slice(0, 3).join("、");
  const extra = names.length > 3 ? ` +${names.length - 3}` : "";
  return `${preview}${extra}`;
};

const formatMetaDraftChangeSummary = (
  payload: {
    meta?: MetaPayload;
    events?: unknown;
  },
  previousVersion?: ScriptDraftVersion
): {
  summary: string;
  summaryI18nKey?: string;
  summaryI18nParams?: Record<string, string>;
} => {
  const fallbackSummary = formatMetaDraftSummary(payload);
  if (!previousVersion) {
    return {
      summary: fallbackSummary,
      summaryI18nKey:
        fallbackSummary === t("common.scriptDraft.emptySummary")
          ? "common.scriptDraft.emptySummary"
          : undefined,
    };
  }
  const currentNames = collectMetaEntityNames(payload.meta?.children?.entities);
  const previousPayload = isRecord(previousVersion.blocklyData)
    ? (previousVersion.blocklyData as { meta?: MetaPayload })
    : {};
  const previousNames = collectMetaEntityNames(
    previousPayload.meta?.children?.entities
  );
  const addedNames = currentNames.filter(
    (name) => !previousNames.includes(name)
  );
  if (addedNames.length > 0) {
    const items = addedNames.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryAdded", { items }),
      summaryI18nKey: "common.scriptDraft.summaryAdded",
      summaryI18nParams: { items },
    };
  }
  const removedNames = previousNames.filter(
    (name) => !currentNames.includes(name)
  );
  if (removedNames.length > 0) {
    const items = removedNames.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryRemoved", { items }),
      summaryI18nKey: "common.scriptDraft.summaryRemoved",
      summaryI18nParams: { items },
    };
  }
  for (let index = 0; index < currentNames.length; index += 1) {
    if (currentNames[index] !== previousNames[index]) {
      const items = currentNames[index] || previousNames[index];
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
    logger.error("persistSceneDraftVersions error", error);
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
    logger.error("persistSceneDraftSettings error", error);
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
  lastSaveTrigger.value = null;
  lastSavedAt.value = null;

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
    logger.error("loadSceneDraftState versions error", error);
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
    logger.error("loadSceneDraftState settings error", error);
  }
};

const addSceneDraftVersion = (
  payload: {
    meta?: MetaPayload;
    events?: unknown;
  },
  trigger: ScriptSaveTrigger
) => {
  const latestVersion = draftVersions.value[0];
  const nextSummary = formatMetaDraftChangeSummary(payload, latestVersion);
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
    logger.error("clearMetaSceneDraftHistory error", error);
  }
};

const restoreDraftVersion = async (draftId: string) => {
  if (isRestoringDraft.value) return;
  const target = draftVersions.value.find((draft) => draft.id === draftId);
  if (!target || !metaDetail.value) return;
  versionDialogVisible.value = false;
  isRestoringDraft.value = true;
  const currentMetaDetailRef = metaDetail.value as metaInfo;
  const payload = isRecord(target.blocklyData) ? target.blocklyData : {};
  const restoredMeta = payload.meta as MetaPayload | undefined;
  const restoredEvents = payload.events;
  const nextMetaDetail = JSON.parse(
    JSON.stringify(currentMetaDetailRef)
  ) as metaInfo;
  const currentMetaDetail = currentMetaDetailRef as unknown as {
    data?: unknown;
    events?: unknown;
  };
  const nextDataSource: unknown =
    restoredMeta ?? currentMetaDetail.data ?? null;
  const nextEventsSource: unknown = restoredEvents ?? currentMetaDetail.events;
  nextMetaDetail.data = JSON.parse(JSON.stringify(nextDataSource));
  nextMetaDetail.events = JSON.parse(JSON.stringify(nextEventsSource)) as
    | import("@/api/v1/types/meta").Events
    | null;
  nextMetaDetail.resources = await hydrateMetaResources(
    nextDataSource,
    Array.isArray(currentMetaDetailRef.resources)
      ? currentMetaDetailRef.resources
      : []
  );
  metaDetail.value = nextMetaDetail;
  pendingRestorePayload.value = {
    meta: JSON.parse(JSON.stringify(nextDataSource)) as MetaPayload,
    events: JSON.parse(JSON.stringify(nextEventsSource)),
  };
  webMcpRpc.cancel();
  webMcpLifecycle?.abort();
  editorFrameKey.value += 1;
  registerPageWebMcpTools();
  hasUnsavedChangesBeforeUnload.value = true;
  Message.success(t("common.scriptDraft.restoreSuccess"));
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
    if (hasUnconfirmedPersistence.value) return;
    if (!pendingRestorePayload.value && !hasUnsavedChangesBeforeUnload.value) {
      return;
    }
    if (isSavingVersion.value) return;
    if (!metaDetail.value || !saveable(metaDetail.value as metaInfo)) return;
    try {
      await requestSceneSave("auto");
    } catch (error) {
      logger.error("meta scene auto save failed", error);
    }
  }, autoSaveIntervalSeconds.value * 1000);
};

const extractEntitySceneIds = (verseMetas: unknown): number[] => {
  if (!Array.isArray(verseMetas)) return [];
  const ids = verseMetas
    .map((item) => {
      if (!isRecord(item)) return null;
      const raw = item.verse_id;
      const id = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(id) ? id : null;
    })
    .filter((id): id is number => id !== null);

  return Array.from(new Set(ids));
};

const getScenePageCount = (headers: unknown): number => {
  if (!isRecord(headers)) return 1;
  const raw = headers["x-pagination-page-count"];
  const count = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(count) && count > 0 ? count : 1;
};

const sceneDisplayName = (scene: VerseData): string => {
  const rawName = typeof scene.name === "string" ? scene.name.trim() : "";
  if (rawName) return rawName;
  return `${t("meta.list.properties.sceneFallback")}${scene.id}`;
};

const getEntityScenes = async (
  verseMetas: unknown
): Promise<EntitySceneItem[]> => {
  const sceneIds = extractEntitySceneIds(verseMetas);
  if (sceneIds.length === 0) return [];

  const sceneIdSet = new Set(sceneIds);
  const sceneNameMap = new Map<number, string>();
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const response = await getVerses({
        sort: "-updated_at",
        page,
        perPage: 100,
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      rows.forEach((scene) => {
        if (sceneIdSet.has(scene.id) && !sceneNameMap.has(scene.id)) {
          sceneNameMap.set(scene.id, sceneDisplayName(scene));
        }
      });

      pageCount = getScenePageCount(response.headers);
      page += 1;
    } while (page <= pageCount && sceneNameMap.size < sceneIds.length);
  } catch (error) {
    logger.error("Failed to load entity scenes", error);
  }

  return sceneIds.map((sceneId) => ({
    id: sceneId,
    name:
      sceneNameMap.get(sceneId) ||
      `${t("meta.list.properties.sceneFallback")}${sceneId}`,
  }));
};

const findSceneIdByName = async (sceneName: string): Promise<number | null> => {
  const name = sceneName.trim();
  if (!name) return null;

  try {
    const response = await getVerses({
      sort: "-updated_at",
      search: name,
      page: 1,
      perPage: 50,
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length === 0) return null;

    const exact = rows.find((scene) => sceneDisplayName(scene) === name);
    return exact?.id ?? rows[0].id ?? null;
  } catch (error) {
    logger.error("Failed to resolve scene by name", error);
    return null;
  }
};

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

const extractBracketTitle = (value: string): string => {
  const decoded = decodeRouteText(value).trim();
  if (!decoded) return "";
  const match = decoded.match(/【[^】]+】/);
  return match ? match[0] : "";
};

// 计算属性
const id = computed(() => parseInt(route.query.id as string));
const title = computed(() =>
  extractBracketTitle((route.query.title as string) || "")
);
const src = computed(() => {
  const query: Record<string, string | number> = {
    language: appStore.language,
    v: env.buildVersion,
    api: env.api,
  };

  const url =
    `${env.editor}/three.js/editor/meta-editor.html` +
    qs.stringify(query, true);

  return url;
  //return `${env.editor}/three.js/editor/meta-editor.html?language=${appStore.language}&timestamp=${Date.now()}`;
});

const selectedPhototype = async (
  phototype: PhototypeType,
  _replace: boolean = false
) => {
  logger.error(phototype.resource);
  const schemaRoot =
    (phototype.schema as { root?: unknown } | null | undefined)?.root ?? null;
  if (!isJsonSchema(schemaRoot)) {
    ElMessage.warning(t("verse.view.error3"));
    return;
  }
  phototypeDialogRef.value?.open(schemaRoot, (data: unknown) => {
    // const d = { ...data, id: phototype.id };
    sendRequest("load-phototype", {
      data: {
        type: phototype.type,
        context: JSON.stringify(data),
      },
      type: "phototype",
      title: phototype.title,
    });
  });
};
// 资源操作相关函数
const selected = async (info: CardInfo, replace: boolean = false) => {
  if (info.type === "phototype") {
    logger.error(info.context);
    if (isPhototypeType(info.context)) {
      selectedPhototype(info.context, replace);
    } else {
      logger.error("phototype数据格式错误:", info.context);
    }
    return;
  }
  if (replace) {
    sendRequest("replace-resource", info.context as Record<string, unknown>);
  } else {
    sendRequest("load-resource", info.context as Record<string, unknown>);
  }
};

const loadResource = (data: unknown) => {
  if (!hasTypeField(data)) return;
  dialog.value.open(null, id.value, data.type);
};

const replaceResource = (data: unknown) => {
  if (!hasTypeField(data)) return;
  dialog.value.open(null, id.value, data.type, "replace");
};

// 权限检查
const saveable = (data: unknown) => {
  if (!isRecord(data)) {
    return false;
  }
  return Boolean(data.editable);
};

// 消息发送基础设施
const { postStandardMessage, sendRequest, pendingRequests, getHostSessionId } =
  useIframeMessaging(editor, {
    onError: () => ElMessage.error(t("meta.scene.error")),
  });

const editorInitialization = useIframeInitialization({
  frame: () => editor.value,
  owner: () => id.value,
  src: () => src.value,
  frameKey: () => editorFrameKey.value,
  sendInit: (payload) => postStandardMessage("INIT", payload),
});

const webMcpRpc = createIframeRpc({
  frame: () => editor.value,
  session: getHostSessionId,
  ready: editorInitialization.isReady,
  send: sendRequest,
});
const requestEditor = webMcpRpc.request;

const requireSuccessfulEditorResponse = (response: Record<string, unknown>) => {
  if (response.ok !== true) {
    throw new Error(
      typeof response.error === "string" ? response.error : "实体编辑器操作失败"
    );
  }
  return response;
};

const formatTransformVector = (value: { x: number; y: number; z: number }) =>
  `${value.x.toFixed(3)} / ${value.y.toFixed(3)} / ${value.z.toFixed(3)}`;

const formatTransformConfirmation = (preview: NodeTransformPreview) => {
  const lines = [`确认修改节点“${preview.nodeName}”吗？`];
  const appendChange = (
    label: string,
    current: { x: number; y: number; z: number },
    proposed: { x: number; y: number; z: number }
  ) => {
    if (formatTransformVector(current) !== formatTransformVector(proposed)) {
      lines.push(
        `${label}：${formatTransformVector(current)} → ${formatTransformVector(
          proposed
        )}`
      );
    }
  };
  appendChange("位置", preview.current.position, preview.proposed.position);
  appendChange(
    "旋转角度",
    preview.current.rotationDegrees,
    preview.proposed.rotationDegrees
  );
  appendChange("缩放", preview.current.scale, preview.proposed.scale);
  lines.push("确认后将立即保存到当前实体");
  return lines.join("\n");
};

const formatNodePropertyConfirmation = (preview: NodePropertyPreview) => {
  const lines = [`确认修改节点“${preview.nodeName}”吗？`];
  if (preview.current.name !== preview.proposed.name) {
    lines.push(`名称：${preview.current.name} → ${preview.proposed.name}`);
  }
  if (preview.current.visible !== preview.proposed.visible) {
    lines.push(
      `可见性：${preview.current.visible ? "显示" : "隐藏"} → ${
        preview.proposed.visible ? "显示" : "隐藏"
      }`
    );
  }
  lines.push("确认后将立即保存到当前实体");
  return lines.join("\n");
};

const formatResourcePlacementConfirmation = (
  preview: ResourcePlacementPreview
) =>
  [
    `确认把素材“${preview.resourceName}”放入当前实体吗？`,
    `类型：${preview.resourceType}`,
    `素材 ID：${preview.resourceId}`,
    "确认后将在实体根层级创建节点并立即保存",
  ].join("\n");

const formatAssetRenameConfirmation = (preview: AssetRenamePreview) =>
  [
    `确认重命名素材“${preview.currentName}”吗？`,
    `类型：${preview.resourceType}`,
    `素材 ID：${preview.resourceId}`,
    `新名称：${preview.proposedName}`,
    "这是素材库中的全局名称；当前实体里已有节点的名称不会自动改变",
  ].join("\n");

const formatNodeReparentConfirmation = (preview: NodeReparentPreview) =>
  [
    `确认移动节点“${preview.nodeName}”吗？`,
    `当前父级：${preview.currentParent.parentName}`,
    `目标父级：${preview.proposedParent.parentName}`,
    "节点本地位置、旋转和缩放值保持不变，视觉位置可能随父节点坐标系变化",
    "确认后将立即保存到当前实体",
  ].join("\n");

const formatNodeDeletionConfirmation = (preview: NodeDeletionPreview) => {
  const lines = [
    `确认删除节点“${preview.nodeName}”吗？`,
    `类型：${preview.nodeType}`,
    `当前父级：${preview.parent.parentName}`,
    `将删除：目标节点及 ${preview.descendantCount} 个子节点，共 ${
      preview.descendantCount + 1
    } 个节点`,
  ];
  if (preview.descendantNames.length > 0) {
    lines.push(`包含子节点：${preview.descendantNames.join("、")}`);
    if (preview.descendantCount > preview.descendantNames.length) {
      lines.push(
        `另有 ${preview.descendantCount - preview.descendantNames.length} 个子节点`
      );
    }
  }
  lines.push("确认后将立即删除并保存；仍可在当前编辑器中撤销后重新保存");
  return lines.join("\n");
};

const formatNodeOrderConfirmation = (preview: NodeOrderPreview) =>
  [
    `确认调整节点“${preview.nodeName}”的同级顺序吗？`,
    `父级：${preview.current.parentName}`,
    `当前序号：${preview.current.currentIndex + 1} / ${
      preview.current.siblingCount
    }`,
    `目标序号：${preview.proposed.targetIndex + 1} / ${
      preview.current.siblingCount
    }`,
    preview.proposed.beforeNodeName
      ? `放到“${preview.proposed.beforeNodeName}”之前`
      : "移动到同级末尾",
    "只调整同一父级内的顺序，不改变父级或节点变换；确认后将立即保存",
  ].join("\n");

const formatNodeCloneConfirmation = (preview: NodeClonePreview) =>
  [
    `确认复制节点“${preview.nodeName}”吗？`,
    `类型：${preview.nodeType}`,
    `父级：${preview.parent.parentName}`,
    `新名称：${preview.proposedName}`,
    `将复制：源节点及 ${preview.descendantCount} 个子节点，共 ${
      preview.descendantCount + 1
    } 个节点`,
    "复制件将插入源节点之后，并为节点、组件和指令生成新的 UUID",
    "确认后将立即保存到当前实体",
  ].join("\n");

const summarizeNodeBatchChange = (item: NodeBatchPreviewItem) => {
  const parts: string[] = [];
  if (item.current.transform && item.proposed.transform) {
    if (
      formatTransformVector(item.current.transform.position) !==
      formatTransformVector(item.proposed.transform.position)
    ) {
      parts.push(
        `位置 ${formatTransformVector(
          item.current.transform.position
        )} → ${formatTransformVector(item.proposed.transform.position)}`
      );
    }
    if (
      formatTransformVector(item.current.transform.rotationDegrees) !==
      formatTransformVector(item.proposed.transform.rotationDegrees)
    ) {
      parts.push(
        `旋转 ${formatTransformVector(
          item.current.transform.rotationDegrees
        )} → ${formatTransformVector(item.proposed.transform.rotationDegrees)}`
      );
    }
    if (
      formatTransformVector(item.current.transform.scale) !==
      formatTransformVector(item.proposed.transform.scale)
    ) {
      parts.push(
        `缩放 ${formatTransformVector(
          item.current.transform.scale
        )} → ${formatTransformVector(item.proposed.transform.scale)}`
      );
    }
  }
  if (item.current.properties && item.proposed.properties) {
    if (item.current.properties.name !== item.proposed.properties.name) {
      parts.push(
        `名称 ${item.current.properties.name} → ${item.proposed.properties.name}`
      );
    }
    if (item.current.properties.visible !== item.proposed.properties.visible) {
      parts.push(
        `可见性 ${item.current.properties.visible ? "显示" : "隐藏"} → ${
          item.proposed.properties.visible ? "显示" : "隐藏"
        }`
      );
    }
  }
  return `${item.nodeName}：${parts.join("；") || "无变化"}`;
};

const formatNodeBatchConfirmation = (preview: NodeBatchPreview) =>
  [
    `确认批量修改 ${preview.changedCount} 个节点吗？`,
    ...preview.changes
      .filter((item) => item.changed)
      .map((item, index) => `${index + 1}. ${summarizeNodeBatchChange(item)}`),
    "全部修改将作为一个可撤销操作执行，并且只保存一次",
  ].join("\n");

const formatComponentChange = (item: ComponentBatchPreviewItem) => {
  const operation =
    item.operation === "add"
      ? "添加"
      : item.operation === "remove"
        ? "移除"
        : "更新";
  const lines = [`${operation} ${item.componentType}：节点“${item.nodeName}”`];
  if (item.operation === "update" && item.current && item.proposed) {
    lines.push(
      `${JSON.stringify(item.current.settings)} → ${JSON.stringify(
        item.proposed.settings
      )}`
    );
  } else if (item.proposed) {
    lines.push(`设置：${JSON.stringify(item.proposed.settings)}`);
  }
  return lines.join("；");
};

const formatComponentBatchConfirmation = (preview: ComponentBatchPreview) =>
  [
    `确认执行 ${preview.changedCount} 项组件修改吗？`,
    ...preview.changes
      .filter((item) => item.changed)
      .map((item, index) => `${index + 1}. ${formatComponentChange(item)}`),
    "Action、Moved、Trigger 的互斥规则和目标节点有效性已经检查",
    "全部修改将作为一个可撤销操作执行，并且只保存一次",
  ].join("\n");

type SignalCode = {
  blockly?: string;
  lua?: string;
  js?: string;
};

const decompressSignalBlockly = (value: string) => {
  if (!value.startsWith("compressed:")) return value;
  const binary = safeAtob(value.slice(11));
  if (binary === null) throw new Error("Blockly 数据不是有效的 Base64");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return pako.inflate(bytes, { to: "string" });
};

const countSignalId = (source: string, signalId: string) => {
  let count = 0;
  let offset = 0;
  while (offset < source.length) {
    const index = source.indexOf(signalId, offset);
    if (index < 0) break;
    count += 1;
    offset = index + signalId.length;
  }
  return count;
};

const appendSignalCodeReferences = (
  references: Map<string, SignalReference[]>,
  signalIds: string[],
  code: SignalCode | null | undefined,
  context:
    | { scope: "entity_script" }
    | { scope: "scene_script"; sceneId: number; sceneName: string }
) => {
  if (!code) return;
  const sources: Array<{
    source: SignalReference["source"];
    value: string;
  }> = [];
  if (typeof code.blockly === "string" && code.blockly) {
    sources.push({
      source: "blockly",
      value: decompressSignalBlockly(code.blockly),
    });
  }
  if (typeof code.lua === "string" && code.lua) {
    sources.push({ source: "lua", value: code.lua });
  }
  if (typeof code.js === "string" && code.js) {
    sources.push({ source: "js", value: code.js });
  }

  for (const signalId of signalIds) {
    for (const source of sources) {
      const count = countSignalId(source.value, signalId);
      if (count === 0) continue;
      references.get(signalId)?.push({
        ...context,
        source: source.source,
        count,
      });
    }
  }
};

const getSignalReferences = async (signalIds: string[]) => {
  const uniqueSignalIds = Array.from(new Set(signalIds));
  const references = new Map<string, SignalReference[]>(
    uniqueSignalIds.map((signalId) => [signalId, []])
  );
  if (uniqueSignalIds.length === 0) return references;

  const entity = metaDetail.value as metaInfo | null;
  if (!entity || !Number.isFinite(entity.id)) {
    throw new Error("实体数据尚未加载完成");
  }

  try {
    const [entityResponse, sceneResponses] = await Promise.all([
      getMeta(entity.id, { expand: "metaCode" }),
      Promise.all(
        entityScenes.value.map(async (scene) => ({
          scene,
          response: await getVerse(scene.id, "verseCode"),
        }))
      ),
    ]);
    appendSignalCodeReferences(
      references,
      uniqueSignalIds,
      entityResponse.data.metaCode,
      { scope: "entity_script" }
    );
    sceneResponses.forEach(({ scene, response }) => {
      appendSignalCodeReferences(
        references,
        uniqueSignalIds,
        response.data.verseCode,
        {
          scope: "scene_script",
          sceneId: scene.id,
          sceneName: scene.name,
        }
      );
    });
    return references;
  } catch (error) {
    logger.error("WebMCP signal reference scan failed", error);
    throw new Error("无法完成信号脚本引用检查，请稍后重试");
  }
};

const signalDirectionLabel = (direction: "input" | "output") =>
  direction === "input" ? "输入" : "输出";

const formatSignalBatchConfirmation = (preview: SignalBatchPreview) =>
  [
    `确认执行 ${preview.changedCount} 项信号修改吗？`,
    ...preview.changes
      .filter((item) => item.changed)
      .map((item, index) => {
        const direction = signalDirectionLabel(item.direction);
        if (item.operation === "add") {
          return `${index + 1}. 添加${direction}信号“${item.proposed?.title}”`;
        }
        if (item.operation === "remove") {
          return `${index + 1}. 移除${direction}信号“${item.current?.title}”`;
        }
        return `${index + 1}. 重命名${direction}信号：${item.current?.title} → ${item.proposed?.title}`;
      }),
    "信号 UUID 保持稳定；待删除信号的实体及场景脚本引用已经检查",
    "全部修改将作为一个可撤销操作执行，并且只保存一次",
  ].join("\n");

const confirmSaveCurrentEntity = () =>
  ElMessageBox.confirm(t("common.entitySaveConfirm.message"), "", {
    showClose: true,
    center: true,
    distinguishCancelAndClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    showCancelButton: true,
    customClass: "script-save-confirm-box",
    confirmButtonText: t("common.entitySaveConfirm.confirm"),
    cancelButtonText: t("common.entitySaveConfirm.cancel"),
  });

const {
  hasUnsavedChangesBeforeUnload,
  hasUnconfirmedPersistence,
  markPersistenceUnverified,
  markPersistenceAcknowledged,
  resetUnsavedState,
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
  confirmDialog: confirmSaveCurrentEntity,
  onBeforeSave: (trigger) => {
    currentSaveTrigger = trigger;
  },
});

// 获取可用的资源类型
const getAvailableResourceTypes = () => {
  const resourceTypes = [
    "polygen",
    "picture",
    "video",
    "voxel",
    "audio",
    "particle",
    "phototype",
  ]; // 所有资源类型

  return resourceTypes.filter((type) =>
    ability.can("edit", new AbilityEdit(type))
  );
};

// 保存元数据
const saveMeta = async (
  {
    meta,
    events,
  }: {
    meta: MetaPayload;
    events: unknown;
  },
  trigger: ScriptSaveTrigger = "manual",
  onServerSaved?: () => void,
  write?: WriteOptions,
  rethrowFailure = false
): Promise<boolean> => {
  const savedOwnerId = id.value;
  const savedOwner = metaDetail.value;
  const savedSession = getHostSessionId();
  if (!metaDetail.value || !saveable(metaDetail.value as metaInfo)) {
    ElMessage.info(t("meta.scene.info"));
    return false;
  }

  // 在上传前处理 meta 数据，确保 name 唯一
  const renameEntities = (entities: MetaEntity[]) => {
    const nameCount: Record<string, number> = {};

    entities.forEach((entity) => {
      let name = entity.parameters.name;

      // 提取基础名称和当前计数
      const match = name.match(/^(.*?)(?: \((\d+)\))?$/);
      let baseName = match?.[1]?.trim() || name;
      let currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!nameCount[baseName]) {
        nameCount[baseName] = currentCount > 0 ? currentCount : 1;
      } else {
        nameCount[baseName]++;
      }

      // 生成唯一名称
      const newCount = nameCount[baseName];
      entity.parameters.name =
        newCount > 1 ? `${baseName} (${newCount})` : baseName;
    });
  };

  // 调用重命名函数处理 meta.data.children.entities
  if (meta?.children?.entities) {
    renameEntities(meta.children.entities);
  }

  markPersistenceUnverified();
  try {
    const savedResponse = await putMeta(
      savedOwnerId,
      {
        data: meta,
        events: events as import("@/api/v1/types/meta").Events | null,
      },
      write ??
        createWriteOptions(
          (metaDetail.value as metaInfo | null)?.serverRevision
        )
    );
    onServerSaved?.();
    if (
      id.value !== savedOwnerId ||
      metaDetail.value !== savedOwner ||
      getHostSessionId() !== savedSession
    )
      return false;
    applyWriteRevision(metaDetail.value as metaInfo, savedResponse);
    if (metaDetail.value) {
      const currentMetaDetail = metaDetail.value as metaInfo;
      const nextMetaDetail = JSON.parse(
        JSON.stringify(currentMetaDetail)
      ) as metaInfo;
      nextMetaDetail.data = JSON.parse(JSON.stringify(meta));
      nextMetaDetail.events = JSON.parse(
        JSON.stringify(events as import("@/api/v1/types/meta").Events | null)
      ) as import("@/api/v1/types/meta").Events | null;
      metaDetail.value = nextMetaDetail;
    }
    if (!onServerSaved) markPersistenceAcknowledged();
    if (trigger === "manual") {
      Message.success(t("meta.scene.success"));
    }
    return true;
  } catch (error) {
    if (rethrowFailure) throw error;
    if (id.value === savedOwnerId && getHostSessionId() === savedSession)
      ElMessage.error(t(writeFailureMessageKey(error)));
    return false;
  }
};

const persistWebMcpMutation = async (
  response: Record<string, unknown>,
  failureMessage: string,
  preview: object
) => {
  if (response.noChange)
    return { editorApplied: false, persistence: "unchanged" };
  const ownerId = id.value;
  markPersistenceUnverified();
  if (response.readBackVerified === false || !isRecord(response.meta)) {
    throw new WebMcpCompletionError(
      {
        status: "partial",
        editorApplied: true,
        persistence: "unverified",
        retry: "read_state_before_retry",
        ownerId,
        nodeId: response.nodeId,
      },
      "编辑器已应用修改，但未返回可保存的实体快照，请重新读取状态"
    );
  }
  const ownerSession = getHostSessionId();
  currentSaveTrigger = "manual";
  isSavingVersion.value = true;
  const saveData = {
    meta: response.meta as MetaPayload,
    events: response.events,
  };
  let serverSaved = false;
  let editorAcknowledged = false;
  try {
    const saved = await saveMeta(
      saveData,
      currentSaveTrigger,
      () => {
        serverSaved = true;
      },
      writeOptionsForPreview(
        preview,
        (metaDetail.value as metaInfo | null)?.serverRevision
      ),
      true
    );
    if (!saved && !serverSaved) {
      throw new WebMcpCompletionError(
        {
          status: "partial",
          editorApplied: true,
          persistence: "unverified",
          retry: "read_state_before_retry",
          ownerId,
          nodeId: response.nodeId,
          entityVersion: response.entityVersion,
        },
        failureMessage
      );
    }
    if (saved && ownerId === id.value && ownerSession === getHostSessionId()) {
      const savedModel = metaDetail.value;
      try {
        requireSuccessfulEditorResponse(
          await requestEditor("webmcp-mark-entity-saved", {
            expectedEntityVersion: response.entityVersion,
          })
        );
        editorAcknowledged = true;
      } catch {
        /* The backend receipt remains valid even if the editor changed. */
      }
      if (
        ownerId !== id.value ||
        ownerSession !== getHostSessionId() ||
        savedModel !== metaDetail.value
      )
        return {
          editorApplied: true,
          persistence: "server_acknowledged",
          editorAcknowledged,
          ownerId,
        };
      if (editorAcknowledged) markPersistenceAcknowledged();
      const savedAt = addSceneDraftVersion(saveData, currentSaveTrigger);
      pendingRestorePayload.value = null;
      lastSaveTrigger.value = currentSaveTrigger;
      lastSavedAt.value = savedAt || new Date().toISOString();
    }
    return {
      editorApplied: true,
      persistence: "server_acknowledged",
      editorAcknowledged,
      ownerId,
    };
  } catch (error) {
    if (!serverSaved)
      throw sceneWriteFailure(
        error,
        {
          ownerId,
          nodeId: response.nodeId,
          entityVersion: response.entityVersion,
        },
        failureMessage
      );
    return {
      editorApplied: true,
      persistence: "server_acknowledged",
      editorAcknowledged,
      ownerId,
      refreshWarning: "实体已保存，但页面状态刷新未完成，请重新读取",
    };
  } finally {
    if (ownerId === id.value && ownerSession === getHostSessionId())
      isSavingVersion.value = false;
  }
};

// 处理上传封面图片
const handleUploadCover = async (data: unknown) => {
  try {
    if (!hasImageData(data)) {
      ElMessage.error(t("meta.scene.coverUploadError"));
      return;
    }

    // 将base64图片数据转换为Blob对象
    const imageData = data.imageData;
    const byteString = safeAtob(imageData.split(",")[1]);
    if (!byteString) {
      ElMessage.error(t("meta.scene.coverUploadError"));
      return;
    }
    const mimeType = imageData.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const extension = mimeType.split("/")[1];
    const fileName = `cover_${id.value}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: mimeType });

    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("meta.scene.handlerError"));
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
      // 更新Meta的image_id
      const meta = await getMeta(id.value);
      if (meta && meta.data) {
        const updatePayload: UpdateMetaRequest = {
          ...meta.data,
          image_id: response.data.id ?? undefined,
        };
        await putMeta(id.value, updatePayload);
        ElMessage.success(t("meta.scene.coverUploadSuccess"));
        await refresh();
      }
    }
  } catch (error) {
    logger.error("Failed to upload cover image:", error);
    ElMessage.error(t("meta.scene.coverUploadFailed"));
  }
};

// 处理编辑器发来的消息（标准协议：msg.type 路由）
const handleMessage = async (e: MessageEvent) => {
  if (e.source !== editor.value?.contentWindow) return;
  try {
    if (e.origin !== new URL(editor.value.src, window.location.href).origin)
      return;
  } catch {
    return;
  }
  webMcpRpc.handleMessage(e);
  const msg = e.data;
  if (!msg || typeof msg.type !== "string") return;

  const payload = (msg.payload ?? {}) as Record<string, unknown>;

  switch (msg.type) {
    case "PLUGIN_READY":
      if (!editorInitialization.acceptReady(payload)) break;
      isSavingVersion.value = false;
      webMcpRpc.cancel("编辑器文档已重新加载");
      webMcpLifecycle?.abort();
      registerPageWebMcpTools();
      hasUnsavedChangesBeforeUnload.value = false;
      if (isRestoringDraft.value && metaDetail.value) {
        isRestoringDraft.value = false;
        const restoredMetaDetail = metaDetail.value as unknown as metaInfo;
        pushMetaToEditor(restoredMetaDetail);
        hasUnsavedChangesBeforeUnload.value = true;
      } else {
        await refresh();
      }
      break;

    case "RESPONSE": {
      const responseOwner = id.value;
      const responseSession = getHostSessionId();
      const isCurrentResponse = () =>
        responseOwner === id.value && responseSession === getHostSessionId();
      const action = payload.action as string | undefined;
      const requestId =
        typeof msg.requestId === "string" ? msg.requestId : undefined;
      const requestResolver = requestId
        ? pendingRequests.get(requestId)
        : undefined;
      if (requestResolver) {
        requestResolver(payload);
      }

      if (action?.startsWith("webmcp-")) {
        break;
      }

      if (action === "save" && !payload.noChange) {
        // Original save-meta logic
        currentSaveTrigger = "manual";
        isSavingVersion.value = true;
        const saveData = payload as unknown as {
          meta: MetaPayload;
          events: unknown;
        };
        const result = await saveMeta(saveData, currentSaveTrigger);
        if (!isCurrentResponse()) break;
        if (result) {
          const savedAt = addSceneDraftVersion(saveData, currentSaveTrigger);
          hasUnsavedChangesBeforeUnload.value = false;
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
        }
        isSavingVersion.value = false;
        resolveLeaveSave(result);
      } else if (action === "save" && payload.noChange) {
        if (hasUnconfirmedPersistence.value && !pendingRestorePayload.value) {
          isSavingVersion.value = false;
          resolveLeaveSave(false);
          ElMessage.error(t("common.editorSave.pending"));
          break;
        }
        // Original save-meta-none logic
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          const result = await saveMeta(
            {
              meta: restoredPayload.meta as MetaPayload,
              events: restoredPayload.events,
            },
            currentSaveTrigger
          );
          if (!isCurrentResponse()) break;
          if (result) {
            const savedAt = addSceneDraftVersion(
              {
                meta: restoredPayload.meta,
                events: restoredPayload.events,
              },
              currentSaveTrigger
            );
            pendingRestorePayload.value = null;
            hasUnsavedChangesBeforeUnload.value = false;
            lastSaveTrigger.value = currentSaveTrigger;
            lastSavedAt.value = savedAt || new Date().toISOString();
          }
          isSavingVersion.value = false;
          resolveLeaveSave(result);
        } else {
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          ElMessage.warning(t("meta.scene.noChanges"));
          hasUnsavedChangesBeforeUnload.value = false;
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        }
      } else if (action === "save-before-leave" && !payload.noChange) {
        // Original save-meta-before-leave logic
        isSavingVersion.value = true;
        const saveData = payload as unknown as {
          meta: MetaPayload;
          events: unknown;
        };
        const result = await saveMeta(saveData, currentSaveTrigger);
        if (!isCurrentResponse()) break;
        if (result) {
          const savedAt = addSceneDraftVersion(saveData, currentSaveTrigger);
          hasUnsavedChangesBeforeUnload.value = false;
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          if (currentSaveTrigger === "auto") {
            Message.success(t("common.scriptDraft.autoSavedNotice"));
          }
        }
        isSavingVersion.value = false;
        resolveLeaveSave(result);
      } else if (action === "save-before-leave" && payload.noChange) {
        if (hasUnconfirmedPersistence.value && !pendingRestorePayload.value) {
          isSavingVersion.value = false;
          resolveLeaveSave(false);
          ElMessage.error(t("common.editorSave.pending"));
          break;
        }
        // Original save-meta-before-leave-none logic
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          const result = await saveMeta(
            {
              meta: restoredPayload.meta as MetaPayload,
              events: restoredPayload.events,
            },
            currentSaveTrigger
          );
          if (!isCurrentResponse()) break;
          if (result) {
            const savedAt = addSceneDraftVersion(
              {
                meta: restoredPayload.meta,
                events: restoredPayload.events,
              },
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
        if (!requestResolver) {
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

      if (event === "load-resource") {
        loadResource(payload);
      } else if (event === "replace-resource") {
        replaceResource(payload);
      } else if (event === "goto") {
        if (payload.target === "blockly.js") {
          const scriptRoute = router
            .getRoutes()
            .find((route) => route.path === "/meta/script");

          if (scriptRoute && scriptRoute.meta.title) {
            const metaTitle = translateRouteTitle(scriptRoute.meta.title);

            router.push({
              path: "/meta/script",
              query: {
                id: id.value,
                title: metaTitle + title.value,
              },
            });
          }
        } else if (payload.target === "verse.scene") {
          const rawSceneId = payload.sceneId;
          let sceneId =
            typeof rawSceneId === "number" ? rawSceneId : Number(rawSceneId);
          const sceneName =
            typeof payload.sceneName === "string" &&
            (payload.sceneName as string).trim()
              ? (payload.sceneName as string).trim()
              : t("verse.listPage.unnamed");

          if (!Number.isFinite(sceneId)) {
            const resolvedSceneId = await findSceneIdByName(sceneName);
            if (resolvedSceneId === null) {
              break;
            }
            sceneId = resolvedSceneId;
          }

          const sceneTitle = encodeURIComponent(
            t("verse.listPage.editorTitle", { name: sceneName })
          );

          router.push({
            path: "/verse/scene",
            query: { id: sceneId, title: sceneTitle },
          });
        }
      } else if (event === "upload-cover") {
        handleUploadCover(payload);
      } else if (event === "get-available-resource-types") {
        await until(() => userStore.userInfo != null).toBeTruthy();
        const availableTypes = getAvailableResourceTypes();
        postStandardMessage("EVENT", {
          event: "available-resource-types",
          types: availableTypes,
        });
      }
      break;
    }
  }
};

const pushMetaToEditor = (
  meta: metaInfo,
  ticket: IframeInitializationTicket | null = editorInitialization.begin()
) => {
  if (!ticket || !editorInitialization.isCurrent(ticket)) return;
  const availableTypes = getAvailableResourceTypes();
  webMcpRpc.cancel("编辑器正在重新初始化");
  editorInitialization.send(ticket, {
    token: null,
    config: {
      data: meta,
      saveable: saveable(meta),
      availableResourceTypes: availableTypes,
      entityScenes: entityScenes.value,
      entitySceneNames: entityScenes.value.map((scene) => scene.name),
      user: {
        id: userStore.userInfo?.id || null,
        role: userStore.getRole(),
      },
      system: {},
    },
  });
  registerPageWebMcpTools();
};

// 刷新元数据
const refresh = async () => {
  const ticket = editorInitialization.begin();
  if (!ticket) return;
  webMcpRpc.cancel("编辑器正在重新初始化");
  try {
    const metaResponse = await getMeta(ticket.owner, { expand: "verseMetas" });
    if (!editorInitialization.isCurrent(ticket)) return;
    const nextMetaDetail = metaResponse.data as metaInfo;
    const nextEntityScenes = await getEntityScenes(nextMetaDetail.verseMetas);
    if (!editorInitialization.isCurrent(ticket)) return;
    metaDetail.value = nextMetaDetail;
    entityScenes.value = nextEntityScenes;
    pushMetaToEditor(nextMetaDetail, ticket);
  } catch (error) {
    editorInitialization.fail(ticket);
    if (editorInitialization.isCurrent(ticket)) logger.error(error);
  }
};

const resetEditorStateForSceneChange = () => {
  isRestoringDraft.value = false;
  pendingRestorePayload.value = null;
  resetUnsavedState();
  isSavingVersion.value = false;
  metaDetail.value = null;
  entityScenes.value = [];
  loadSceneDraftState();
  restartAutoSaveTimer();
  webMcpRpc.cancel();
  webMcpLifecycle?.abort();
  editorFrameKey.value += 1;
  registerPageWebMcpTools();
};

watch(
  [id, src, editorFrameKey],
  () => {
    editorInitialization.reset();
    webMcpRpc.cancel("编辑器目标已改变");
    webMcpLifecycle?.abort();
    registerPageWebMcpTools();
  },
  { flush: "sync" }
);

watch(id, (newId, oldId) => {
  if (!Number.isFinite(newId) || newId === oldId) return;
  resetEditorStateForSceneChange();
});

// 生命周期钩子
onMounted(() => {
  loadSceneDraftState();
  activateToolbar();
  restartAutoSaveTimer();
  window.addEventListener("message", handleMessage);
  window.addEventListener("beforeunload", handleBeforeUnload);
  void syncUnsavedChangesForBeforeUnload();
  unsavedCheckPollingTimer = window.setInterval(() => {
    void syncUnsavedChangesForBeforeUnload();
  }, 2000);

  registerPageWebMcpTools();
});

const registerPageWebMcpTools = () => {
  const ownerId = id.value;
  const ownerSession = getHostSessionId();
  let registration: AbortController | null = null;
  const assertActive = () => {
    if (
      registration?.signal.aborted ||
      ownerId !== id.value ||
      ownerSession !== getHostSessionId()
    ) {
      throw new Error("编辑器会话已经切换，请重新预览");
    }
  };
  const requestEditor = (...args: Parameters<typeof webMcpRpc.request>) => {
    assertActive();
    return webMcpRpc.request(...args);
  };
  const saveWebMcpMutation = (
    ...args: Parameters<typeof persistWebMcpMutation>
  ) => {
    try {
      assertActive();
    } catch {
      throw new WebMcpCompletionError(
        {
          status: "partial",
          editorApplied: true,
          persistence: "unverified",
          retry: "read_state_before_retry",
          ownerId,
          nodeId: args[0].nodeId,
          moduleId: args[0].moduleId,
        },
        "编辑器已应用修改，但会话已切换，请重新读取状态"
      );
    }
    return persistWebMcpMutation(...args);
  };

  webMcpLifecycle?.abort();
  registration = webMcpLifecycle = registerEntityEditorWebMcpTools({
    operations: {
      getScope: () => ({
        actorId: String(userStore.userInfo?.id ?? ""),
        targetType: "meta",
        targetId: id.value,
        serverRevision:
          (metaDetail.value as metaInfo | null)?.serverRevision ?? "",
      }),
    },
    getContext: () => ({
      entity: metaDetail.value as metaInfo | null,
      dirty: hasUnsavedChangesBeforeUnload.value,
      loading: !editorInitialization.isReady() || metaDetail.value === null,
      sceneNames: entityScenes.value.map((scene) => scene.name),
    }),
    getLiveContext: async () => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity) throw new Error("实体尚未加载完成");
      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-get-entity-state")
      );
      if (
        (metaDetail.value as metaInfo | null)?.id !== entity.id ||
        Number(response.entityId) !== entity.id
      ) {
        throw new Error("当前实体已切换，请重新读取");
      }
      hasUnsavedChangesBeforeUnload.value = Boolean(response.changed);
      return {
        entity: {
          ...entity,
          data: response.meta,
          events: response.events,
        } as metaInfo,
        dirty: Boolean(response.changed),
        loading: Boolean(response.loading),
        sceneNames: entityScenes.value.map((scene) => scene.name),
        source: "live-editor",
        entityVersion: String(response.entityVersion),
        contextGeneration: Number(response.contextGeneration),
      };
    },
    searchAssets: async ({ type, query, page, pageSize }) => {
      const response = await getResources(
        type,
        "-created_at",
        query,
        page,
        "image",
        pageSize
      );
      const totalHeader = response.headers?.["x-pagination-total-count"];
      const total = Number(totalHeader);
      return {
        items: response.data,
        page,
        pageSize,
        total: Number.isFinite(total) ? total : undefined,
      };
    },
    stageNodeTransform: async (nodeId, transform) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建变换预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-transform", {
          nodeId,
          transform,
        })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        current: response.current as NodeTransformSnapshot,
        proposed: response.proposed as NodeTransformSnapshot,
        changed: Boolean(response.changed),
      };
    },
    confirmNodeTransform: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatTransformConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeTransform: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建变换预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-transform",
          {
            nodeId: preview.nodeId,
            expectedCurrent: preview.current,
            proposed: preview.proposed,
          },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点变换已应用，但保存到服务器失败，请手动保存",
        preview
      );

      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.nodeName),
        transform: response.transform as NodeTransformSnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageNodeProperties: async (nodeId, properties) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建属性预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-properties", {
          nodeId,
          properties,
        })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        current: response.current as NodePropertySnapshot,
        proposed: response.proposed as NodePropertySnapshot,
        changed: Boolean(response.changed),
      };
    },
    confirmNodeProperties: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodePropertyConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeProperties: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建属性预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-properties",
          {
            nodeId: preview.nodeId,
            expectedCurrent: preview.current,
            proposed: preview.proposed,
          },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点属性已应用，但保存到服务器失败，请手动保存",
        preview
      );

      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.nodeName),
        properties: response.properties as NodePropertySnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageResourcePlacement: async (resourceType, resourceId) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }
      if (!getAvailableResourceTypes().includes(resourceType)) {
        throw new Error(`当前账号不能在实体中使用 ${resourceType} 素材`);
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建素材放入预览");
      }

      const live = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-get-entity-state")
      );
      const resource = await fetchResourceByRef({
        id: resourceId,
        type: resourceType as RestorableResourceType,
      });
      if (!resource || resource.type.toLowerCase() !== resourceType) {
        throw new Error(`找不到 ${resourceType} 素材 ${resourceId}`);
      }
      return {
        entityId: entity.id,
        resourceId,
        entityVersion: String(live.entityVersion),
        resourceType,
        resourceName: resource.name || "未命名素材",
        resourceUpdatedAt: resource.updated_at,
      };
    },
    confirmResourcePlacement: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatResourcePlacementConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeResourcePlacement: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建素材放入预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }
      if (!getAvailableResourceTypes().includes(preview.resourceType)) {
        throw new Error(
          `当前账号不能在实体中使用 ${preview.resourceType} 素材`
        );
      }

      const resource = await fetchResourceByRef({
        id: preview.resourceId,
        type: preview.resourceType as RestorableResourceType,
      });
      if (!resource || resource.type.toLowerCase() !== preview.resourceType) {
        throw new Error("素材不存在或类型已经变化，请重新预览");
      }
      if (
        preview.resourceUpdatedAt &&
        resource.updated_at &&
        preview.resourceUpdatedAt !== resource.updated_at
      ) {
        throw new Error("素材在预览后已被更新，请重新预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-resource-placement",
          {
            resource,
            operationId: preview.operationId,
            expectedEntityVersion: preview.entityVersion,
          },
          120000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "素材节点已创建，但保存到服务器失败，请手动保存",
        preview
      );
      if ((metaDetail.value as metaInfo | null)?.id === preview.entityId) {
        const current = metaDetail.value as metaInfo;
        current.resources = [
          ...(current.resources ?? []).filter(
            (item) => item.id !== resource.id
          ),
          resource,
        ];
      }
      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.resourceName),
        nodeType: String(response.nodeType || preview.resourceType),
        resourceId: Number(response.resourceId),
      };
    },
    stageNodeReparent: async (nodeId, parentNodeId) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建层级预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-reparent", {
          nodeId,
          parentNodeId,
        })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        currentParent: response.currentParent as NodeParentSnapshot,
        proposedParent: response.proposedParent as {
          parentNodeId: string | null;
          parentName: string;
        },
        changed: Boolean(response.changed),
      };
    },
    confirmNodeReparent: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodeReparentConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeReparent: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建层级预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-reparent",
          {
            nodeId: preview.nodeId,
            expectedCurrentParent: preview.currentParent,
            proposedParent: preview.proposedParent,
          },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点层级已修改，但保存到服务器失败，请手动保存",
        preview
      );
      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.nodeName),
        parent: response.parent as NodeParentSnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageNodeDeletion: async (nodeId) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建删除预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-deletion", { nodeId })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        nodeType: String(response.nodeType || "unknown"),
        parent: response.parent as NodeParentSnapshot,
        subtreeVersion: String(response.subtreeVersion),
        directChildCount: Number(response.directChildCount),
        descendantCount: Number(response.descendantCount),
        descendantNames: Array.isArray(response.descendantNames)
          ? response.descendantNames.map(String)
          : [],
      };
    },
    confirmNodeDeletion: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodeDeletionConfirmation(preview),
          "WebMCP 删除节点",
          {
            type: "warning",
            confirmButtonText: "删除并保存",
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeDeletion: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建删除预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-deletion",
          {
            nodeId: preview.nodeId,
            expected: {
              parent: preview.parent,
              subtreeVersion: preview.subtreeVersion,
              directChildCount: preview.directChildCount,
              descendantCount: preview.descendantCount,
            },
          },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点已从编辑器删除，但保存到服务器失败，请撤销删除或手动保存",
        preview
      );
      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.nodeName),
        removedNodeCount: Number(response.removedNodeCount),
        parent: response.parent as NodeParentSnapshot,
      };
    },
    stageNodeReorder: async (nodeId, beforeNodeId) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建顺序预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-reorder", {
          nodeId,
          beforeNodeId,
        })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        current: response.current as NodeOrderSnapshot,
        proposed: response.proposed as NodeOrderPreview["proposed"],
        changed: Boolean(response.changed),
      };
    },
    confirmNodeReorder: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodeOrderConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeReorder: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建顺序预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-reorder",
          {
            nodeId: preview.nodeId,
            expected: preview.current,
            proposed: preview.proposed,
          },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点顺序已修改，但保存到服务器失败，请手动保存",
        preview
      );
      return {
        ...persistence,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.nodeName),
        order: response.order as NodeOrderSnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageNodeClone: async (nodeId, name) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建复制预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-clone", { nodeId, name })
      );
      return {
        entityId: entity.id,
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        nodeType: String(response.nodeType || "unknown"),
        parent: response.parent as NodeParentSnapshot,
        sourceVersion: String(response.sourceVersion),
        siblingOrderVersion: String(response.siblingOrderVersion),
        directChildCount: Number(response.directChildCount),
        descendantCount: Number(response.descendantCount),
        proposedName: String(response.proposedName),
      };
    },
    confirmNodeClone: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodeCloneConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeClone: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建复制预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-clone",
          {
            nodeId: preview.nodeId,
            expected: {
              parent: preview.parent,
              sourceVersion: preview.sourceVersion,
              siblingOrderVersion: preview.siblingOrderVersion,
              directChildCount: preview.directChildCount,
              descendantCount: preview.descendantCount,
            },
            proposedName: preview.proposedName,
          },
          120000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "节点复制件已创建，但保存到服务器失败，请撤销复制或手动保存",
        preview
      );
      return {
        ...persistence,
        sourceNodeId: String(response.sourceNodeId),
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || preview.proposedName),
        nodeType: String(response.nodeType || preview.nodeType),
        clonedNodeCount: Number(response.clonedNodeCount),
        parent: response.parent as NodeParentSnapshot,
      };
    },
    stageNodeBatch: async (changes) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建批量预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-node-batch", { changes })
      );
      return {
        entityId: entity.id,
        changes: response.changes as NodeBatchPreviewItem[],
        changedCount: Number(response.changedCount),
      };
    },
    confirmNodeBatch: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatNodeBatchConfirmation(preview),
          "WebMCP 批量修改",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeNodeBatch: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建批量预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-node-batch",
          { changes: preview.changes },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "批量修改已应用，但保存到服务器失败，请撤销修改或手动保存",
        preview
      );
      return {
        ...persistence,
        noChange: Boolean(response.noChange),
        commandCount: Number(response.commandCount),
        changes: response.changes as NodeBatchCompletion["changes"],
      };
    },
    startAssetUpload: async (resourceType) => {
      if (!getAvailableResourceTypes().includes(resourceType)) {
        throw new Error(`当前账号不能上传 ${resourceType} 素材`);
      }

      const target = router.resolve({
        path: RESOURCE_UPLOAD_ROUTES[resourceType],
        query: { webmcpUpload: "1" },
      }).href;
      try {
        await ElMessageBox.confirm(
          [
            `准备打开 ${resourceType} 素材上传页面`,
            "新页面会自动打开平台原有上传对话框",
            "本地文件必须由你在系统文件选择器中选择，WebMCP 不会读取文件路径",
          ].join("\n"),
          "WebMCP 素材上传",
          {
            confirmButtonText: "打开上传页面",
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
      } catch {
        return {
          opened: false,
          resourceType,
          url: target,
          message: "用户取消打开素材上传页面",
        };
      }

      const uploadWindow = window.open(target, "_blank");
      if (!uploadWindow) {
        ElMessage.warning("浏览器阻止了新窗口，请允许弹窗后重试");
        return {
          opened: false,
          resourceType,
          url: target,
          message: "浏览器阻止了上传页面新窗口",
        };
      }
      uploadWindow.opener = null;
      return { opened: true, resourceType, url: target };
    },
    stageAssetRename: async (resourceType, resourceId, proposedName) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!getAvailableResourceTypes().includes(resourceType)) {
        throw new Error(`当前账号不能修改 ${resourceType} 素材`);
      }

      const resource = await fetchResourceByRef({
        id: resourceId,
        type: resourceType,
      });
      if (!resource || resource.type.toLowerCase() !== resourceType) {
        throw new Error(`找不到 ${resourceType} 素材 ${resourceId}`);
      }
      return {
        entityId: entity.id,
        resourceId,
        resourceType,
        currentName: resource.name || "未命名素材",
        proposedName,
        resourceUpdatedAt: resource.updated_at,
      };
    },
    confirmAssetRename: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatAssetRenameConfirmation(preview),
          "WebMCP 素材重命名",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeAssetRename: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建素材重命名预览");
      }
      if (!getAvailableResourceTypes().includes(preview.resourceType)) {
        throw new Error(`当前账号不能修改 ${preview.resourceType} 素材`);
      }

      const current = await fetchResourceByRef({
        id: preview.resourceId,
        type: preview.resourceType,
      });
      if (!current || current.type.toLowerCase() !== preview.resourceType) {
        throw new Error("素材不存在或类型已经变化，请重新预览");
      }
      if ((current.name || "未命名素材") !== preview.currentName) {
        throw new Error("素材名称在预览后已变化，请重新预览");
      }
      if (
        preview.resourceUpdatedAt &&
        current.updated_at &&
        preview.resourceUpdatedAt !== current.updated_at
      ) {
        throw new Error("素材在预览后已被更新，请重新预览");
      }

      assertActive();
      const updated = await updateResourceName(
        preview.resourceType,
        preview.resourceId,
        preview.proposedName
      );
      if (!updated) throw new Error("平台没有返回重命名后的素材数据");

      const localResource = entity.resources?.find(
        (resource) => resource.id === preview.resourceId
      );
      if (localResource) {
        localResource.name = preview.proposedName;
        if (updated.updated_at) localResource.updated_at = updated.updated_at;
      }
      ElMessage.success(`素材已重命名为“${preview.proposedName}”`);
      return {
        resourceId: preview.resourceId,
        resourceType: preview.resourceType,
        resourceName: preview.proposedName,
      };
    },
    getNodeComponents: async (nodeId) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-get-node-components", { nodeId })
      );
      return {
        nodeId: String(response.nodeId),
        nodeName: String(response.nodeName || "未命名节点"),
        nodeType: String(response.nodeType || "unknown"),
        components: Array.isArray(response.components)
          ? (response.components as NodeComponentList["components"])
          : [],
      };
    },
    stageComponentBatch: async (changes) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建组件预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-component-batch", { changes })
      );
      return {
        entityId: entity.id,
        changes: response.changes as ComponentBatchPreviewItem[],
        changedCount: Number(response.changedCount),
      };
    },
    confirmComponentBatch: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatComponentBatchConfirmation(preview),
          "WebMCP 组件修改",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeComponentBatch: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建组件预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-component-batch",
          { changes: preview.changes },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "组件修改已应用，但保存到服务器失败，请撤销修改或手动保存",
        preview
      );
      return {
        ...persistence,
        noChange: Boolean(response.noChange),
        commandCount: Number(response.commandCount),
        changes: response.changes as ComponentBatchCompletion["changes"],
      };
    },
    getEntitySignals: async () => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-get-entity-signals")
      );
      const inputs = Array.isArray(response.inputs)
        ? (response.inputs as EntitySignalList["inputs"])
        : [];
      const outputs = Array.isArray(response.outputs)
        ? (response.outputs as EntitySignalList["outputs"])
        : [];
      const referenceMap = await getSignalReferences(
        [...inputs, ...outputs].map((signal) => signal.signalId)
      );
      return {
        entityId: entity.id,
        inputs: inputs.map((signal) => ({
          ...signal,
          references: referenceMap.get(signal.signalId) ?? [],
        })),
        outputs: outputs.map((signal) => ({
          ...signal,
          references: referenceMap.get(signal.signalId) ?? [],
        })),
      };
    },
    stageSignalBatch: async (changes) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || !Number.isFinite(entity.id)) {
        throw new Error("实体数据尚未加载完成");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const unsavedResponse = await requestEditor("check-unsaved-changes");
      const hasUnsavedChanges =
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(unsavedResponse.changed) ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (hasUnsavedChanges) {
        throw new Error("当前实体存在未保存修改，请先保存后再创建信号预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-signal-batch", { changes })
      );
      const previewChanges = response.changes as SignalBatchPreviewItem[];
      const removalIds = previewChanges
        .filter((item) => item.operation === "remove")
        .map((item) => item.signalId);
      const referenceMap = await getSignalReferences(removalIds);
      const enrichedChanges = previewChanges.map((item) => {
        const references = referenceMap.get(item.signalId) ?? [];
        return {
          ...item,
          references,
          blockedReason:
            item.operation === "remove" && references.length > 0
              ? `信号仍被 ${references.length} 处脚本来源引用`
              : undefined,
        };
      });
      return {
        entityId: entity.id,
        changes: enrichedChanges,
        changedCount: Number(response.changedCount),
        blockedCount: enrichedChanges.filter((item) => item.blockedReason)
          .length,
      };
    },
    confirmSignalBatch: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatSignalBatchConfirmation(preview),
          "WebMCP 信号修改",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeSignalBatch: async (preview) => {
      const entity = metaDetail.value as metaInfo | null;
      if (!entity || entity.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建信号预览");
      }
      if (!saveable(entity)) {
        throw new Error("当前账号没有修改此实体的权限");
      }

      const removalIds = preview.changes
        .filter((item) => item.operation === "remove")
        .map((item) => item.signalId);
      const currentReferences = await getSignalReferences(removalIds);
      const newlyReferenced = removalIds.find(
        (signalId) => (currentReferences.get(signalId) ?? []).length > 0
      );
      if (newlyReferenced) {
        throw new Error(
          `信号 ${newlyReferenced} 在预览后出现脚本引用，请先修改对应脚本`
        );
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-signal-batch",
          { changes: preview.changes },
          30000
        )
      );
      const persistence = await saveWebMcpMutation(
        response,
        "信号修改已应用，但保存到服务器失败，请撤销修改或手动保存",
        preview
      );
      return {
        ...persistence,
        noChange: Boolean(response.noChange),
        commandCount: Number(response.commandCount),
        changes: response.changes as SignalBatchCompletion["changes"],
      };
    },
    onRegistrationError: (toolName, error) => {
      logger.warn(`WebMCP tool registration failed: ${toolName}`, error);
    },
  });
};

onActivated(() => {
  activateToolbar();
  registerPageWebMcpTools();
});
onDeactivated(() => {
  unregisterToolbar(toolbarOwner);
  webMcpLifecycle?.abort();
  webMcpRpc.cancel();
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
  editorInitialization.reset();
  webMcpLifecycle?.abort();
  webMcpLifecycle = null;
  webMcpRpc.cancel();
  postStandardMessage("DESTROY");
  unregisterToolbar(toolbarOwner);
  clearAutoSaveTimer();
  window.removeEventListener("message", handleMessage);
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
  border-radius: 0 !important;
}

.editor-wrapper {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  border-radius: 0 !important;
}

.editor-container {
  flex: 1;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 0 !important;
}

.content {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  border: 0;
  border-radius: 0 !important;
  outline: none;
}
</style>

<style lang="scss">
/* 隐藏当前页面的 footer */
.main-container:has(.verse-scene) > footer {
  display: none !important;
}
</style>
