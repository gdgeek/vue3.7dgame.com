<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div v-if="meta" class="clearfix">
              <el-link :href="`/meta/meta-edit?id=${id}`" :underline="false">{{
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
                    style="margin: 0; padding: 0; height: 100%; width: 100%"
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
            ></ScenePlayer>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { CopyDocument } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { useRoute } from "vue-router";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
import { Message, MessageBox } from "@/components/Dialog";
import { useAppStore } from "@/store/modules/app";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useUserStore } from "@/store/modules/user";
import * as THREE from "three";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import { convertToHttps } from "@/assets/js/helper";
import pako from "pako";
import {
  buildMetaResourceIndex,
  type MetaResourceIndex,
} from "@/components/Meta/useMetaResourceParser";
import ScenePlayer from "./ScenePlayer.vue";
import jsBeautify from "js-beautify";
import env from "@/environment";

// 统一配置 GLTFLoader（DRACO + KTX2）
const loader = getConfiguredGLTFLoader();
const appStore = useAppStore();
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const src = ref(env.blockly + "?language=" + appStore.language);
let ready: boolean = false;
const editor = ref<HTMLIFrameElement | null>(null);
const { t } = useI18n();
const activeName = ref<string>("blockly");
const languageName = ref<string>("lua");
const LuaCode = ref("");
const JavaScriptCode = ref("");
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);
const disabled = ref<boolean>(false);
type ScenePlayerExpose = {
  sources: Map<string, SceneSource>;
  playAnimation: (uuid: string, animationName: string) => void;
  getAudioUrl: (uuid: string) => string | undefined;
  playQueuedAudio: (
    audio: HTMLAudioElement,
    skipQueue?: boolean
  ) => Promise<void> | void;
};

const scenePlayer = ref<ScenePlayerExpose | null>(null);
const isSceneFullscreen = ref(false);
const isFullscreen = ref(false);
const showCodeDialog = ref(false);
const currentCode = ref("");
const currentCodeType = ref("");
const codeDialogTitle = ref("");
const unsavedBlocklyData = ref<unknown>(null);

type EditorPostPayload = {
  data: unknown;
  lua: string;
  js: string;
};

type EditorUpdatePayload = {
  lua: string;
  js: string;
  blocklyData: unknown;
};

type EditorEventPayload = {
  action?: string;
  data?: unknown;
};

type MeshWrapper = {
  mesh: THREE.Object3D;
  playAnimation?: (animationName: string) => void;
  setText?: (text: string) => void;
  setVisibility?: (visible: boolean) => void;
};

type EntityNode = {
  parameters?: {
    resource?: string | number;
    animations?: string[];
  };
  children?: {
    entities?: EntityNode[];
  };
};

type MetaData = {
  children?: {
    entities?: EntityNode[];
  };
};

type SceneSource = {
  type: string;
  data: {
    mesh?: THREE.Object3D;
    setText?: (text: string) => void;
    setVisibility?: (visible: boolean) => void;
    url?: string;
  };
};

type TaskObject = {
  type?: string;
  execute?: () => Promise<void> | void;
  data?: unknown;
};

