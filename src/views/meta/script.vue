<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <el-container v-if="!disabled">
            <div class="script-tabs-wrapper">
              <div v-if="meta" class="script-tabs-actions">
                <el-select
                  v-model="selectedUsedSceneId"
                  class="script-used-scenes-select"
                  size="small"
                  :placeholder="usedSceneSelectPlaceholder"
                  :disabled="usedSceneOptions.length === 0"
                  popper-class="script-used-scenes-popper"
                  @change="handleUsedSceneChange"
                >
                  <el-option
                    v-for="scene in usedSceneOptions"
                    :key="scene.id"
                    :label="scene.name"
                    :value="scene.id"
                  ></el-option>
                </el-select>
                <el-button
                  type="primary"
                  size="small"
                  @click="goBackToSceneEditor"
                >
                  {{ $t("meta.script.entityEditor") }}
                </el-button>
                <el-button type="primary" size="small" @click="save">
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  {{ $t("meta.script.save") }}
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
                  :label="$t('verse.view.script.code') || 'Script Code'"
                  name="script"
                >
                  <el-card
                    v-if="activeName === 'script'"
                    class="box-card"
                    :class="isDark ? 'dark-theme' : 'light-theme'"
                  >
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
                              >{{ $t("copy.title") || "Copy" }}</el-button
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
                plain
                @click="toggleSceneFullscreen"
              >
                <font-awesome-icon
                  :icon="['fas', isSceneFullscreen ? 'compress' : 'expand']"
                ></font-awesome-icon>
              </el-button>
            </div>
            <ScenePlayer
              v-if="meta"
              ref="scenePlayer"
              :meta="meta"
              :is-scene-fullscreen="isSceneFullscreen"
            ></ScenePlayer>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CopyDocument } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
import { getVerses } from "@/api/v1/verse";
import { Message } from "@/components/Dialog";
import * as THREE from "three";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import { convertToHttps } from "@/assets/js/helper";
import {
  buildMetaResourceIndex,
  type MetaResourceIndex,
} from "@/components/Meta/useMetaResourceParser";
import ScenePlayer from "./ScenePlayer.vue";
import {
  useScriptEditorBase,
  type EditorPostPayload,
  type ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import { buildScriptRuntime } from "@/composables/useScriptRuntime";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import { useUserStore } from "@/store/modules/user";

// ---------- Meta 专有状态 ----------
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));
const loader = getConfiguredGLTFLoader();

type ScenePlayerExpose = {
  sources: Map<string, { type: string; data: unknown }>;
  playAnimation: (uuid: string, animationName: string) => void;
  getAudioUrl: (uuid: string) => string | undefined;
  playQueuedAudio: (
    audio: HTMLAudioElement,
    skipQueue?: boolean
  ) => Promise<void> | void;
};
const scenePlayer = ref<ScenePlayerExpose | null>(null);
const test = ref<MetaResourceIndex | null>(null);

// ---------- 资源解析 ----------
const getResource = (m: metaInfo) => {
  try {
    return buildMetaResourceIndex(m);
  } catch (e) {
    logger.error("buildMetaResourceIndex error", e);
    return {
      action: [],
      trigger: [],
      polygen: [],
      picture: [],
      video: [],
      voxel: [],
      phototype: [],
      text: [],
      sound: [],
      entity: [],
      events: { inputs: [], outputs: [] },
    };
  }
};

// ---------- Meta 专有类型 ----------
type EntityNode = {
  parameters?: { resource?: string | number; animations?: string[] };
  children?: { entities?: EntityNode[] };
};

// ---------- initEditor（Meta 版）----------
const initEditor = (overrideData?: unknown) => {
  if (!meta.value) return;
  if (!isReady()) return;

  let blocklyData = meta.value.metaCode?.blockly || "{}";
  try {
    blocklyData = decompressBlockly(blocklyData);
    const data =
      overrideData ?? unsavedBlocklyData.value ?? JSON.parse(blocklyData);
    test.value = getResource(meta.value);
    postMessage("INIT", {
      token: null,
      config: {
        style: ["base", "meta"],
        parameters: {
          index: meta.value.id,
          resource: getResource(meta.value),
        },
        data,
        userInfo: {
          id: userStore.userInfo?.id || null,
          role: userStore.getRole(),
        },
      },
    });
  } catch (error) {
    logger.error("Failed to decompress or parse data:", error);
  }
};

