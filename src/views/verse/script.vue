<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card class="box-card" :class="{ 'is-running-preview': disabled }">
          <el-container v-if="!disabled">
            <div class="script-tabs-wrapper">
              <div class="script-editor-toolbar">
                <div
                  class="script-mode-tabs"
                  role="tablist"
                  :aria-label="$t('verse.view.script.title')"
                >
                  <button
                    type="button"
                    class="script-mode-tab"
                    :class="{ 'is-active': activeName === 'blockly' }"
                    role="tab"
                    :aria-selected="activeName === 'blockly'"
                    @click="activeName = 'blockly'"
                  >
                    {{ $t("verse.view.script.edit") }}
                  </button>
                  <button
                    type="button"
                    class="script-mode-tab"
                    :class="{ 'is-active': activeName === 'script' }"
                    role="tab"
                    :aria-selected="activeName === 'script'"
                    @click="activeName = 'script'"
                  >
                    {{ $t("verse.view.script.code") }}
                  </button>
                </div>

                <div v-if="verse" class="script-tabs-actions">
                  <el-select
                    v-model="selectedLoadedMetaId"
                    class="script-loaded-metas-select"
                    size="small"
                    :placeholder="
                      $t('verse.view.script.loadedEntitiesPlaceholder')
                    "
                    :disabled="loadedMetaOptions.length === 0"
                    popper-class="script-loaded-metas-popper"
                    @change="handleLoadedMetaChange"
                  >
                    <el-option
                      v-for="metaOption in loadedMetaOptions"
                      :key="metaOption.id"
                      :label="metaOption.name"
                      :value="metaOption.id"
                    ></el-option>
                  </el-select>
                  <el-button
                    class="script-action-button script-run-button"
                    type="primary"
                    size="small"
                    title="测试运行"
                    aria-label="测试运行"
                    @click="run"
                  >
                    <el-icon class="script-action-icon">
                      <VideoPlay></VideoPlay>
                    </el-icon>
                    <span class="secondary-action-label">测试运行</span>
                  </el-button>
                  <el-button
                    class="script-action-button"
                    type="primary"
                    size="small"
                    :title="$t('route.project.sceneEditor')"
                    :aria-label="$t('route.project.sceneEditor')"
                    @click="goBackToSceneEditor"
                  >
                    <font-awesome-icon
                      class="script-action-icon"
                      :icon="['fas', 'cube']"
                    ></font-awesome-icon>
                    <span class="secondary-action-label">
                      {{ $t("route.project.sceneEditor") }}
                    </span>
                  </el-button>
                  <el-button
                    v-if="saveable"
                    class="script-action-button script-save-button"
                    type="primary"
                    size="small"
                    :title="$t('verse.view.script.save')"
                    :aria-label="$t('verse.view.script.save')"
                    @click="save"
                  >
                    <font-awesome-icon
                      class="script-action-icon"
                      icon="save"
                    ></font-awesome-icon>
                    <span>{{ $t("verse.view.script.save") }}</span>
                  </el-button>
                </div>
              </div>
              <el-tabs
                v-model="activeName"
                class="script-main-tabs"
                type="card"
                style="width: 100%"
              >
                <el-tab-pane
                  :label="$t('verse.view.script.edit')"
                  name="blockly"
                >
                  <el-main class="blockly-editor-main">
                    <div
                      v-if="editorContentLoading"
                      class="script-editor-loading-indicator"
                    >
                      <el-icon class="script-editor-loading-spinner is-loading">
                        <Loading></Loading>
                      </el-icon>
                    </div>
                    <iframe
                      :key="editorFrameKey"
                      style="width: 100%; height: 100%; padding: 0; margin: 0"
                      class="blockly-editor-frame"
                      scrolling="no"
                      id="editor"
                      ref="editor"
                      :src="src"
                    ></iframe>
                  </el-main>
                </el-tab-pane>
                <el-tab-pane
                  :label="$t('verse.view.script.code')"
                  name="script"
                >
                  <el-card v-if="activeName === 'script'" class="box-card">
                    <div v-highlight>
                      <el-tabs v-model="languageName">
                        <el-tab-pane label="Lua" name="lua">
                          <template #label>
                            <span style="display: flex; align-items: center">
                              <img
                                src="/lua.png"
                                style="width: 25px; margin-right: 5px"
                                alt=""
                              />
                              <span>Lua</span>
                            </span>
                          </template>
                          <div class="code-container">
                            <el-button
                              class="copy-button"
                              text
                              @click="copyCode(LuaCode)"
                              ><el-icon class="icon">
                                <CopyDocument></CopyDocument> </el-icon
                              >{{ $t("copy.title") }}</el-button
                            >
                            <pre>
                  <code class="lua">{{ LuaCode }}</code>
                </pre>
                          </div>
                        </el-tab-pane>
                        <el-tab-pane label="JavaScript" name="javascript">
                          <template #label>
                            <span style="display: flex; align-items: center">
                              <img
                                src="/javascript.png"
                                style="width: 25px; margin-right: 5px"
                                alt=""
                              />
                              <span>JavaScript</span>
                            </span>
                          </template>
                          <div class="code-container">
                            <el-button
                              class="copy-button"
                              text
                              @click="copyCode(JavaScriptCode)"
                              ><el-icon class="icon">
                                <CopyDocument></CopyDocument> </el-icon
                              >{{ $t("copy.title") }}</el-button
                            >
                            <pre>
                  <code class="javascript">{{ JavaScriptCode }}</code>
                </pre>
                          </div>
                        </el-tab-pane>
                      </el-tabs>
                    </div>
                  </el-card>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-container>
          <div v-if="disabled" class="runArea">
            <div class="scene-fullscreen-controls">
              <el-button
                class="scene-exit-btn"
                size="small"
                type="primary"
                @click="disabled = false"
              >
                {{ $t("common.back") }}
              </el-button>
              <el-button
                class="scene-fullscreen-btn"
                size="small"
                type="primary"
                title="全屏预览"
                @click="toggleSceneFullscreen"
              >
                <font-awesome-icon
                  :icon="['fas', isSceneFullscreen ? 'compress' : 'expand']"
                ></font-awesome-icon>
              </el-button>
            </div>
            <ScenePlayer
              v-if="verseMetasWithJsCodeData"
              ref="scenePlayer"
              :verse="verseMetasWithJsCodeData"
              :is-scene-fullscreen="isSceneFullscreen"
            >
            </ScenePlayer>
          </div>
        </el-card>
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
        <UnityPreviewDialog
          ref="unityPreviewDialog"
          v-model="unityPreviewVisible"
          :frame-visible="unityPreviewFrameVisible"
          :frame-key="unityPreviewFrameKey"
          :src="unityPreviewSrc"
          @closed="handleUnityPreviewClosed"
          @frame-load="handleUnityPreviewLoad"
        ></UnityPreviewDialog>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { logger } from "@/utils/logger";