type HandlePolygen = (uuid: string) => MeshWrapper | null;
type HandleSound = (uuid: string) => HTMLAudioElement | undefined;
type SoundAPI = {
  play: (
    audio: HTMLAudioElement | undefined,
    skipQueue?: boolean
  ) => Promise<void> | void;
  createTask: (audio: HTMLAudioElement | undefined) => TaskObject | null;
  playTask: (audio: HTMLAudioElement | undefined) => TaskObject | null;
};
type TaskAPI = {
  circle: (count: number, taskToRepeat: unknown) => Promise<void> | void;
  array: (type: string, items: unknown[]) => unknown[];
  execute: (tweenData: unknown) => Promise<void> | void;
  sleep: (seconds: number) => () => Promise<void>;
};
type TweenAPI = {
  to_object: (
    fromObj: MeshWrapper,
    toObj: MeshWrapper,
    duration: number,
    easing: string
  ) => TweenPayload | null;
  to_data: (
    obj: MeshWrapper,
    transformData: {
      position: THREE.Vector3;
      rotation: THREE.Vector3;
      scale: THREE.Vector3;
    },
    duration: number,
    easing: string
  ) => TweenPayload | null;
};
type HelperAPI = {
  handler: (index: string, uuid: string) => unknown;
};
type AnimationAPI = {
  createTask: (
    polygenInstance: MeshWrapper,
    animationName: string
  ) => TaskObject | null;
  playTask: (
    polygenInstance: MeshWrapper,
    animationName: string
  ) => TaskObject | null;
};
type EventAPI = {
  trigger: (index: unknown, eventId: string) => void;
};
type TextAPI = {
  setText: (object: unknown, setText: string) => void;
};
type PointAPI = {
  setVisual: (object: unknown, setVisual: boolean) => void;
};
type TransformAPI = (
  position: unknown,
  rotation: unknown,
  scale: unknown
) => {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  scale: THREE.Vector3;
};
type ArgumentAPI = {
  boolean: (value: boolean) => boolean;
  number: (value: number) => number;
  string: (value: string) => string;
  idPlayer: (value: number) => number;
  point: (position: unknown) => THREE.Vector3;
  range: (centerPoint: THREE.Vector3, radius: number) => THREE.Vector3;
};

type PolygenAPI = {
  playAnimation: (
    polygenInstance: MeshWrapper | null,
    animationName: string
  ) => void;
};

type ScriptExecutor = (
  handlePolygen: HandlePolygen,
  polygen: PolygenAPI,
  handleSound: HandleSound,
  sound: SoundAPI,
  THREE: typeof THREE,
  task: TaskAPI,
  tween: TweenAPI,
  helper: HelperAPI,
  animation: AnimationAPI,
  event: EventAPI,
  text: TextAPI,
  point: PointAPI,
  transform: TransformAPI,
  Vector3: typeof Vector3,
  argument: ArgumentAPI,
  handleText: typeof handleText,
  handleEntity: typeof handleEntity
) => Promise<void>;

type TweenObject = {
  type: "object";
  fromObj: MeshWrapper;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  duration: number;
  easing?: string;
};

type TweenData = {
  type: "data";
  obj: MeshWrapper;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRotation: THREE.Euler;
  endRotation: THREE.Vector3;
  startScale: THREE.Vector3;
  endScale: THREE.Vector3;
  duration: number;
  easing?: string;
};

type TweenPayload = TweenObject | TweenData;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasSetText = (
  value: unknown
): value is { setText: (val: string) => void } =>
  isRecord(value) && typeof value.setText === "function";

const hasSetVisibility = (
  value: unknown
): value is { setVisibility: (val: boolean) => void } =>
  isRecord(value) && typeof value.setVisibility === "function";

const isMetaData = (value: unknown): value is MetaData =>
  isRecord(value) && ("children" in value || "entities" in value);

const isTaskObject = (value: unknown): value is TaskObject =>
  isRecord(value) && ("execute" in value || "type" in value || "data" in value);

const isTweenPayload = (value: unknown): value is TweenPayload => {
  if (!isRecord(value)) return false;
  const typeValue = value.type;
  return typeValue === "object" || typeValue === "data";
};

const isObjectWithType = (value: unknown): value is { type: unknown } =>
  isRecord(value) && "type" in value;

const isObjectWithUrl = (value: unknown): value is { url: unknown } =>
  isRecord(value) && "url" in value;

const isEditorPostPayload = (value: unknown): value is EditorPostPayload => {
  if (!isRecord(value)) return false;
  return typeof value.lua === "string" && typeof value.js === "string";
};

const isEditorUpdatePayload = (
  value: unknown
): value is EditorUpdatePayload => {
  if (!isRecord(value)) return false;
  return typeof value.lua === "string" && typeof value.js === "string";
};

