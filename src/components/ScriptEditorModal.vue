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
          <div v-if="verse" class="clearfix">
            <el-link :href="sceneEditorLink" :underline="false">{{
              verse.name
            }}</el-link>
            /【{{ $t("verse.view.script.title") }}】

            <el-button-group style="float: right">
              <el-button
                v-if="saveable"
                type="primary"
                size="small"
                @click="save"
              >
                <font-awesome-icon class="icon" icon="save"></font-awesome-icon>
                {{ $t("verse.view.script.save") }}
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
                        class="unity-preview-trigger-button"
                        size="small"
                        style="margin-right: 10px"
                        @click="openUnityPreview"
                      >
                        <el-icon class="button-icon">
                          <VideoPlay></VideoPlay>
                        </el-icon>
                        {{ t("common.unityPreview.entry") }}
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
                              <div>
                                {{ t("common.unityPreview.helpClick") }}
                              </div>
                              <div>
                                {{ t("common.unityPreview.helpRotate") }}
                              </div>
                              <div>
                                {{ t("common.unityPreview.helpZoomPan") }}
                              </div>
                              <div>
                                {{ t("common.unityPreview.helpFullscreen") }}
                              </div>
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
                  <div
                    ref="unityPreviewFrameWrap"
                    class="unity-preview-frame-wrap"
                  >
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

                <iframe
                  style="width: 100%; height: 100%; padding: 0; margin: 0"
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
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
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
import ScenePlayer from "@/views/verse/ScenePlayer.vue";
import * as THREE from "three";
import {
  useScriptEditorBase,
  type EditorPostPayload,
} from "@/composables/useScriptEditorBase";
import { useUserStore } from "@/store/modules/user";
import {
  buildScriptRuntime,
  type ScenePlayerLike,
} from "@/composables/useScriptRuntime";
import {
  Close,
  CopyDocument,
  FullScreen,
  Aim,
  QuestionFilled,
  VideoPlay,
} from "@element-plus/icons-vue";
import env from "@/environment";
import {
  extractUnityPreviewLuaActions,
  normalizeUnityPreviewMetaLua,
  normalizeUnityPreviewVerseLua,
  readUnityPreviewMetaJavaScriptCode,
  readUnityPreviewMetaLuaCode,
} from "@/utils/unityPreviewLua";

// Props
interface Props {
  modelValue: boolean;
  verseId: number;
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

const dialogTitle = computed(() => {
  if (props.title) return props.title;
  if (verse.value) return `${verse.value.name} - 脚本编辑器`;
  return "脚本编辑器";
});

// Verse 专有状态
const loading = ref(false);
const verse = ref<VerseData>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const verseMetasWithLuaCodeData = ref<VerseMetasWithJsCode>();
const metasJavaScriptCode = ref("");
let map = new Map<string, Array<{ uuid: string; title: string }>>();

const { t } = useI18n();
const userStore = useUserStore();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.project.sceneEditor");
  const titleText = verse.value?.name
    ? `${editorLabel}【${verse.value.name}】`
    : editorLabel;
  return `/verse/scene?id=${props.verseId}&title=${encodeURIComponent(titleText)}`;
});

const saveable = computed(() => verse.value?.editable ?? false);

type ScenePlayerInstance = InstanceType<typeof ScenePlayer>;
const scenePlayer = ref<ScenePlayerInstance>();

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