import { hasPublishableSceneContent } from "@/utils/versePublish";
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  onActivated,
  onDeactivated,
} from "vue";
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import {
  getVerse,
  putVerseCode,
  type meta,
  type VerseData,
  type VerseMetasWithJsCode,
} from "@/api/v1/verse";
import { getMeta } from "@/api/v1/meta";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { takePhoto } from "@/api/v1/verse";
import { Message } from "@/components/Dialog";
import pako from "pako";
import ScenePlayer from "./ScenePlayer.vue";
import * as THREE from "three";
import {
  useScriptEditorBase,
  type EditorPostPayload,
  type ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import {
  buildScriptRuntime,
  getScriptRuntimeBindingValues,
  resolveWithRetry,
  SCRIPT_RUNTIME_BINDING_NAMES,
} from "@/composables/useScriptRuntime";
import { CopyDocument, Loading, VideoPlay } from "@element-plus/icons-vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import { useUserStore } from "@/store/modules/user";
import { translateRouteTitle } from "@/utils/i18n";
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import { useUnityPreviewBridge } from "@/composables/useUnityPreviewBridge";
import { normalizeUnityPreviewVerseLua } from "@/utils/unityPreviewLua";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  normalizeUnityPreviewMetas,
  UNITY_PREVIEW_VERSE_EXPAND,
} from "@/utils/unityPreviewPayload";

// ---------- Verse 专有状态 ----------
const loading = ref(false);
const verse = ref<VerseData>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const verseMetasWithLuaCodeData = ref<VerseMetasWithJsCode>();
const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));
const metasJavaScriptCode = ref("");
// map 用于记录每个 meta_id 在场景中对应的实体列表
let map = new Map<string, Array<{ uuid: string; title: string }>>();
let verseLoadSequence = 0;
let isScriptViewActive = true;