// 监听用户信息变化
watch(
  () => userStore.userInfo,
  () => {
    // 用户信息变化时，向编辑器发送最新用户信息
    postMessage("user-info", {
      id: userStore.userInfo?.id || null,
      //roles: userStore.userInfo?.roles || [],
      role: userStore.getRole(),
    });
  },
  { deep: true }
);

const handleBlocklyChange = (data: unknown) => {
  unsavedBlocklyData.value = data;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    // 进入全屏
    const container = editor.value?.parentElement;
    if (container) {
      container.requestFullscreen();
      isFullscreen.value = true;
    }
  } else {
    // 退出全屏
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

// 全屏代码显示
const showFullscreenCode = (type: "lua" | "javascript") => {
  currentCodeType.value = type;
  currentCode.value = type === "lua" ? LuaCode.value : JavaScriptCode.value;
  codeDialogTitle.value = type === "lua" ? "Lua Code" : "JavaScript Code";
  showCodeDialog.value = true;
};

// 场景全屏
const toggleSceneFullscreen = () => {
  if (!document.fullscreenElement) {
    const container = document.querySelector(".runArea");
    if (container) {
      container.requestFullscreen();
      isSceneFullscreen.value = true;
    }
  } else {
    document.exitFullscreen();
    isSceneFullscreen.value = false;
  }
};

// 定义单次赋值
const defineSingleAssignment = <T,>(initialValue: T) => {
  let value = initialValue;
  let isAssigned = false;

  return {
    get() {
      return value;
    },
    set(newValue: T) {
      if (!isAssigned) {
        value = newValue;
        isAssigned = true;
        // console.log("值已成功赋值为:", newValue);
      } else {
        logger.log("cannot be assigned again");
      }
    },
  };
};
// 保存编辑器初始化lua代码
const initLuaCode = defineSingleAssignment("");

// 动态加载代码样式
const loadHighlightStyle = (isDark: boolean) => {
  const existingLink = document.querySelector(
    "#highlight-style"
  ) as HTMLLinkElement;
  logger.log("existingLink", existingLink);
  if (existingLink) {
    existingLink.href = isDark
      ? "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-dark.css"
      : "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-light.css";
  } else {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = "highlight-style";
    link.href = isDark
      ? "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-dark.css"
      : "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-light.css";
    document.head.appendChild(link);
  }
};

watch(isDark, (newValue) => {
  loadHighlightStyle(newValue);
});

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);

    Message.success(t("copy.success"));
  } catch (_error) {
    Message.error(t("copy.error"));
  }
};

watch(
  () => appStore.language, // 监听 language 的变化
  (newValue) => {
    src.value = env.blockly + "?language=" + newValue;
    initEditor();
  }
);

const postScript = async (message: EditorPostPayload) => {
  if (meta.value === null) {
    Message.error(t("meta.script.error1"));
    return;
  }
  if (!meta.value.editable) {
    Message.error(t("meta.script.error2"));
    return;
  }

  // 压缩 blockly 数据
  let blocklyData = JSON.stringify(message.data);
  if (blocklyData.length > 1024 * 2) {
    // 如果超过2KB就进行压缩
    const uint8Array = pako.deflate(blocklyData);
    // 将压缩后的数据转换为 Base64
    const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
    blocklyData = `compressed:${base64Str}`; // 压缩标记
  }

  await putMetaCode(meta.value.id, {
    blockly: blocklyData,
    lua: message.lua,
    js: message.js,
  });

  Message.success(t("meta.script.success"));
};

const formatJavaScript = (code: string) => {
  try {
    return jsBeautify(code, {
      indent_size: 2,
      indent_char: " ",
      preserve_newlines: true,
      max_preserve_newlines: 2,
      space_in_empty_paren: false,
      jslint_happy: false,
      space_after_anon_function: true,
      brace_style: "collapse",
      break_chained_methods: false,
      keep_array_indentation: false,
      unescape_strings: false,
      wrap_line_length: 0,
      end_with_newline: true,
      comma_first: false,
    });
  } catch (error) {
    logger.error("代码格式化失败:", error);
    return code;
  }
};

