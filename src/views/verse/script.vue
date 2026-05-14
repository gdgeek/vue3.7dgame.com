<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card class="box-card" :class="{ 'is-running-preview': disabled }">
          <el-container v-if="!disabled">
            <div class="script-tabs-wrapper">
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
                  class="script-run-button"
                  type="primary"
                  size="small"
                  @click="run"
                >
                  <el-icon class="script-run-icon">
                    <VideoPlay></VideoPlay>
                  </el-icon>
                  测试运行
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  @click="goBackToSceneEditor"
                >
                  {{ $t("route.project.sceneEditor") }}
                </el-button>
                <el-button
                  v-if="saveable"
                  type="primary"
                  size="small"
                  @click="save"
                >
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  {{ $t("verse.view.script.save") }}
                </el-button>
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
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { logger } from "@/utils/logger";
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { buildScriptRuntime } from "@/composables/useScriptRuntime";
import { CopyDocument, Loading, VideoPlay } from "@element-plus/icons-vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import { useUserStore } from "@/store/modules/user";
import { translateRouteTitle } from "@/utils/i18n";

// ---------- Verse 专有状态 ----------
const loading = ref(false);
const verse = ref<VerseData>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));
const metasJavaScriptCode = ref("");
// map 用于记录每个 meta_id 在场景中对应的实体列表
let map = new Map<string, Array<{ uuid: string; title: string }>>();

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
    const data =
      overrideData ?? unsavedBlocklyData.value ?? JSON.parse(blocklyData);
    postMessage("INIT", {
      token: null,
      config: {
        style: ["base", "verse"],
        parameters: {
          index: verse.value!.id,
          resource: resource.value,
        },
        data,
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
    ElMessage.error(t("verse.view.script.error1"));
    return;
  }
  if (!verse.value!.editable) {
    ElMessage.error(t("verse.view.script.error2"));
    return;
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
  save,
  openVersionDialog,
  clearDraftHistory,
  restoreDraftVersion,
  reloadEditorFrame,
  decompressBlockly,
  isReady,
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

onMounted(() => {
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
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
  const getModel = (uuid: string, retries = 3) => {
    const source = scenePlayer.value?.sources.get(uuid) as
      | { type: string; data: unknown }
      | undefined;
    if (source && source.type === "model") {
      return source.data as THREE.Object3D;
    }
    if (retries > 0) {
      logger.log(`模型未找到，剩余重试次数: ${retries}`);
      setTimeout(() => getModel(uuid, retries - 1), 100);
    }
    return null;
  };
  const model = getModel(modelUuid);
  logger.log("查找模型:", {
    requestedUuid: modelUuid,
    availableModels: Array.from(scenePlayer.value.sources.keys()),
    modelExists: scenePlayer.value.sources.has(modelUuid),
    foundModel: model,
  });
  if (!model) {
    logger.error(`找不到UUID为 ${modelUuid} 的模型`);
    return null;
  }
  return {
    playAnimation: (animationName: string) => {
      logger.log("播放动画:", { uuid: modelUuid, animationName, model });
      scenePlayer.value?.playAnimation(modelUuid, animationName);
    },
  };
};

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
    const {
      Vector3,
      polygen,
      sound,
      helper,
      handleText,
      handleEntity,
      tween,
      task,
      animation,
      text,
      point,
      transform,
      argument,
    } = buildScriptRuntime(scenePlayer, {
      signal: (moduleUuid: string, eventUuid: string, parameter?: unknown) => {
        logger.log("触发事件:", moduleUuid, eventUuid, parameter);
      },
    });

    // verse event 还包含 signal
    const event = {
      trigger: (index: unknown, eventId: string) => {
        logger.log("触发事件:", index, eventId);
      },
      signal: (moduleUuid: string, eventUuid: string, parameter?: unknown) => {
        logger.log("触发事件:", moduleUuid, eventUuid, parameter);
      },
    };

    // handleSound 直接从 runtime 中取
    const handleSound = buildScriptRuntime(scenePlayer).handleSound;

    try {
      const wrappedCode = `
            return async function(handlePolygen, polygen, handleSound, sound, THREE, task, tween, helper, animation, event, text, point, transform, Vector3, argument, handleText, handleEntity, logger) {
              const meta = window.__sceneCallbacks['${instanceId}'];
              const verse = window.__sceneCallbacks['${instanceId}'];
              const index = ${verse.value?.id};
              const _G = {
                handlePolygen,
                polygen,
                handleSound,
                sound,
                THREE,
                task,
                tween,
                helper,
                animation,
                event,
                text,
                point,
                transform,
                Vector3,
                argument,
                handleText,
                handleEntity,
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
        polygen,
        handleSound,
        sound,
        THREE,
        task,
        tween,
        helper,
        animation,
        event,
        text,
        point,
        transform,
        Vector3,
        argument,
        handleText,
        handleEntity,
        logger
      );
    } catch (e) {
      logger.error("执行代码出错:", e);
      ElMessage.error(
        `执行代码出错: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
};

// ---------- onMounted（Verse 专有：加载 verse 数据）----------
onMounted(async () => {
  try {
    loading.value = true;
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    const response2 = await getVerse(
      id.value,
      "id,name,description,data,metas,resources,code,uuid,code",
      "js"
    );
    verse.value = response.data;
    logger.error(verse.value);
    verseMetasWithJsCodeData.value = response2.data;
    const metaScripts = await loadMetaJavaScriptCode(response2.data.metas);
    metasJavaScriptCode.value = metaScripts.join("\n");
    logger.log("实体脚本加载结果", {
      metaCount: response2.data.metas.length,
      scriptCount: metaScripts.length,
      codeLength: metasJavaScriptCode.value.length,
      metaKeys: response2.data.metas.map((metaItem: meta) =>
        Object.keys(metaItem)
      ),
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
    initEditor();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
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
  position: relative;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.script-tabs-actions {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
}

.script-run-button {
  display: inline-flex;
  align-items: center;
}

.script-run-icon {
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
  position: relative;
  top: -8px;
  padding-right: 460px;
  margin: 0 !important;
  overflow: visible !important;
  border-bottom: none !important;
}

.script-tabs-wrapper :deep(.el-tabs__nav-wrap),
.script-tabs-wrapper :deep(.el-tabs__nav-scroll),
.script-tabs-wrapper :deep(.el-tabs__nav) {
  overflow: visible !important;
}

.script-tabs-wrapper :deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.script-tabs-wrapper :deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px !important;
  min-height: 0 !important;
  padding: 0 12px !important;
  font-size: 12px;
  line-height: 1.1;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #d6deea) !important;
  border-radius: 8px;
  outline: none !important;
  box-shadow: none !important;
}

.script-tabs-wrapper
  :deep(.el-tabs--card > .el-tabs__header .el-tabs__item + .el-tabs__item) {
  margin-left: 8px;
}

.script-tabs-wrapper
  :deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: var(--primary-color, #06a7ee);
  background: var(--bg-card, #fff);
  border: 1px solid var(--primary-color, #06a7ee) !important;
  outline: none !important;
  box-shadow: none !important;
}

.script-tabs-wrapper :deep(.el-tabs__nav-wrap::after) {
  display: none !important;
  height: 0 !important;
  content: none !important;
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

@media (width <= 768px) {
  .script-tabs-actions {
    position: static;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .script-tabs-wrapper :deep(.el-tabs__header) {
    padding-right: 0;
  }

  .script-loaded-metas-select {
    width: 100%;
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

  overflow: hidden;
  height: calc(100dvh - 68px - (var(--run-preview-gap) * 2));
  background: #1f2937;
  border: 0;
  border-radius: 18px;
  border-color: #1f2937;
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
  padding: 0;
  aspect-ratio: auto;
}

:fullscreen .scene-fullscreen-btn {
  margin: 10px;
}
</style>
