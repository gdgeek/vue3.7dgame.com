<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card :loading="loading" class="box-card">
          <template #header>
            <div v-if="verse" class="clearfix">
              <el-link :href="sceneEditorLink" :underline="false">{{
                verse.name
              }}</el-link>
              /【{{ $t("verse.view.script.title") }}】

              <!--<el-button type="primary" size="small" @click="run">测试运行</el-button>
              <el-button v-if="disabled" type="primary" size="small" @click="disabled = false">
                返回
              </el-button>-->
              <el-button-group style="float: right">
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
              </el-button-group>
            </div>
          </template>

          <el-container v-if="!disabled">
            <el-tabs v-model="activeName" type="card" style="width: 100%">
              <el-tab-pane :label="$t('verse.view.script.edit')" name="blockly">
                <el-main
                  style="
                    margin: 0;
                    padding: 0;
                    height: 70vh;
                    position: relative;
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
                        <el-button
                          size="small"
                          type="primary"
                          style="margin-right: 10px"
                          @click="run"
                        >
                          测试运行
                        </el-button>
                        <el-button
                          v-if="saveable"
                          size="small"
                          type="primary"
                          style="margin-right: 50px"
                          @click="save"
                        >
                          <font-awesome-icon
                            class="icon"
                            icon="save"
                          ></font-awesome-icon>
                          {{ $t("verse.view.script.save") }}
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
                    <code :class="currentCodeType">{{ currentCode }}</code>
                  </pre>
                          </div>
                        </div>
                      </el-card>
                    </div>
                  </el-dialog>

                  <iframe
                    style="margin: 0; padding: 0; height: 100%; width: 100%"
                    id="editor"
                    ref="editor"
                    :src="src"
                  ></iframe>
                </el-main>
              </el-tab-pane>
              <el-tab-pane :label="$t('verse.view.script.code')" name="script">
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
              v-if="verseMetasWithJsCodeData"
              ref="scenePlayer"
              :verse="verseMetasWithJsCodeData"
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
import { logger } from "@/utils/logger";
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  getVerse,
  putVerseCode,
  type meta,
  type VerseData,
  type VerseMetasWithJsCode,
} from "@/api/v1/verse";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { takePhoto } from "@/api/v1/verse";
import pako from "pako";
import ScenePlayer from "./ScenePlayer.vue";
import * as THREE from "three";
import {
  useScriptEditorBase,
  type EditorPostPayload,
} from "@/composables/useScriptEditorBase";
import { buildScriptRuntime } from "@/composables/useScriptRuntime";
import { CopyDocument } from "@element-plus/icons-vue";

// ---------- Verse 专有状态 ----------
const loading = ref(false);
const verse = ref<VerseData>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const metasJavaScriptCode = ref("");
// map 用于记录每个 meta_id 在场景中对应的实体列表
let map = new Map<string, Array<{ uuid: string; title: string }>>();

const { t } = useI18n();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.project.sceneEditor");
  const titleText = verse.value?.name
    ? `${editorLabel}【${verse.value.name}】`
    : editorLabel;
  return `/verse/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

const saveable = computed(() => verse.value!.editable);

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
  events?: {
    inputs?: VerseMetaEventItem[];
    outputs?: VerseMetaEventItem[];
  };
};

// ---------- initEditor（Verse 版）----------
const initEditor = () => {
  if (!verse.value) return;
  if (!isReady()) return;

  try {
    let blocklyData = verse.value.verseCode?.blockly || "{}";
    blocklyData = decompressBlockly(blocklyData);
    const data = unsavedBlocklyData.value ?? JSON.parse(blocklyData);
    postMessage("init", {
      language: ["lua", "js"],
      style: ["base", "verse"],
      data,
      parameters: {
        index: verse.value!.id,
        resource: resource.value,
      },
    });
  } catch (error) {
    logger.error("Fail to decompress or parse data:", error);
  }
};

// ---------- postScript（Verse 版：保存 + 发布流程）----------
const postScript = async (message: EditorPostPayload) => {
  if (verse.value === null) {
    Message.error(t("verse.view.script.error1"));
    return;
  }
  if (!verse.value!.editable) {
    Message.error(t("verse.view.script.error2"));
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

  Message.success(t("verse.view.script.success"));
  MessageBox.confirm(
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
      Message({
        type: "success",
        message: t("verse.view.sceneEditor.publishSuccess"),
      });
    })
    .catch(() => {
      Message({
        type: "info",
        message: t("verse.view.sceneEditor.publishCanceled"),
      });
    });
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
  from: "script.verse.web",
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
});

// ---------- resource computed（Verse 专有：构建事件 inputs/outputs）----------
const resource = computed(() => {
  const inputs: Array<{ title: string; index: string; uuid: string }> = [];
  const outputs: Array<{ title: string; index: string; uuid: string }> = [];
  const metas = (verse.value?.metas || []) as unknown as VerseMeta[];
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
const handlePolygen = async (uuid: string) => {
  if (!scenePlayer.value) {
    logger.error("ScenePlayer未初始化");
    return null;
  }
  const modelUuid = uuid.toString();
  const getModelAsync = (uuid: string, retries = 3): Promise<THREE.Object3D | null> => {
    return new Promise((resolve) => {
      const attempt = (remaining: number) => {
        const source = scenePlayer.value?.sources.get(uuid) as
          | { type: string; data: unknown }
          | undefined;
        if (source?.type === "model" && source.data) {
          resolve(source.data as THREE.Object3D);
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

  const waitForModels = () =>
    new Promise((resolve) => {
      const checkModels = () => {
        const metasData = verseMetasWithJsCodeData.value!.metas!;
        let expectedModels = 0;
        const countEntities = (entities: VerseEntityNode[]): number => {
          let count = 0;
          for (const entity of entities) {
            count++;
            if (entity.children?.entities?.length > 0) {
              count += countEntities(entity.children.entities);
            }
          }
          return count;
        };
        for (const meta of metasData) {
          const metaData = meta.data as {
            children?: { entities?: VerseEntityNode[] };
          };
          if (metaData?.children?.entities) {
            expectedModels += countEntities(metaData.children.entities);
          }
        }
        if (scenePlayer.value?.sources.size === expectedModels) {
          logger.error("所有资源加载完成:", {
            expected: expectedModels,
            loaded: scenePlayer.value!.sources.size,
          });
          resolve(true);
        } else {
          logger.log("等待资源加载...", {
            expected: expectedModels,
            current: scenePlayer.value?.sources.size || 0,
          });
          setTimeout(checkModels, 100);
        }
      };
      checkModels();
    });

  await waitForModels();

  if (JavaScriptCode.value) {
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
            return async function(handlePolygen, polygen, handleSound, sound, THREE, task, tween, helper, animation, event, text, point, transform, Vector3, argument, handleText, handleEntity) {
              const meta = window.__sceneCallbacks['${instanceId}'];
              const verse = window.__sceneCallbacks['${instanceId}'];
              const index = ${verse.value?.id};

              ${metasJavaScriptCode.value}
              ${JavaScriptCode.value}

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
        handleEntity
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
    verseMetasWithJsCodeData.value = response2.data as unknown as VerseMetasWithJsCode;
    metasJavaScriptCode.value = (response2.data.metas as unknown as meta[])
      .map((m) => m.script)
      .join("\n");
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
    Message.error(error instanceof Error ? error.message : String(error));
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
  background-color: rgb(24, 24, 24) !important;
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
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
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
  background-color: rgb(24, 24, 24) !important;
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