const handleMessage = async (e: MessageEvent) => {
  try {
    const payload = e.data as EditorEventPayload;
    if (!payload || !payload.action) {
      return;
    }
    const params = payload;

    if (params.action === "ready") {
      ready = true;
      initEditor();

      // 发送用户信息
      postMessage("user-info", {
        id: userStore.userInfo?.id || null,
        //roles: userStore.userInfo?.roles || [],
        role: userStore.getRole(),
      });
    } else if (params.action === "post") {
      if (!isEditorPostPayload(params.data)) {
        Message.error(t("meta.script.error1"));
        return;
      }
      await postScript(params.data);

      if (saveResolve) {
        saveResolve();
        saveResolve = null;
      }
    } else if (params.action === "post:no-change") {
      Message.info(t("meta.script.info"));
    } else if (params.action === "update") {
      if (!isEditorUpdatePayload(params.data)) return;
      LuaCode.value = "local meta = {}\nlocal index = ''\n" + params.data.lua;
      // JavaScriptCode.value = params.data.js;
      JavaScriptCode.value = formatJavaScript(params.data.js);
      initLuaCode.set(LuaCode.value);
      handleBlocklyChange(params.data.blocklyData);
    }
  } catch (_e) {
    logger.log("ex:" + String(_e));
    return;
  }
};

// 标记是否有未保存的更改
const hasUnsavedChanges = ref<boolean>(false);
// 保存操作的 Promise 解析函数
let saveResolve: (() => void) | null = null;

const save = (): Promise<void> => {
  hasUnsavedChanges.value = false;
  return new Promise<void>((resolve) => {
    saveResolve = resolve;
    postMessage("save", { language: ["lua", "js"], data: {} });
  });
};

// 页面关闭提示
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};

// 离开时，如果有未保存的更改，则提示用户是否要保存
onBeforeRouteLeave(async (to, from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await MessageBox.confirm(
        t("meta.script.leave.message1"),
        t("meta.script.leave.message2"),
        {
          confirmButtonText: t("meta.script.leave.confirm"),
          cancelButtonText: t("meta.script.leave.cancel"),
          type: "warning",
        }
      );

      // 用户点击确认,保存并跳转
      try {
        await save();
        next();
      } catch (error) {
        Message.error(t("meta.script.leave.error"));
        next(false);
      }
    } catch (action) {
      // 区分取消（否）按钮和关闭按钮(x)的行为
      if (action === "cancel") {
        // 点击取消按钮,不保存直接跳转
        hasUnsavedChanges.value = false;
        Message.info(t("meta.script.leave.info"));
        next();
      } else {
        // 点击关闭按钮(x),取消跳转
        next(false);
      }
    }
  } else {
    next();
  }
});

watch(LuaCode, (newValue, _oldValue) => {
  hasUnsavedChanges.value = false;
  if (newValue !== initLuaCode.get()) {
    hasUnsavedChanges.value = true;
  }
});

const postMessage = (action: string, data: unknown = {}) => {
  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "script.meta.web",
        action: action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    Message.error(t("meta.script.error3"));
  }
};
const test = ref<MetaResourceIndex | null>(null);
// wrapper for extracted resource parser
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
  if (!ready) return;

  let blocklyData = meta.value.metaCode?.blockly || "{}";
  try {
    if (blocklyData.startsWith("compressed:")) {
      // 解压缩数据
      const base64Str = blocklyData.substring(11); // 移除 'compressed:' 前缀
      // 将 Base64 转换回二进制数据
      const binaryString = atob(base64Str);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      blocklyData = pako.inflate(uint8Array, { to: "string" });
    }
    const data = unsavedBlocklyData.value ?? JSON.parse(blocklyData);
    // console.warn("blocklydata: " + JSON.stringify(data));
    test.value = getResource(meta.value);
    postMessage("init", {
      language: ["lua", "js"],
      style: ["base", "meta"],
      data: data,
      parameters: {
        index: meta.value.id,
        resource: getResource(meta.value),
      },
    });
  } catch (error) {
    logger.error("Failed to decompress or parse data:", error);
  }
};
// 资源解析已提取到 src/composables/meta/useMetaResourceParser.ts -> buildMetaResourceIndex

