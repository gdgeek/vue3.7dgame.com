<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div v-if="meta" class="clearfix">
              <el-link :href="sceneEditorLink" :underline="false">{{
                meta.title
              }}</el-link>
              /【{{ $t("meta.script.title") }}】
              <!--
              <el-button type="primary" size="small" @click="run">测试运行</el-button>
              -->
              <el-button
                v-if="disabled"
                type="primary"
                size="small"
                @click="disabled = false"
              >
                返回
              </el-button>
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="save">
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  {{ $t("meta.script.save") }}
                </el-button>
              </el-button-group>
            </div>
          </template>
          <el-container v-if="!disabled">
            <el-tabs v-model="activeName" type="card" style="width: 100%">
              <el-tab-pane :label="$t('verse.view.script.edit')" name="blockly">
                <el-main
                  style="
                    position: relative;
                    height: 70vh;
                    padding: 0;
                    margin: 0;
                  "
                >
                  <div class="fullscreen-controls">
                    <el-button-group>
                      <el-button
                        class="fullscreen-btn"
                        size="small"
                        type="primary"
                        plain
                        @click="toggleFullscreen"
                      >
                        <el-icon>
                          <FullScreen v-if="!isFullscreen"></FullScreen>
                          <Aim v-else></Aim>
                        </el-icon>
                      </el-button>
                      <template v-if="isFullscreen">
                        <el-button
                          size="small"
                          type="primary"
                          @click="showFullscreenCode('lua')"
                        >
                          Lua
                        </el-button>
                        <el-button
                          size="small"
                          color="#F7DF1E"
                          style="margin-right: 10px"
                          @click="showFullscreenCode('javascript')"
                        >
                          JavaScript
                        </el-button>
                        <!--
                        <el-button size="small" type="primary" style="margin-right: 10px" @click="run">
                          测试运行
                        </el-button>
                        -->
                        <el-button
                          size="small"
                          type="primary"
                          style="margin-right: 50px"
                          @click="save"
                        >
                          <font-awesome-icon
                            class="icon"
                            icon="save"
                          ></font-awesome-icon>
                          {{ $t("meta.script.save") }}
                        </el-button>
                      </template>
                    </el-button-group>
                  </div>

                  <el-dialog
                    v-model="showCodeDialog"
                    :title="codeDialogTitle"
                    fullscreen
                    :show-close="true"
                    :close-on-click-modal="false"
                    :close-on-press-escape="true"
                  >
                    <div class="code-dialog-content">
                      <el-card :class="isDark ? 'dark-theme' : 'light-theme'">
                        <div v-highlight>
                          <div class="code-container2">
                            <el-button
                              class="copy-button2"
                              text
                              @click="copyCode(currentCode)"
                            >
                              <el-icon class="icon">
                                <CopyDocument></CopyDocument>
                              </el-icon>
                              {{ $t("copy.title") }}
                            </el-button>
                            <pre>
                    <code :class="currentCodeType">{{
                      currentCode
                    }}</code>
                  </pre>
                          </div>
                        </div>
                      </el-card>
                    </div>
                  </el-dialog>

                  <iframe
                    style=" width: 100%; height: 100%; padding: 0;margin: 0"
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
          </el-container>
          <div v-if="disabled" class="runArea">
            <div class="scene-fullscreen-controls">
              <el-button
                class="scene-fullscreen-btn"
                size="small"
                type="primary"
                plain
                @click="toggleSceneFullscreen"
              >
                <el-icon>
                  <FullScreen v-if="!isSceneFullscreen"></FullScreen>
                  <Aim v-else></Aim>
                </el-icon>
              </el-button>
            </div>
            <ScenePlayer
              v-if="meta"
              ref="scenePlayer"
              :meta="meta"
              :is-scene-fullscreen="isSceneFullscreen"
            >
            </ScenePlayer>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { CopyDocument, FullScreen, Aim } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { useRoute } from "vue-router";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
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
} from "@/composables/useScriptEditorBase";
import { buildScriptRuntime } from "@/composables/useScriptRuntime";