// ---------- postScript（Meta 版：保存到服务端，无发布流程）----------
const postScript = async (
  message: EditorPostPayload,
  context: { trigger: ScriptSaveTrigger }
) => {
  if (meta.value === null) {
    ElMessage.error(t("meta.script.error1"));
    return;
  }
  if (!meta.value.editable) {
    ElMessage.error(t("meta.script.error2"));
    return;
  }

  let blocklyData = JSON.stringify(message.data);
  if (blocklyData.length > 1024 * 2) {
    const uint8Array = pako.deflate(blocklyData);
    const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
    blocklyData = `compressed:${base64Str}`;
  }

  await putMetaCode(meta.value.id, {
    blockly: blocklyData,
    lua: message.lua,
    js: message.js,
  });

  if (context.trigger === "manual") {
    Message.success(t("meta.script.success"));
  }
};

const draftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `script-draft:meta:${id.value}` : null
);

// ---------- 共享编辑器 composable ----------
const {
  activeName,
  languageName,
  LuaCode,
  JavaScriptCode,
  disabled,
  isSceneFullscreen,
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
  isDark,
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
  luaLocalVar: "meta",
  i18nKeys: {
    error1: "meta.script.error1",
    error3: "meta.script.error3",
    info: "meta.script.info",
    leaveMessage1: "meta.script.leave.message1",
    leaveMessage2: "meta.script.leave.message2",
    leaveConfirm: "meta.script.leave.confirm",
    leaveCancel: "meta.script.leave.cancel",
    leaveError: "meta.script.leave.error",
    leaveInfo: "meta.script.leave.info",
  },
  onPost: postScript,
  onReady: initEditor,
  getDraftStorageKey: () => draftStorageKey.value,
  canSave: () => Boolean(meta.value?.editable),
  onRestoreDraft: () => reloadEditorFrame(),
});

const toolbarOwner = "meta-script-editor";
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

const { t } = useI18n();
const userStore = useUserStore();

type SceneOption = {
  id: number;
  name: string;
};

const selectedUsedSceneId = ref<number | null>(null);
const sceneNameMap = ref<Map<number, string>>(new Map());

const usedSceneOptions = computed<SceneOption[]>(() => {
  const verseMetas = Array.isArray(meta.value?.verseMetas)
    ? meta.value.verseMetas
    : [];
  if (verseMetas.length === 0) return [];

  const options: SceneOption[] = [];
  const seen = new Set<number>();

  verseMetas.forEach((relation) => {
    const verseId = relation?.verse_id;
    if (typeof verseId !== "number" || seen.has(verseId)) return;
    seen.add(verseId);
    options.push({
      id: verseId,
      name:
        sceneNameMap.value.get(verseId) ||
        `${t("meta.list.properties.sceneFallback")}${verseId}`,
    });
  });

  return options;
});