const handleKeyDown = (e: KeyboardEvent) => {
  // 检测Ctrl+S或Command+S (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault(); // 阻止浏览器默认的保存行为
    save();
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage); //注销
  window.removeEventListener("beforeunload", handleBeforeUnload); //注销2
  window.removeEventListener("keydown", handleKeyDown); //注销3
  document.removeEventListener("keydown", (e) => {
    if (e.key === "Escape" && showCodeDialog.value) {
      showCodeDialog.value = false;
    }
  });
  document.removeEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });

  document.removeEventListener("fullscreenchange", () => {
    isSceneFullscreen.value = !!document.fullscreenElement;
  });
});
onMounted(async () => {
  window.addEventListener("message", handleMessage); // 增加事件舰艇
  window.addEventListener("keydown", handleKeyDown); // 添加键盘事件监听
  loadHighlightStyle(isDark.value); //载入高光
  window.addEventListener("beforeunload", handleBeforeUnload); //在卸载之前执行

  try {
    loading.value = true;
    const response = await getMeta(id.value, {
      expand: "cyber,event,share,metaCode",
    });

    logger.log("response数据", response);

    // 用递归处理层级嵌套
    const assignAnimations = (
      entities: EntityNode[],
      modelId: number,
      animationNames: string[]
    ) => {
      entities.forEach((item) => {
        // 如果满足条件则赋值 animations

        if (
          item.parameters?.resource != null &&
          item.parameters?.resource.toString() === modelId.toString()
        ) {
          item.parameters.animations = animationNames;
        }

        // 如果当前项还有 children.entities，继续递归处理
        if (item.children?.entities) {
          assignAnimations(item.children.entities, modelId, animationNames);
        }
      });
    };

    if (response.data.resources.length > 0) {
      try {
        // 循环处理每个模型文件
        for (const model of response.data.resources) {
          if (model.type !== "polygen") {
            meta.value = response.data;
            continue;
          }

          const modelUrl = convertToHttps(model.file.url);
          // const modelUrl = model.file.url;
          //  console.error("modelUrl", modelUrl);
          const modelId = model.id;

          // 等待每个模型加载完成获取数据后再继续
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && showCodeDialog.value) {
      showCodeDialog.value = false;
    }
  });
  document.addEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  document.addEventListener("fullscreenchange", () => {
    isSceneFullscreen.value = !!document.fullscreenElement;
  });
});

const handlePolygen = (uuid: string) => {
  if (!scenePlayer.value) {
    logger.error("ScenePlayer未初始化");
    return null;
  }

  const modelUuid = uuid.toString();

  // 添加重试机制
  const getModel = (uuid: string, retries = 3): THREE.Object3D | null => {
    const source = scenePlayer.value?.sources.get(uuid) as
      | SceneSource
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
      logger.log("播放动画:", {
        uuid: modelUuid,
        animationName,
        model: model,
      });
      scenePlayer.value?.playAnimation(modelUuid, animationName);
    },
  };
};