const { t } = useI18n();
const userStore = useUserStore();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.project.sceneEditor");
  const titleText = verse.value?.name
    ? `${editorLabel}【${verse.value.name}】`
    : editorLabel;
  return `/verse/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

type LoadedMetaOption = {
  id: number;
  name: string;
};

const selectedLoadedMetaId = ref<number | null>(null);
const loadedMetaOptions = computed<LoadedMetaOption[]>(() => {
  const metas = Array.isArray(verse.value?.metas) ? verse.value!.metas : [];
  if (metas.length === 0) return [];

  const options: LoadedMetaOption[] = [];
  const seen = new Set<number>();

  metas.forEach((meta) => {
    const metaId = Number(meta?.id);
    if (!Number.isFinite(metaId) || seen.has(metaId)) return;
    seen.add(metaId);
    options.push({
      id: metaId,
      name:
        (meta.title && String(meta.title).trim()) ||
        (meta.name && String(meta.name).trim()) ||
        `${t("verse.listPage.entityFallback")}${metaId}`,
    });
  });

  return options;
});

const goBackToSceneEditor = async () => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;
  router.push(sceneEditorLink.value);
};

const goToLoadedMetaEditor = async (metaId: number, metaName?: string) => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;

  const sceneRoute = router
    .getRoutes()
    .find((route) => route.path === "/meta/scene");
  const sceneEditorTitle =
    sceneRoute && typeof sceneRoute.meta?.title === "string"
      ? translateRouteTitle(sceneRoute.meta.title)
      : t("route.meta.sceneEditor");
  const fallbackName = `${t("verse.listPage.entityFallback")}${metaId}`;
  const title = encodeURIComponent(
    `${sceneEditorTitle}【${metaName || fallbackName}】`
  );

  router.push({
    path: "/meta/scene",
    query: { id: metaId, title },
  });
};

const handleLoadedMetaChange = async (metaId: number) => {
  const selected = loadedMetaOptions.value.find(
    (metaOption) => metaOption.id === metaId
  );
  await goToLoadedMetaEditor(metaId, selected?.name);
};

const saveable = computed(() => Boolean(verse.value?.editable));

type ScenePlayerInstance = InstanceType<typeof ScenePlayer>;
const scenePlayer = ref<ScenePlayerInstance>();

// ---------- Verse 专有类型 ----------
type VerseEntityNode = {
  parameters?: { uuid?: string; title?: string; meta_id?: string | number };
  children?: {
    modules?: VerseEntityNode[];
    entities?: VerseEntityNode[];
  };
};

type VerseMetaEventItem = { title: string; uuid: string };
type VerseMeta = {
  id: number | string;
  name?: string;
  title?: string;
  script?: string;
  code?: string | { js?: string };
  js?: string;
  metaCode?: { js?: string };
  events?: {
    inputs?: VerseMetaEventItem[];
    outputs?: VerseMetaEventItem[];
  };
};

const readSavedEditorSnapshot = () => {
  if (!verse.value) return null;
  let blocklyData = verse.value.verseCode?.blockly || "{}";
  blocklyData = decompressBlockly(blocklyData);
  return {
    blocklyData: JSON.parse(blocklyData),
    js: verse.value.verseCode?.js || "",
    lua: verse.value.verseCode?.lua || "",
  };
};

const getMetaJavaScriptCode = (meta: VerseMeta | meta): string => {
  const candidate = meta as VerseMeta;
  if (typeof candidate.script === "string") return candidate.script;
  if (typeof candidate.js === "string") return candidate.js;
  if (typeof candidate.metaCode?.js === "string") return candidate.metaCode.js;
  if (typeof candidate.code === "string") return candidate.code;
  if (
    candidate.code &&
    typeof candidate.code === "object" &&
    typeof candidate.code.js === "string"
  ) {
    return candidate.code.js;
  }
  return "";
};

const loadMetaJavaScriptCode = async (metas: Array<VerseMeta | meta>) => {
  const directScripts = metas.map((metaItem) => ({
    id: metaItem.id,
    script: getMetaJavaScriptCode(metaItem),
  }));
  const missingMetaIds = directScripts
    .filter((item) => !item.script.trim())
    .map((item) => item.id)
    .filter(
      (metaId, index, array) => metaId && array.indexOf(metaId) === index
    );

  if (missingMetaIds.length === 0) {
    return directScripts
      .map((item) => item.script)
      .filter((script) => script.trim());
  }

  const fetchedScripts = await Promise.all(
    missingMetaIds.map(async (metaId) => {
      try {
        const response = await getMeta(metaId, { expand: "metaCode" });
        return { id: metaId, script: response.data.metaCode?.js || "" };
      } catch (error) {
        logger.error("实体脚本补充加载失败:", { metaId, error });
        return { id: metaId, script: "" };
      }
    })
  );
  const fetchedScriptById = new Map(
    fetchedScripts.map((item) => [item.id?.toString(), item.script])
  );

  return directScripts
    .map(
      (item) => item.script || fetchedScriptById.get(item.id?.toString()) || ""
    )
    .filter((script) => script.trim());
};

// ---------- initEditor（Verse 版）----------
const initEditor = (overrideData?: unknown) => {
  if (!verse.value) return;
  if (!isReady()) return;

  try {
    let blocklyData = verse.value.verseCode?.blockly || "{}";
    blocklyData = decompressBlockly(blocklyData);
    const savedData = JSON.parse(blocklyData);
    const savedCode = {
      js: verse.value.verseCode?.js || "",
      lua: verse.value.verseCode?.lua || "",
    };
    initializeSavedSnapshot(
      {
        js: savedCode.js,
        lua: savedCode.lua,
        blocklyData: savedData,
      },
      `verse:${verse.value.id}`
    );
    const initState = getEditorInitState();
    if (!initState) return;
    postMessage("INIT", {
      token: null,
      config: {
        style: ["base", "verse"],
        parameters: {
          index: verse.value!.id,
          resource: resource.value,
        },
        data: overrideData ?? initState.data,
        code: initState.code,
        persisted: initState.persisted,
        hostSessionId: initState.hostSessionId,
        userInfo: {
          id: userStore.userInfo?.id || null,
          role: userStore.getRole(),
        },
      },
    });
  } catch (error) {
    logger.error("Fail to decompress or parse data:", error);
  }
};

// ---------- postScript（Verse 版：保存 + 发布流程）----------
const postScript = async (
  message: EditorPostPayload,
  context: { trigger: ScriptSaveTrigger }
) => {
  if (verse.value === null) {
    const errorMessage = t("verse.view.script.error1");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!verse.value!.editable) {
    const errorMessage = t("verse.view.script.error2");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }

  let blocklyData = JSON.stringify(message.data);
  if (blocklyData.length > 1024 * 2) {
    const uint8Array = pako.deflate(blocklyData);
    const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
    blocklyData = `compressed:${base64Str}`;
  }

  await putVerseCode(verse.value!.id, {
    blockly: blocklyData,
    js: message.js,
    lua: message.lua,
  });

  if (context.trigger === "manual") {
    Message.success(t("verse.view.script.success"));
    if (!hasPublishableSceneContent(verse.value)) {
      ElMessage.warning(t("verse.view.sceneEditor.emptySceneCannotPublish"));
      return;
    }

    ElMessageBox.confirm(
      t("verse.view.sceneEditor.saveAndPublishConfirm"),
      t("verse.view.sceneEditor.publishScene"),
      {
        showClose: true,
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
        confirmButtonText: t("verse.view.sceneEditor.confirm"),
        cancelButtonText: t("verse.view.sceneEditor.cancel"),
        type: "warning",
      }
    )
      .then(async () => {
        await takePhoto(id.value);
        ElMessage.success(t("verse.view.sceneEditor.publishSuccess"));
      })
      .catch(() => {
        ElMessage.info(t("verse.view.sceneEditor.publishCanceled"));
      });
  }
};

const draftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `script-draft:verse:${id.value}` : null
);

// ---------- 共享编辑器 composable ----------
const {
  activeName,
  languageName,
  LuaCode,
  JavaScriptCode,
  disabled,
  isSceneFullscreen,
  isFullscreen,
  unsavedBlocklyData,
  resolveUnsavedChangesBeforeLeave,
  hasUnsavedChanges,
  draftVersions,
  versionDialogVisible,
  autoSaveEnabled,
  autoSaveIntervalSeconds,
  isSaving,
  lastSaveTrigger,
  lastSavedAt,
  editorFrameKey,
  editor,
  src,
  editorContentReady,
  toggleSceneFullscreen,
  postMessage,
  beginEditorSession,
  initializeSavedSnapshot,
  getEditorInitState,
  save,
  openVersionDialog,
  clearDraftHistory,
  restoreDraftVersion,
  reloadEditorFrame,
  decompressBlockly,
  isReady,
  copyCode,
} = useScriptEditorBase({
  luaLocalVar: "verse",
  i18nKeys: {
    error1: "verse.view.script.error1",
    error3: "verse.view.script.error3",
    info: "verse.view.script.info",
    leaveMessage1: "verse.view.script.leave.message1",
    leaveMessage2: "verse.view.script.leave.message2",
    leaveConfirm: "verse.view.script.leave.confirm",
    leaveCancel: "verse.view.script.leave.cancel",
    leaveError: "verse.view.script.leave.error",
    leaveInfo: "verse.view.script.leave.info",
  },
  onPost: postScript,
  onReady: initEditor,
  getDraftStorageKey: () => draftStorageKey.value,
  canSave: () => Boolean(verse.value?.editable),
  onRestoreDraft: () => reloadEditorFrame(),
});

const toolbarOwner = "verse-script-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();
const toolbarStatus = computed<EditorToolbarStatus>(() => {
  if (isSaving.value) return "saving";
  if (hasUnsavedChanges.value) return "dirty";
  if (lastSaveTrigger.value === "auto" && lastSavedAt.value) {
    return "autosaved";
  }
  return "saved";
});
const editorContentLoading = computed(
  () => loading.value || !editorContentReady.value
);

const activateToolbar = () => {
  isScriptViewActive = true;
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
};

onMounted(activateToolbar);
onActivated(activateToolbar);
onDeactivated(() => {
  isScriptViewActive = false;
  verseLoadSequence += 1;
  unregisterToolbar(toolbarOwner);
});

watch(toolbarStatus, (status) => {
  updateToolbarStatus(toolbarOwner, status);
});

onBeforeUnmount(() => {
  unregisterToolbar(toolbarOwner);
});

// ---------- resource computed（Verse 专有：构建事件 inputs/outputs）----------
const resource = computed(() => {
  const inputs: Array<{ title: string; index: string; uuid: string }> = [];
  const outputs: Array<{ title: string; index: string; uuid: string }> = [];
  const metas = (verse.value?.metas || []) as VerseMeta[];
  metas.forEach((meta) => {
    const events = meta.events || {};
    const inputsList = events.inputs || [];
    const outputsList = events.outputs || [];
    const instances: Array<{ uuid: string; title: string }> =
      map.get(meta.id.toString()) || [];
    const effectiveInstances = instances.length
      ? instances
      : [
          {
            uuid: meta.id?.toString() || "",
            title: meta.name || meta.title || "meta",
          },
        ];
    effectiveInstances.forEach((instance) => {
      outputsList.forEach((input) => {
        inputs.push({
          title: `${instance.title}:${input.title}`,
          index: instance.uuid,
          uuid: input.uuid,
        });
      });
      inputsList.forEach((output) => {
        outputs.push({
          title: `${instance.title}:${output.title}`,
          index: instance.uuid,
          uuid: output.uuid,
        });
      });
    });
  });
  return { events: { inputs, outputs } };
});

// ---------- Verse 专有：handlePolygen（只返回 playAnimation）----------
const handlePolygen = (uuid: string) => {
  if (!scenePlayer.value) {
    logger.error("ScenePlayer未初始化");
    return null;
  }
  const modelUuid = uuid.toString();
  type PolygenModelData = { mesh: THREE.Object3D } & Record<string, unknown>;
  const getModel = (uuid: string): PolygenModelData | null => {
    const source = scenePlayer.value?.sources.get(uuid) as
      | { type: string; data: unknown }
      | undefined;
    if (source && source.type === "model") {
      if (source.data instanceof THREE.Object3D) {
        return { mesh: source.data };
      }
      if (
        source.data &&
        typeof source.data === "object" &&
        "mesh" in source.data &&
        source.data.mesh instanceof THREE.Object3D
      ) {
        return source.data as PolygenModelData;
      }
    }
    return null;
  };
  let delayedModelData: PolygenModelData | null = null;
  const modelData = resolveWithRetry(
    () => getModel(modelUuid),
    (resolvedModelData) => {
      delayedModelData = resolvedModelData;
      logger.log("模型重试成功:", { uuid: modelUuid });
    }
  );
  const model = modelData?.mesh;
  const playAnimation = (animationName: string) => {
    const resolvedModel = modelData?.mesh ?? delayedModelData?.mesh;
    logger.log("播放动画:", {
      uuid: modelUuid,
      animationName,
      model: resolvedModel,
    });
    scenePlayer.value?.playAnimation(modelUuid, animationName);
  };
  logger.log("查找模型:", {
    requestedUuid: modelUuid,
    availableModels: Array.from(scenePlayer.value.sources.keys()),
    modelExists: scenePlayer.value.sources.has(modelUuid),
    foundModel: model,
  });
  if (!model) {
    logger.error(`找不到UUID为 ${modelUuid} 的模型`);
    return {
      get mesh() {
        return delayedModelData?.mesh;
      },
      playAnimation,
    };
  }
  return {
    ...modelData,
    mesh: model,
    playAnimation,
  };
};

const ensureUnityPreviewRuntimeData = async () => {
  if (verseMetasWithLuaCodeData.value) return;
  if (!Number.isFinite(id.value)) return;

  const response = await getVerse(id.value, UNITY_PREVIEW_VERSE_EXPAND, "lua");
  verseMetasWithLuaCodeData.value =
    response.data as unknown as VerseMetasWithJsCode;
};

const buildUnityPreviewPayload = () => {
  const runtimeData =
    verseMetasWithLuaCodeData.value ?? verseMetasWithJsCodeData.value;

  return {
    protocolVersion: 1,
    source: "xrugc-web-script-page",
    sceneType: "verse",
    scene: {
      id: verse.value?.id ?? id.value,
      uuid: verse.value?.uuid ?? null,
      name: verse.value?.name ?? "",
      description: verse.value?.description ?? "",
      data: normalizeUnityPreviewData(
        runtimeData?.data ?? verse.value?.data ?? null
      ),
    },
    resources: cloneForUnityPreview(runtimeData?.resources ?? []),
    metas: normalizeUnityPreviewMetas(runtimeData?.metas ?? []),
    script: {
      blockly: cloneForUnityPreview(unsavedBlocklyData.value),
      lua: normalizeUnityPreviewVerseLua(LuaCode.value),
      javascript: JavaScriptCode.value,
      metasJavaScript: metasJavaScriptCode.value,
    },
  };
};

const unityPreview = useUnityPreviewBridge({
  ensureRuntimeData: ensureUnityPreviewRuntimeData,
  buildPayload: buildUnityPreviewPayload,
  canOpen: () => (verse.value ? true : "场景数据尚未加载完成"),
  notifyError: (message) => ElMessage.error(message),
});
const unityPreviewDialog = unityPreview.dialogRef;
const unityPreviewVisible = unityPreview.visible;
const unityPreviewFrameVisible = unityPreview.frameVisible;
const unityPreviewFrameKey = unityPreview.frameKey;
const unityPreviewSrc = unityPreview.src;
const handleUnityPreviewLoad = unityPreview.handleLoad;
const handleUnityPreviewClosed = unityPreview.handleClosed;

// ---------- Verse 专有：run ----------
const run = async () => {
  const wasFullscreen = isFullscreen.value;
  if (wasFullscreen) {
    document.exitFullscreen();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  disabled.value = true;
  await nextTick();
  if (wasFullscreen) {
    const runArea = document.querySelector(".runArea");
    if (runArea) {
      runArea.requestFullscreen();
      isSceneFullscreen.value = true;
    }
  }

  const waitForScenePlayerReady = async () => {
    if (!scenePlayer.value) {
      throw new Error("ScenePlayer未初始化");
    }
    await scenePlayer.value.whenReady();
    if (scenePlayer.value.sceneLoadError) {
      throw scenePlayer.value.sceneLoadError;
    }
    logger.log("场景资源加载流程完成:", {
      loaded: scenePlayer.value.sources.size,
    });
  };

  try {
    await waitForScenePlayerReady();
  } catch (error) {
    logger.error("场景资源加载失败:", error);
    ElMessage.error(
      `场景资源加载失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  const runtimeCode = [metasJavaScriptCode.value, JavaScriptCode.value]
    .filter((code) => typeof code === "string" && code.trim())
    .join("\n");

  if (runtimeCode) {
    const instanceId = scenePlayer.value!.sceneInstanceId;
    window.__sceneCallbacks = window.__sceneCallbacks ?? {};
    window.__sceneCallbacks[instanceId] = {};
    window.meta = window.__sceneCallbacks[instanceId];
    window.verse = window.__sceneCallbacks[instanceId];
    const runtime = buildScriptRuntime(scenePlayer, {
      signal: (moduleUuid: string, eventUuid: string, parameter?: unknown) => {
        logger.log("触发事件:", moduleUuid, eventUuid, parameter);
      },
    });
    const runtimeParameterNames = SCRIPT_RUNTIME_BINDING_NAMES.join(", ");

    try {
      const wrappedCode = `
            return async function(handlePolygen, THREE, logger, ${runtimeParameterNames}) {
              const meta = window.__sceneCallbacks['${instanceId}'];
              const verse = window.__sceneCallbacks['${instanceId}'];
              const index = ${verse.value?.id};
              const _G = {
                handlePolygen,
                THREE,
                ${runtimeParameterNames},
              };
              window._G = _G;
              const _runtimeBeforeKeys = Object.keys(meta);

              ${runtimeCode}

              logger.log('实体脚本运行时注册结果:', {
                before: _runtimeBeforeKeys,
                after: Object.keys(meta),
                hasMetaInit: typeof meta['@init'] === 'function',
                hasVerseInit: typeof verse['#init'] === 'function',
              });

              if (typeof meta['@init'] === 'function') {
                await meta['@init']();
              }
              if (typeof verse['#init'] === 'function') {
                await verse['#init']();
              }
            }`;
      const wrappedFunction = new Function(wrappedCode);
      const executableFunction = wrappedFunction();
      await executableFunction(
        handlePolygen,
        THREE,
        logger,
        ...getScriptRuntimeBindingValues(runtime)
      );
    } catch (e) {
      logger.error("执行代码出错:", e);
      ElMessage.error(
        `执行代码出错: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
};

// ---------- 加载 Verse 脚本会话 ----------
const loadVerseScriptSession = async () => {
  if (!isScriptViewActive || route.name !== "Script") return;
  if (!Number.isFinite(id.value)) return;
  const requestedId = id.value;
  const loadSequence = ++verseLoadSequence;
  try {
    loading.value = true;
    map.clear();
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    const [responseLua, responseJs] = await Promise.all([
      getVerse(id.value, UNITY_PREVIEW_VERSE_EXPAND, "lua"),
      getVerse(id.value, UNITY_PREVIEW_VERSE_EXPAND, "js"),
    ]);
    if (loadSequence !== verseLoadSequence || requestedId !== id.value) return;
    verse.value = response.data;
    logger.error(verse.value);
    verseMetasWithLuaCodeData.value =
      responseLua.data as unknown as VerseMetasWithJsCode;
    verseMetasWithJsCodeData.value =
      responseJs.data as unknown as VerseMetasWithJsCode;
    const previewMetas = Array.isArray(verseMetasWithJsCodeData.value.metas)
      ? verseMetasWithJsCodeData.value.metas
      : [];
    const metaScripts = await loadMetaJavaScriptCode(previewMetas);
    if (loadSequence !== verseLoadSequence || requestedId !== id.value) return;
    metasJavaScriptCode.value = metaScripts.join("\n");
    logger.log("实体脚本加载结果", {
      metaCount: previewMetas.length,
      scriptCount: metaScripts.length,
      codeLength: metasJavaScriptCode.value.length,
      metaKeys: previewMetas.map((metaItem: meta) => Object.keys(metaItem)),
    });
    logger.log("Verse", verse.value);
    logger.log("metasJavaScriptCode", metasJavaScriptCode.value);
    if (verse.value && verse.value.data) {
      const data = verse.value.data;
      (data as VerseEntityNode).children?.modules?.forEach((module) => {
        if (!module.parameters?.meta_id || !module.parameters?.uuid) return;
        const key = module.parameters.meta_id.toString();
        const entry = {
          uuid: module.parameters.uuid,
          title: module.parameters.title || "",
        };
        const arr = map.get(key) || [];
        arr.push(entry);
        map.set(key, arr);
      });
    }
    const savedSnapshot = readSavedEditorSnapshot();
    if (savedSnapshot) {
      beginEditorSession(savedSnapshot, `verse:${verse.value!.id}`);
    }
    initEditor();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    if (loadSequence === verseLoadSequence) {
      loading.value = false;
    }
  }
};

onMounted(loadVerseScriptSession);
onActivated(() => {
  if (!verse.value || verse.value.id !== id.value) {
    void loadVerseScriptSession();
  }
});

onBeforeRouteUpdate(async (to, from, next) => {
  if (to.path !== from.path || to.query.id === from.query.id) {
    next();
    return;
  }
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: true,
  });
  next(canLeave ? undefined : false);
});

watch(id, (nextId, previousId) => {
  if (
    isScriptViewActive &&
    route.name === "Script" &&
    Number.isFinite(nextId) &&
    nextId !== previousId
  ) {
    void loadVerseScriptSession();
  }
});
</script>

<style scoped>
.icon {
  margin-right: 5px;
}

.code-container {
  position: relative;
}

.copy-button {
  position: absolute;
  top: 20px;
  right: 0;
  z-index: 1;
}

.dark-theme .hljs {
  background-color: rgb(24 24 24) !important;
}

.light-theme .hljs {
  background-color: #fafafa !important;
}

.script-tabs-wrapper {
  container-name: script-editor;
  container-type: inline-size;
  position: relative;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.script-editor-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-height: 40px;
  margin-bottom: 8px;
}

.script-mode-tabs {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.script-mode-tab {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  line-height: 1.1;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  cursor: pointer;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #d6deea);
  border-radius: 8px;
}

.script-mode-tab:hover,
.script-mode-tab:focus-visible,
.script-mode-tab.is-active {
  color: var(--primary-color, #06a7ee);
  border-color: var(--primary-color, #06a7ee);
}

.script-mode-tab:focus-visible {
  outline: 2px solid
    color-mix(in srgb, var(--primary-color, #06a7ee) 30%, transparent);
  outline-offset: 2px;
}

.script-tabs-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
  min-width: 0;
  max-width: 100%;
}

.script-action-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 32px;
  margin-left: 0 !important;
}

.script-action-icon {
  margin-right: 4px;
  font-size: 14px;
  color: inherit;
}

.script-loaded-metas-select {
  width: 180px;
}

.script-loaded-metas-select :deep(.el-select__wrapper) {
  align-items: center;
  min-height: 32px;
}

.script-loaded-metas-select :deep(.el-select__placeholder),
.script-loaded-metas-select :deep(.el-select__selected-item) {
  line-height: 20px;
  text-align: center;
}

:global(.script-loaded-metas-popper.el-select__popper) {
  padding: 0 !important;
}

:global(.script-loaded-metas-popper .el-select-dropdown__item) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 34px;
  text-align: left;
}

:global(.script-loaded-metas-popper) {
  --script-select-hover-bg: rgb(3 169 244 / 18%);
  --script-select-hover-ring: rgb(3 169 244 / 24%);
  --bg-hover: var(--script-select-hover-bg);
  --el-fill-color-light: var(--script-select-hover-bg);
}

:global(
  .script-loaded-metas-popper .el-select-dropdown__item.hover,
  .script-loaded-metas-popper .el-select-dropdown__item:hover,
  .script-loaded-metas-popper .el-select-dropdown__item.is-hovering,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item.hover,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item:hover,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item.is-hovering,
  .script-loaded-metas-popper.el-select__popper .el-select-dropdown__item.hover,
  .script-loaded-metas-popper.el-select__popper .el-select-dropdown__item:hover,
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.is-hovering
) {
  color: var(--primary-color, #03a9f4) !important;
  background-color: var(--script-select-hover-bg) !important;
  background-image: none !important;
  box-shadow: inset 0 0 0 1px var(--script-select-hover-ring) !important;
}

:global(
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.selected:not(.hover, .is-hovering, :hover),
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.is-selected:not(.hover, .is-hovering, :hover)
) {
  font-weight: 500 !important;
  color: var(--primary-color, #03a9f4) !important;
  background: transparent !important;
}

.script-tabs-wrapper :deep(.el-tabs__header) {
  display: none !important;
}

.script-tabs-wrapper :deep(.el-tabs__content) {
  padding-top: 0;
  margin-top: 0;
}

.blockly-editor-main {
  position: relative;
  height: calc(100vh - 185px);
  min-height: 520px;
  padding: 0;
  margin: 0;
  margin-top: 0;
  overflow: hidden;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #d6deea);
  border-radius: 12px;
}

.blockly-editor-frame {
  display: block;
  background: var(--bg-card, #fff);
  border: 0;
  border-radius: inherit;
}

.script-editor-loading-indicator {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.script-editor-loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 22px;
  color: var(--primary-color, #06a7ee);
}

@container script-editor (width <= 1100px) {
  .script-editor-toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .script-tabs-actions {
    justify-content: flex-end;
    justify-self: stretch;
    width: 100%;
    max-width: none;
  }

  .script-loaded-metas-select {
    flex: 1 1 220px;
    width: auto;
    min-width: 180px;
  }

  .blockly-editor-main {
    height: calc(100dvh - 225px);
  }
}

@container script-editor (width <= 620px) {
  .script-mode-tabs {
    width: 100%;
  }

  .script-mode-tab {
    flex: 1 1 50%;
    min-width: 0;
    min-height: 40px;
  }

  .script-tabs-actions {
    display: grid;
    grid-template-columns: 44px 44px minmax(88px, auto);
    justify-content: end;
  }

  .script-loaded-metas-select {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }

  .script-action-button {
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
  }

  .script-run-button .script-action-icon,
  .script-tabs-actions
    .script-action-button:not(.script-save-button)
    .script-action-icon {
    margin-right: 0;
  }

  .secondary-action-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .blockly-editor-main {
    height: calc(100dvh - 285px);
    min-height: 360px;
  }
}

.dark-theme :deep(.hljs) {
  background-color: rgb(24 24 24) !important;
}

.light-theme :deep(.hljs) {
  background-color: #fafafa !important;
}

.runArea {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  overflow: hidden;
  background: #1f2937;
  border-radius: 18px;
}

.is-running-preview {
  --run-preview-gap: 20px;

  height: calc(100dvh - 68px - (var(--run-preview-gap) * 2));
  overflow: hidden;
  background: #1f2937;
  border: 0;
  border-color: #1f2937;
  border-radius: 18px;
  box-shadow: none;
}

.is-running-preview :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  background: #1f2937;
}

.scene-fullscreen-controls {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 100;
}

.scene-fullscreen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.scene-fullscreen-btn :deep(.svg-inline--fa) {
  font-size: 14px;
  line-height: 1;
  color: #fff;
}

.scene-exit-btn {
  margin-right: 8px;
}

/* 全屏时的样式 */
:fullscreen .runArea,
.runArea:fullscreen {
  width: 100vw !important;
  max-width: none !important;
  height: 100vh !important;
  aspect-ratio: auto;
  padding: 0;
}

:fullscreen .scene-fullscreen-btn {
  margin: 10px;
}
</style>