const usedSceneSelectPlaceholder = "已使用场景";

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.meta.sceneEditor");
  const titleText = meta.value?.title
    ? `${editorLabel}【${meta.value.title}】`
    : editorLabel;
  return `/meta/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

const goBackToSceneEditor = async () => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;
  router.push(sceneEditorLink.value);
};

const goToUsedSceneEditor = async (sceneId: number, sceneName?: string) => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;

  const title = encodeURIComponent(
    t("verse.listPage.editorTitle", {
      name: sceneName || t("verse.listPage.unnamed"),
    })
  );
  router.push({ path: "/verse/scene", query: { id: sceneId, title } });
};

const handleUsedSceneChange = async (sceneId: number) => {
  const selected = usedSceneOptions.value.find((scene) => scene.id === sceneId);
  await goToUsedSceneEditor(sceneId, selected?.name);
};

const loadSceneNameMap = async () => {
  try {
    const scenes: Array<{ id: number; name?: string }> = [];
    let page = 1;
    let pageCount = 1;

    do {
      const response = await getVerses({
        sort: "-updated_at",
        page,
        perPage: 100,
      });
      scenes.push(
        ...response.data.map((scene) => ({ id: scene.id, name: scene.name }))
      );
      pageCount = parseInt(
        String(response.headers["x-pagination-page-count"] || "1")
      );
      page += 1;
    } while (page <= pageCount);

    const map = new Map<number, string>();
    scenes.forEach((scene) => {
      map.set(scene.id, String(scene.name || `Scene-${scene.id}`));
    });
    sceneNameMap.value = map;
  } catch (error) {
    logger.error("loadSceneNameMap error", error);
  }
};

// ---------- Meta 专有：handlePolygen（返回 mesh + playAnimation）----------
const handlePolygen = (uuid: string) => {
  if (!scenePlayer.value) {
    logger.error("ScenePlayer未初始化");
    return null;
  }
  const modelUuid = uuid.toString();
  const getModel = (uuid: string, retries = 3) => {
    const source = scenePlayer.value?.sources.get(uuid) as
      | { type: string; data: { mesh?: THREE.Object3D } }
      | undefined;
    if (source && source.type === "model" && source.data.mesh) {
      return source.data.mesh;
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
    mesh: model,
    playAnimation: (animationName: string) => {
      logger.log("播放动画:", { uuid: modelUuid, animationName, model });
      scenePlayer.value?.playAnimation(modelUuid, animationName);
    },
  };
};

// ---------- Meta 专有：run ----------
import pako from "pako";

const run = async () => {
  disabled.value = true;

  type EntityNodeLocal = {
    children?: { entities?: EntityNodeLocal[] };
  };
  const countEntities = (entities: EntityNodeLocal[]): number => {
    let count = 0;
    for (const entity of entities) {
      count++;
      const childEntities = entity.children?.entities;
      if (childEntities && childEntities.length > 0) {
        count += countEntities(childEntities);
      }
    }
    return count;
  };

  const waitForModels = () =>
    new Promise<void>((resolve) => {
      const checkModels = () => {
        const metaData = meta.value?.data;
        const entities =
          metaData &&
          typeof metaData === "object" &&
          "children" in metaData &&
          metaData.children?.entities
            ? metaData.children.entities
            : undefined;
        if (!entities || entities.length === 0) {
          resolve();
          return;
        }
        const expectedModels = countEntities(entities);
        const loadedModels = scenePlayer.value?.sources?.size ?? 0;
        if (loadedModels === expectedModels) {
          logger.log("所有资源加载完成:", {
            expected: expectedModels,
            loaded: loadedModels,
          });
          resolve();
          return;
        }
        logger.log("等待资源加载...", {
          expected: expectedModels,
          current: loadedModels,
        });
        setTimeout(checkModels, 100);
      };
      checkModels();
    });

  await waitForModels();
  if (!JavaScriptCode.value) return;

  window.meta = {};
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
    event,
    text,
    point,
    transform,
    argument,
  } = buildScriptRuntime(scenePlayer);

  try {
    const wrappedCode = `
        return async function(handlePolygen, polygen, handleSound, sound, THREE, task, tween, helper, animation, event, text, point, transform, Vector3, argument, handleText, handleEntity) {
          const meta = window.meta;
          const index = ${meta.value?.id};

          ${JavaScriptCode.value}

          if (typeof meta['@init'] === 'function') {
            await meta['@init']();
          }

        }
      `;
    const createFunction = new Function(wrappedCode);
    const executableFunction = createFunction();
    await executableFunction(
      handlePolygen,
      polygen,
      buildScriptRuntime(scenePlayer).handleSound,
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
      handleEntity
    );
  } catch (e) {
    logger.error("执行代码出错:", e);
    ElMessage.error(
      `执行代码出错: ${e instanceof Error ? e.message : String(e)}`
    );
  }
};

// ---------- onMounted（Meta 专有：加载 meta 数据和模型动画）----------
onMounted(async () => {
  try {
    loading.value = true;
    await loadSceneNameMap();
    const response = await getMeta(id.value, {
      expand: "cyber,event,share,metaCode,verseMetas",
    });
    logger.log("response数据", response);

    const assignAnimations = (
      entities: EntityNode[],
      modelId: number,
      animationNames: string[]
    ) => {
      entities.forEach((item) => {
        if (
          item.parameters?.resource != null &&
          item.parameters.resource.toString() === modelId.toString()
        ) {
          item.parameters.animations = animationNames;
        }
        if (item.children?.entities) {
          assignAnimations(item.children.entities, modelId, animationNames);
        }
      });
    };

    if (response.data.resources.length > 0) {
      try {
        for (const model of response.data.resources) {
          if (model.type !== "polygen") {
            meta.value = response.data;
            continue;
          }
          const modelUrl = convertToHttps(model.file.url);
          const modelId = model.id;
          await new Promise<void>((resolve, reject) => {
            loader.load(
              modelUrl,
              (gltf) => {
                const animationNames = gltf.animations.map((clip) => clip.name);
                const data = response.data.data as {
                  children?: { entities?: EntityNode[] };
                };
                if (data?.children?.entities) {
                  assignAnimations(
                    data.children.entities,
                    modelId,
                    animationNames
                  );
                }
                response.data.data = data;
                meta.value = response.data;
                resolve();
              },
              undefined,
              (error) => {
                logger.error(
                  "An error occurred while loading the model:",
                  error
                );
                reject(error);
              }
            );
          });
        }
      } catch (error) {
        meta.value = response.data;
      }
    } else {
      meta.value = response.data;
    }

    initEditor();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
});

defineExpose({ run });
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

.script-used-scenes-select {
  width: 180px;
}

.script-used-scenes-select :deep(.el-select__wrapper) {
  align-items: center;
  min-height: 32px;
}

.script-used-scenes-select :deep(.el-select__placeholder),
.script-used-scenes-select :deep(.el-select__selected-item) {
  line-height: 20px;
  text-align: center;
}

:global(.script-used-scenes-popper .el-select-dropdown__item) {
  display: flex;
  align-items: center;
  min-height: 34px;
}

:global(
  .script-used-scenes-popper .el-select-dropdown__item.hover,
  .script-used-scenes-popper .el-select-dropdown__item:hover,
  .script-used-scenes-popper .el-select-dropdown__item.is-hovering
) {
  font-weight: var(--font-weight-medium, 500) !important;
  color: var(--ar-primary) !important;
  background-color: var(--ar-primary-alpha-10) !important;
}

.script-tabs-wrapper :deep(.el-tabs__header) {
  position: relative;
  top: -8px;
  padding-right: 280px;
  margin: 0 !important;
  border-bottom: none !important;
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
  background: #fff;
  height: 30px !important;
  min-height: 0 !important;
  padding: 0 12px !important;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
  border: 0.5px solid #d6deea !important;
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
  color: #06a7ee;
  background: #fff;
  border: 0.5px solid #06a7ee !important;
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
  background: #fff;
  border: 0.5px solid #d6deea;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.blockly-editor-frame {
  display: block;
  border: 0;
}

@media (width <= 768px) {
  .script-tabs-actions {
    position: static;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .script-tabs-wrapper :deep(.el-tabs__header) {
    padding-right: 0;
  }

  .script-used-scenes-select {
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
}

.scene-fullscreen-controls {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 100;
}

.scene-fullscreen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.scene-fullscreen-btn :deep(.svg-inline--fa) {
  font-size: 14px;
  line-height: 1;
}

.scene-exit-btn {
  margin-right: 8px;
}

/* 全屏时的样式 */
:fullscreen .runArea {
  height: 100vh !important;
  padding: 0;
}

:fullscreen .scene-fullscreen-btn {
  margin: 10px;
}
</style>