const handleSound = (uuid: string): HTMLAudioElement | undefined => {
  const audioUrl = scenePlayer.value?.getAudioUrl(uuid);
  if (!audioUrl) {
    logger.error(`找不到UUID为 ${uuid} 的音频资源`);
    return undefined;
  }

  const audio = new Audio(audioUrl);
  return audio;
};
const run = async () => {
  disabled.value = true;

  // 递归计算实体数量
  const countEntities = (entities: EntityNode[]): number => {
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

  const waitForModels = () => {
    return new Promise<void>((resolve) => {
      const checkModels = () => {
        const metaData = meta.value?.data;
        const entities = isMetaData(metaData)
          ? metaData.children?.entities
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
            sources: scenePlayer.value?.sources,
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
  };

  await waitForModels();

  if (!JavaScriptCode.value) return;

  window.meta = {};
  const Vector3 = THREE.Vector3;
  const polygen = {
    playAnimation: (
      polygenInstance: MeshWrapper | null,
      animationName: string
    ) => {
      if (!polygenInstance) {
        logger.error("polygen实例为空");
        return;
      }
      if (typeof polygenInstance.playAnimation !== "function") {
        logger.error("polygen实例缺少playAnimation方法");
        return;
      }
      polygenInstance.playAnimation(animationName);
    },
  };

  const sound = {
    play: async (
      audio: HTMLAudioElement | undefined,
      skipQueue: boolean = false
    ) => {
      if (!audio) {
        logger.error("音频资源无效");
        return;
      }
      await scenePlayer.value?.playQueuedAudio(audio, skipQueue);
    },

    createTask: (audio: HTMLAudioElement | undefined) => {
      if (!audio) {
        logger.error("音频资源无效");
        return null;
      }
      return {
        type: "audio",
        execute: async () => {
          await scenePlayer.value?.playQueuedAudio(audio);
        },
        data: audio,
      };
    },

    playTask: (audio: HTMLAudioElement | undefined) => {
      const taskObj = sound.createTask(audio);
      if (!taskObj) return null;

      // 立即执行
      taskObj.execute?.();
      return taskObj;
    },
  };

  const helper = {
    handler: (index: string, uuid: string) => {
      const source = scenePlayer.value?.sources.get(uuid);
      logger.error("当前的source", source);
      if (!source) {
        logger.error(`找不到UUID为 ${uuid} 的实体`);
        return null;
      }
      return source.data;
    },
  };

  // 处理文本实体
  const handleText = (uuid: string) => {
    const source = scenePlayer.value?.sources.get(uuid);
    if (!source) {
      logger.error(`找不到UUID为 ${uuid} 的文本实体`);
      return null;
    }
    return source.data;
  };

  // 处理所有类型的实体(polygen模型、voxel体素、picture图片、text文本、video视频等)
  const handleEntity = (uuid: string) => {
    const source = scenePlayer.value?.sources.get(uuid);
    if (!source) {
      logger.error(`找不到UUID为 ${uuid} 的实体`);
      return null;
    }
    return source.data;
  };

  // 补间动画工具类
  const tween = {
    to_object: (
      fromObj: MeshWrapper,
      toObj: MeshWrapper,
      duration: number,
      easing: string
    ) => {
      if (!fromObj || !toObj) {
        logger.error("补间动画对象无效");
        return null;
      }

      const startPos = fromObj.mesh.position.clone();
      const endPos = toObj.mesh.position.clone();

      return {
        type: "object",
        fromObj,
        startPos,
        endPos,
        duration,
        easing,
      };
    },

    to_data: (
      obj: MeshWrapper,
      transformData: {
        position: THREE.Vector3;
        rotation: THREE.Vector3;
        scale: THREE.Vector3;
      },
      duration: number,
      easing: string
    ) => {
      if (!obj) {
        logger.error("目标对象无效");
        return null;
      }

      const startPos = obj.mesh.position.clone();
      const endPos = transformData.position;

      // 将角度转换为弧度
      const endRotationRadians = new THREE.Vector3(
        THREE.MathUtils.degToRad(transformData.rotation.x),
        THREE.MathUtils.degToRad(transformData.rotation.y),
        THREE.MathUtils.degToRad(transformData.rotation.z)
      );

      return {
        type: "data",
        obj,
        startPos,
        endPos,
        startRotation: obj.mesh.rotation.clone(),
        endRotation: endRotationRadians, // 使用转换后的弧度值
        startScale: obj.mesh.scale.clone(),
        endScale: transformData.scale,
        duration,
        easing,
      };
    },
  };

  // 任务执行器
  const task = {
    circle: async (count: number, taskToRepeat: unknown) => {
      logger.log("Executing circle task:", { count, taskToRepeat });

      if (typeof count !== "number" || count < 0) {
        logger.warn("循环次数必须是正数:", count);
        return;
      }

      let resolvedTask: unknown = taskToRepeat;
      if (taskToRepeat instanceof Promise) {
        resolvedTask = await taskToRepeat;
      }

      for (let i = 0; i < count; i++) {
        logger.log(`执行第 ${i + 1}/${count} 次任务`);

        try {
          if (resolvedTask) {
            if (typeof resolvedTask === "function") {
              await resolvedTask();
            } else if (
              isTaskObject(resolvedTask) &&
              typeof resolvedTask.execute === "function"
            ) {
              await resolvedTask.execute();
            } else if (
              isTaskObject(resolvedTask) &&
              resolvedTask.type === "audio"
            ) {
              await sound.play(
                resolvedTask.data as HTMLAudioElement | undefined
              );
            } else if (
              isTaskObject(resolvedTask) &&
              resolvedTask.type === "animation"
            ) {
              await resolvedTask.execute?.();
            } else {
              logger.warn(`无法执行的任务类型:`, resolvedTask);
              return;
            }
          }

          if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          logger.error(`第 ${i + 1} 次任务执行失败:`, error);
        }
      }
    },

    array: (type: string, items: unknown[]) => {
      logger.log("Creating array:", { type, items });

      const processArrayItems = (items: unknown[]): unknown[] => {
        return items.map((item) => {
          // 如果是数组，递归处理
          if (Array.isArray(item)) {
            return processArrayItems(item);
          }
          if (isObjectWithType(item)) {
            return item;
          }
          if (isObjectWithUrl(item)) {
            return "audio";
          }
          if (item instanceof Promise) {
            return item;
          }
          return item;
        });
      };

      let result;
      if (type === "LIST") {
        result = processArrayItems(items);
      } else if (type === "SET") {
        const processed = processArrayItems(items);
        result = Array.from(new Set(processed));
      } else {
        logger.warn(`未知的数组类型: ${type}，默认使用 LIST 类型`);
        result = processArrayItems(items);
      }

      logger.log("Processed array result:", result);
      return result;
    },

    execute: async (tweenData: unknown) => {
      if (!tweenData) return;

      if (typeof tweenData === "function") {
        await tweenData();
        return;
      }
      if (tweenData instanceof Promise) {
        return await tweenData;
      }
      if (!isTweenPayload(tweenData)) return;

      type EasingFunction = (t: number) => number;
      type EasingType =
        | "LINEAR"
        | "EASE_IN"
        | "EASE_OUT"
        | "EASE_IN_OUT"
        | "BOUNCE_IN"
        | "BOUNCE_OUT"
        | "BOUNCE_IN_OUT";

      const easingFunctions: Record<EasingType, EasingFunction> = {
        LINEAR: (t: number) => t,
        EASE_IN: (t: number) => t * t,
        EASE_OUT: (t: number) => 1 - Math.pow(1 - t, 2),
        EASE_IN_OUT: (t: number) =>
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        BOUNCE_IN: (t: number) => 1 - easingFunctions.BOUNCE_OUT(1 - t),
        BOUNCE_OUT: (t: number) => {
          if (t < 1 / 2.75) {
            return 7.5625 * t * t;
          } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
          } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
          } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
          }
        },
        BOUNCE_IN_OUT: (t: number) => {
          return t < 0.5
            ? (1 - easingFunctions.BOUNCE_OUT(1 - 2 * t)) / 2
            : (1 + easingFunctions.BOUNCE_OUT(2 * t - 1)) / 2;
        },
      };

      return new Promise<void>((resolve) => {
        const startTime = Date.now();
        const animate = () => {
          const currentTime = Date.now();
          const elapsed = (currentTime - startTime) / 1000;
          const progress = Math.min(elapsed / Number(tweenData.duration), 1);

          const easing = String(
            tweenData.easing || "LINEAR"
          ).toUpperCase() as EasingType;
          const easingFunction =
            easingFunctions[easing] || easingFunctions.LINEAR;
          const easeProgress = easingFunction(progress);

          if (tweenData.type === "object") {
            const newPos = tweenData.startPos
              .clone()
              .lerp(tweenData.endPos, easeProgress);
            tweenData.fromObj.mesh.position.copy(newPos);
          } else if (tweenData.type === "data") {
            const newPos = tweenData.startPos
              .clone()
              .lerp(tweenData.endPos, easeProgress);
            tweenData.obj.mesh.position.copy(newPos);

            // 使用 THREE.MathUtils.lerp 进行旋转插值
            tweenData.obj.mesh.rotation.set(
              THREE.MathUtils.lerp(
                tweenData.startRotation.x,
                tweenData.endRotation.x,
                easeProgress
              ),
              THREE.MathUtils.lerp(
                tweenData.startRotation.y,
                tweenData.endRotation.y,
                easeProgress
              ),
              THREE.MathUtils.lerp(
                tweenData.startRotation.z,
                tweenData.endRotation.z,
                easeProgress
              )
            );

            const newScale = tweenData.startScale
              .clone()
              .lerp(tweenData.endScale, easeProgress);
            tweenData.obj.mesh.scale.copy(newScale);
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    },

    sleep: (seconds: number) => {
      return () =>
        new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
    },
  };

  // 动画工具类
  const animation = {
    createTask: (polygenInstance: MeshWrapper, animationName: string) => {
      if (!polygenInstance) {
        logger.error("polygen实例为空");
        return null;
      }
      if (typeof polygenInstance.playAnimation !== "function") {
        logger.error("polygen实例缺少playAnimation方法");
        return null;
      }

      return {
        type: "animation",
        execute: async () => {
          polygenInstance.playAnimation(animationName);
        },
        data: {
          instance: polygenInstance,
          animationName: animationName,
        },
      };
    },

    playTask: (polygenInstance: MeshWrapper, animationName: string) => {
      const taskObj = animation.createTask(polygenInstance, animationName);
      if (!taskObj) return null;

      // 立即执行
      taskObj.execute?.();
      return taskObj;
    },
  };

  const event = {
    trigger: (index: unknown, eventId: string) => {
      logger.log("触发事件:", index, eventId);
    },
  };

  const text = {
    setText: (object: unknown, setText: string) => {
      if (hasSetText(object)) {
        object.setText(setText);
      } else {
        logger.warn("object.setText is not a function");
      }
    },
  };

  const point = {
    setVisual: (object: unknown, setVisual: boolean) => {
      logger.error("setVisual", object, setVisual);
      if (hasSetVisibility(object)) {
        object.setVisibility(setVisual);
      } else {
        logger.error("object.setVisibility is not a function");
      }
    },
  };

  const transform = (position: unknown, rotation: unknown, scale: unknown) => {
    return {
      position: position instanceof Vector3 ? position : new Vector3(),
      rotation: rotation instanceof Vector3 ? rotation : new Vector3(),
      scale: scale instanceof Vector3 ? scale : new Vector3(1, 1, 1),
    };
  };

  const argument = {
    boolean: (value: boolean) => {
      return value;
    },
    number: (value: number) => {
      return value;
    },
    string: (value: string) => {
      return value;
    },
    idPlayer: (value: number) => {
      return value;
    },
    point: (position: unknown) => {
      return position instanceof Vector3 ? position : new Vector3();
    },
    range: (centerPoint: THREE.Vector3, radius: number) => {
      const center =
        centerPoint instanceof Vector3 ? centerPoint : new Vector3();
      // 生成随机角度
      const theta = Math.random() * Math.PI * 2; // 水平角度 (0 到 2π)
      const phi = Math.acos(2 * Math.random() - 1); // 垂直角度 (0 到 π)
      // 生成随机半径 (0 到指定半径)
      const r = radius * Math.cbrt(Math.random()); // 使用立方根来确保均匀分布
      // 计算随机点的坐标
      const x = center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = center.y + r * Math.sin(phi) * Math.sin(theta);
      const z = center.z + r * Math.cos(phi);
      return new Vector3(x, y, z);
    },
  };

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
    const executableFunction = createFunction() as ScriptExecutor;

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
};

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