// ---------- Meta 专有状态 ----------
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
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
  sceneInstanceId: string;
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
const initEditor = () => {
  if (!meta.value) return;
  if (!isReady()) return;

  let blocklyData = meta.value.metaCode?.blockly || "{}";
  try {
    blocklyData = decompressBlockly(blocklyData);
    const data = unsavedBlocklyData.value ?? JSON.parse(blocklyData);
    test.value = getResource(meta.value);
    postMessage("init", {
      language: ["lua", "js"],
      style: ["base", "meta"],
      data,
      parameters: {
        index: meta.value.id,
        resource: getResource(meta.value),
      },
    });
  } catch (error) {
    logger.error("Failed to decompress or parse data:", error);
  }
};

// ---------- postScript（Meta 版：保存到服务端，无发布流程）----------
const postScript = async (message: EditorPostPayload) => {
  if (meta.value === null) {
    Message.error(t("meta.script.error1"));
    return;
  }
  if (!meta.value.editable) {
    Message.error(t("meta.script.error2"));
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

  Message.success(t("meta.script.success"));
};

// ---------- 共享编辑器 composable ----------
const {
  activeName,
  languageName,
  LuaCode,
  JavaScriptCode,
  disabled,
  isSceneFullscreen,
  isFullscreen,
  showCodeDialog,
  currentCode,
  currentCodeType,
  codeDialogTitle,
  unsavedBlocklyData,
  editor,
  src,
  isDark,
  toggleFullscreen,
  showFullscreenCode,
  toggleSceneFullscreen,
  copyCode,
  postMessage,
  save,
  decompressBlockly,
  isReady,
} = useScriptEditorBase({
  from: "script.meta.web",
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
});

const { t } = useI18n();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.meta.sceneEditor");
  const titleText = meta.value?.title
    ? `${editorLabel}【${meta.value.title}】`
    : editorLabel;
  return `/meta/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

// ---------- Meta 专有：handlePolygen（返回 mesh + playAnimation）----------
const handlePolygen = async (uuid: string) => {
  if (!scenePlayer.value) {
    logger.error("ScenePlayer未初始化");
    return null;
  }
  const modelUuid = uuid.toString();
  const getModelAsync = (
    uuid: string,
    retries = 3
  ): Promise<THREE.Object3D | null> => {
    return new Promise((resolve) => {
      const attempt = (remaining: number) => {
        const source = scenePlayer.value?.sources.get(uuid) as
          | { type: string; data: { mesh?: THREE.Object3D } }
          | undefined;
        if (source?.type === "model" && source.data.mesh) {
          resolve(source.data.mesh);
          return;
        }
        if (remaining > 0) {
          logger.log(`模型未找到，剩余重试次数: ${remaining}`);
          setTimeout(() => attempt(remaining - 1), 100);
        } else {
          resolve(null);
        }
      };
      attempt(retries);
    });
  };
  const model = await getModelAsync(modelUuid);
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

  // 使用实例专属命名空间，避免多 ScenePlayer 实例时回调互相覆盖
  const instanceId = scenePlayer.value!.sceneInstanceId;
  window.__sceneCallbacks = window.__sceneCallbacks ?? {};
  window.__sceneCallbacks[instanceId] = {};
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
          const meta = window.__sceneCallbacks['${instanceId}'];
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
    const response = await getMeta(id.value, {
      expand: "cyber,event,share,metaCode",
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
    Message.error(error instanceof Error ? error.message : String(error));
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

.fullscreen-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 100;
}

/* 全屏时的样式 */
:fullscreen .el-main {
  height: 100vh !important;
  padding: 0;
}

:fullscreen iframe {
  height: 100vh !important;
}

.code-dialog-content {
  height: 100%;
  overflow: hidden;
}

.code-container2 {
  position: relative;
  max-height: 80vh;
  overflow-y: auto;
}

.copy-button2 {
  position: absolute;
  top: 35px;
  right: 0;
  z-index: 1;
}

.fullscreen-controls {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 100;
  padding-right: 10px;
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
  opacity: 0.8;
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