const initEditor = () => {
  if (!verse.value) return;
  if (!isReady()) return;

  try {
    let blocklyData = verse.value.verseCode?.blockly || "{}";
    blocklyData = decompressBlockly(blocklyData);
    const data = unsavedBlocklyData.value ?? JSON.parse(blocklyData);
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
  emit("saved");

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
      await takePhoto(props.verseId);
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
        const source = scenePlayer.value?.sources?.get(uuid) as
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
    availableModels: Array.from(scenePlayer.value?.sources?.keys() ?? []),
    modelExists: scenePlayer.value?.sources?.has(modelUuid) ?? false,
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

const unityPreviewVisible = ref(false);
const unityPreviewFrameVisible = ref(false);
const unityPreviewReady = ref(false);
const unityPreviewStatus = ref("正在加载 Unity 运行器...");
const unityPreviewFrameKey = ref(0);
const unityPreviewFrame = ref<HTMLIFrameElement | null>(null);
const unityPreviewFrameWrap = ref<HTMLElement | null>(null);
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const ensureUnityPreviewRuntimeData = async () => {
  if (verseMetasWithLuaCodeData.value) return;
  if (!props.verseId) return;

  const response = await getVerse(
    props.verseId,
    UNITY_PREVIEW_VERSE_EXPAND,
    "lua"
  );
  verseMetasWithLuaCodeData.value =
    response.data as unknown as VerseMetasWithJsCode;
};

const buildUnityPreviewPayload = () => {
  const runtimeData =
    verseMetasWithLuaCodeData.value ?? verseMetasWithJsCodeData.value;

  return {
    protocolVersion: 1,
    source: "xrugc-web-script-editor",
    sceneType: "verse",
    scene: {
      id: verse.value?.id ?? props.verseId,
      uuid: verse.value?.uuid ?? null,
      name: verse.value?.name ?? "",
      description: verse.value?.description ?? "",
      data: normalizePreviewData(
        runtimeData?.data ?? verse.value?.data ?? null
      ),
    },
    resources: cloneForPreview(runtimeData?.resources ?? []),
    metas: normalizeUnityPreviewMetas(runtimeData?.metas ?? []),
    script: {
      blockly: cloneForPreview(unsavedBlocklyData.value),
      lua: normalizeUnityPreviewVerseLua(LuaCode.value),
      javascript: JavaScriptCode.value,
      metasJavaScript: metasJavaScriptCode.value,
    },
  };
};

const postUnityPreviewPayload = (payload: unknown) => {
  const targetWindow = unityPreviewFrame.value?.contentWindow;
  if (!targetWindow) {
    Message.error("Unity 运行器尚未加载完成");
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
  if (!verse.value) {
    Message.error("场景数据尚未加载完成");
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
            if ((entity.children?.entities?.length ?? 0) > 0) {
              count += countEntities(entity.children?.entities ?? []);
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
        if (scenePlayer.value?.sources?.size === expectedModels) {
          logger.error("所有资源加载完成:", {
            expected: expectedModels,
            loaded: scenePlayer.value?.sources?.size,
          });
          resolve(true);
        } else {
          logger.log("等待资源加载...", {
            expected: expectedModels,
            current: scenePlayer.value?.sources?.size || 0,
          });
          setTimeout(checkModels, 100);
        }
      };
      checkModels();
    });

  await waitForModels();

  if (JavaScriptCode.value) {
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
    } = buildScriptRuntime(
      scenePlayer as { value: ScenePlayerLike | null | undefined },
      {
        signal: (
          moduleUuid: string,
          eventUuid: string,
          parameter?: unknown
        ) => {
          logger.log("触发事件:", moduleUuid, eventUuid, parameter);
        },
      }
    );

    const event = {
      trigger: (index: unknown, eventId: string) => {
        logger.log("触发事件:", index, eventId);
      },
      signal: (moduleUuid: string, eventUuid: string, parameter?: unknown) => {
        logger.log("触发事件:", moduleUuid, eventUuid, parameter);
      },
    };

    const handleSound = buildScriptRuntime(
      scenePlayer as { value: ScenePlayerLike | null | undefined }
    ).handleSound;

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

const loadVerseData = async () => {
  if (!props.verseId) return;

  try {
    loading.value = true;
    map.clear();

    const response = await getVerse(
      props.verseId,
      "metas, module, share, verseCode"
    );
    const [responseLua, responseJs] = await Promise.all([
      getVerse(props.verseId, UNITY_PREVIEW_VERSE_EXPAND, "lua"),
      getVerse(props.verseId, UNITY_PREVIEW_VERSE_EXPAND, "js"),
    ]);
    verse.value = response.data;
    verseMetasWithJsCodeData.value =
      responseJs.data as unknown as VerseMetasWithJsCode;
    verseMetasWithLuaCodeData.value =
      responseLua.data as unknown as VerseMetasWithJsCode;
    metasJavaScriptCode.value = (verseMetasWithJsCodeData.value.metas as meta[])
      .map((m) => readUnityPreviewMetaJavaScriptCode(m))
      .join("\n");

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
};

const handleClose = async () => {
  if (unsavedBlocklyData.value) {
    try {
      await MessageBox.confirm(
        t("verse.view.script.leave.message1"),
        t("verse.view.script.leave.confirm"),
        {
          confirmButtonText: t("verse.view.script.leave.confirm"),
          cancelButtonText: t("verse.view.script.leave.cancel"),
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
      loadVerseData();
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("message", handleUnityPreviewMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleUnityPreviewMessage);
});
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

.button-icon {
  margin-right: 4px;
}

.unity-preview-trigger-button {
  height: 30px;
  padding: 0 13px;
  font-weight: 500;
  color: var(--primary-color, #06a7ee);
  background: var(--bg-card, #fff);
  border: 1px solid var(--primary-color, #06a7ee);
  border-radius: 8px;
  box-shadow: none;
}

.unity-preview-trigger-button:hover,
.unity-preview-trigger-button:focus {
  color: var(--primary-color, #06a7ee);
  background: var(--primary-light, rgb(3 169 244 / 10%));
  border-color: var(--primary-color, #06a7ee);
  box-shadow: none;
}

.unity-preview-trigger-button:active {
  color: var(--primary-color, #06a7ee);
  background: var(--primary-light, rgb(3 169 244 / 14%));
  border-color: var(--primary-color, #06a7ee);
  box-shadow: none;
}

.unity-preview-trigger-button .button-icon {
  color: currentcolor;
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

:fullscreen .runArea {
  height: 100vh !important;
  padding: 0;
}

:fullscreen .scene-fullscreen-btn {
  margin: 10px;
}
</style>
