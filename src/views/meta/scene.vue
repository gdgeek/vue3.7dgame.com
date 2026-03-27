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
import { getVerses, type VerseData } from "@/api/v1/verse";
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
let init = false;
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

const toolbarOwner = "meta-scene-editor";
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
  editorFrameKey.value += 1;
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
// 监听语言变化
watch(
  () => appStore.language,
  async () => {
    await refresh();
  }
);



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
const { postStandardMessage, sendRequest, pendingRequests } = useIframeMessaging(
  editor,
  { onError: () => ElMessage.error(t("meta.scene.error")) }
);

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
  onBeforeSave: (trigger) => { currentSaveTrigger = trigger; },
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
  trigger: ScriptSaveTrigger = "manual"
): Promise<boolean> => {
  if (!metaDetail.value || !saveable(metaDetail.value as metaInfo)) {
    ElMessage.info(t("meta.scene.info"));
    return true;
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

  try {
    await putMeta(id.value, {
      data: meta,
      events: events as import("@/api/v1/types/meta").Events | null,
    });
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
    if (trigger === "manual") {
      Message.success(t("meta.scene.success"));
    }
    return true;
  } catch (error) {
    ElMessage.error(t("meta.scene.saveError"));
    return false;
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
  const msg = e.data;
  if (!msg || typeof msg.type !== "string") return;

  const payload = (msg.payload ?? {}) as Record<string, unknown>;

  switch (msg.type) {
    case "PLUGIN_READY":
      hasUnsavedChangesBeforeUnload.value = false;
      if (isRestoringDraft.value && metaDetail.value) {
        isRestoringDraft.value = false;
        const restoredMetaDetail = metaDetail.value as unknown as metaInfo;
        pushMetaToEditor(restoredMetaDetail);
        hasUnsavedChangesBeforeUnload.value = true;
      } else if (!init) {
        init = true;
        await refresh();
      }
      break;

    case "RESPONSE": {
      const action = payload.action as string | undefined;

      if (action === "save" && !payload.noChange) {
        // Original save-meta logic
        currentSaveTrigger = "manual";
        isSavingVersion.value = true;
        const saveData = payload as unknown as {
          meta: MetaPayload;
          events: unknown;
        };
        const result = await saveMeta(saveData, currentSaveTrigger);
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
        } else if (payload.data === "rete.js") {
          router.push({
            path: "/meta/rete-meta",
            query: { id: id.value, title: title.value },
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

const pushMetaToEditor = (meta: metaInfo) => {
  const availableTypes = getAvailableResourceTypes();
  postStandardMessage("INIT", {
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
};

// 刷新元数据
const refresh = async () => {
  try {
    const metaResponse = await getMeta(id.value, { expand: "verseMetas" });
    const nextMetaDetail = metaResponse.data as metaInfo;
    metaDetail.value = nextMetaDetail;
    entityScenes.value = await getEntityScenes(nextMetaDetail.verseMetas);
    pushMetaToEditor(nextMetaDetail);
  } catch (error) {
    logger.error(error);
  }
};
// 生命周期钩子
onMounted(() => {
  loadSceneDraftState();
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
  restartAutoSaveTimer();
  window.addEventListener("message", handleMessage);
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
