<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    fullscreen
    :show-close="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="handleClose"
    class="script-editor-modal"
  >
    <div v-loading="loading" class="script-editor-content">
      <el-card class="box-card">
        <template #header>
          <div v-if="meta" class="clearfix">
            <el-link :href="sceneEditorLink" :underline="false">{{
              meta.title
            }}</el-link>
            /【{{ $t("meta.script.title") }}】

            <el-button-group style="float: right">
              <el-button type="primary" size="small" @click="save">
                <font-awesome-icon class="icon" icon="save"></font-awesome-icon>
                {{ $t("meta.script.save") }}
              </el-button>
            </el-button-group>
          </div>
        </template>

        <el-container v-if="!disabled">
          <el-tabs v-model="activeName" type="card" style="width: 100%">
            <el-tab-pane :label="$t('verse.view.script.edit')" name="blockly">
              <el-main
                style="position: relative; height: 70vh; padding: 0; margin: 0"
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
                    <code :class="currentCodeType">{{ currentCode }}</code>
                  </pre>
                        </div>
                      </div>
                    </el-card>
                  </div>
                </el-dialog>

                <iframe
                  style="width: 100%; height: 100%; padding: 0; margin: 0"
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
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { CopyDocument, FullScreen, Aim } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { ref, computed, watch } from "vue";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
import { Message, MessageBox } from "@/components/Dialog";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import { convertToHttps } from "@/assets/js/helper";
import { buildMetaResourceIndex } from "@/components/Meta/useMetaResourceParser";
import ScenePlayer from "@/views/meta/ScenePlayer.vue";
import {
  useScriptEditorBase,
  type EditorPostPayload,
} from "@/composables/useScriptEditorBase";
import pako from "pako";
import { useI18n } from "vue-i18n";

// Props
interface Props {
  modelValue: boolean;
  metaId: number;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
});

// Emits
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "saved"): void;
}>();

// Visible state
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const { t } = useI18n();

const dialogTitle = computed(() => {
  if (props.title) return props.title;
  if (meta.value) return `${meta.value.title} - 脚本编辑器`;
  return "脚本编辑器";
});

// Meta 专有状态
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const loader = getConfiguredGLTFLoader();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.meta.sceneEditor");
  const titleText = meta.value?.title
    ? `${editorLabel}【${meta.value.title}】`
    : editorLabel;
  return `/meta/scene?id=${props.metaId}&title=${encodeURIComponent(titleText)}`;
});

type EntityNode = {
  parameters?: { resource?: string | number; animations?: string[] };
  children?: { entities?: EntityNode[] };
};

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

const initEditor = () => {
  if (!meta.value) return;
  if (!isReady()) return;

  let blocklyData = meta.value.metaCode?.blockly || "{}";
  try {
    blocklyData = decompressBlockly(blocklyData);
    const data = unsavedBlocklyData.value ?? JSON.parse(blocklyData);
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
  emit("saved");
};

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

const loadMetaData = async () => {
  if (!props.metaId) return;

  try {
    loading.value = true;
    const response = await getMeta(props.metaId, {
      expand: "cyber,event,share,metaCode",
    });

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
};

const handleClose = async () => {
  if (unsavedBlocklyData.value) {
    try {
      await MessageBox.confirm(
        t("meta.script.leave.message1"),
        t("meta.script.leave.confirm"),
        {
          confirmButtonText: t("meta.script.leave.confirm"),
          cancelButtonText: t("meta.script.leave.cancel"),
          type: "warning",
        }
      );
      visible.value = false;
    } catch {
      // User cancelled
    }
  } else {
    visible.value = false;
  }
};

// Watch for modal open
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      loadMetaData();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.script-editor-modal :deep(.el-dialog__body) {
  height: calc(100vh - 60px);
  padding: 0;
}

.script-editor-content {
  height: 100%;
  overflow: hidden;
}

.script-editor-content .box-card {
  height: 100%;
  border: none;
}

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

:fullscreen .runArea {
  height: 100vh !important;
  padding: 0;
}

:fullscreen .scene-fullscreen-btn {
  margin: 10px;
}
</style>
