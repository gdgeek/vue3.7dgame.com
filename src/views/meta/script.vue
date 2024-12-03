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
              /【{{ $t("meta.script.title") || "Script Title" }}】
              <el-button type="primary" size="small" @click="run"
                >测试运行</el-button
              >
              <el-button type="primary" size="small" @click="disabled = false">
                返回
              </el-button>
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="save">
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  {{ $t("meta.script.save") || "Save" }}
                </el-button>
              </el-button-group>
            </div>
          </template>
          <el-container v-if="!disabled">
            <el-tabs v-model="activeName" type="card" style="width: 100%">
              <el-tab-pane
                :label="$t('verse.view.script.edit') || 'Edit Script'"
                name="blockly"
              >
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
                          style="margin-right: 50px"
                          @click="showFullscreenCode('javascript')"
                        >
                          JavaScript
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
                              {{ $t("copy.title") || "Copy" }}
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
            <ScenePlayer ref="scenePlayer" :meta="meta"></ScenePlayer>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
import { cybersType, postCyber, putCyber } from "@/api/v1/cyber";
import { ElMessage } from "element-plus";
import { useAppStore } from "@/store/modules/app";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { convertToHttps } from "@/assets/js/helper";
import pako from "pako";
import ScenePlayer from "./ScenePlayer.vue";
import jsBeautify from "js-beautify";

const loader = new GLTFLoader();
const appStore = useAppStore();
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const src = ref(
  import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + appStore.language
);
let ready: boolean = false;
const editor = ref<HTMLIFrameElement | null>(null);
const { t } = useI18n();
const activeName = ref<string>("blockly");
const languageName = ref<string>("lua");
const LuaCode = ref("");
const JavaScriptCode = ref("");
const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// 添加全屏相关状态和方法
const isFullscreen = ref(false);
const editorContainer = ref<HTMLElement | null>(null);

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

const showCodeDialog = ref(false);
const currentCode = ref("");
const currentCodeType = ref("");
const codeDialogTitle = ref("");

// 显示全屏代码
const showFullscreenCode = (type: "lua" | "javascript") => {
  currentCodeType.value = type;
  currentCode.value = type === "lua" ? LuaCode.value : JavaScriptCode.value;
  codeDialogTitle.value = type === "lua" ? "Lua Code" : "JavaScript Code";
  showCodeDialog.value = true;
};

// 监听 ESC 键关闭代码弹窗
onMounted(() => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && showCodeDialog.value) {
      showCodeDialog.value = false;
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", (e) => {
    if (e.key === "Escape" && showCodeDialog.value) {
      showCodeDialog.value = false;
    }
  });
});

// 定义单次赋值
const defineSingleAssignment = (initialValue: any) => {
  let value = initialValue;
  let isAssigned = false;

  return {
    get() {
      return value;
    },
    set(newValue: any) {
      if (!isAssigned) {
        value = newValue;
        isAssigned = true;
        // console.log("值已成功赋值为:", newValue);
      } else {
        console.log("cannot be assigned again");
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
  console.log("existingLink", existingLink);
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

    ElMessage({
      message: t("copy.success") || "Copy successful",
      type: "success",
    });
  } catch (error) {
    ElMessage({
      message: t("copy.error") || "Copy failed",
      type: "error",
    });
  }
};

watch(
  () => appStore.language, // 监听 language 的变化
  (newValue) => {
    src.value = import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + newValue;
    initEditor();
  }
);

const postScript = async (message: any) => {
  if (meta.value === null) {
    ElMessage({
      message: t("meta.script.error1") || "Error 1",
      type: "error",
    });
    return;
  }
  if (!meta.value.editable) {
    ElMessage({
      message: t("meta.script.error2") || "Error 2",
      type: "error",
    });
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

  ElMessage({
    message: t("meta.script.success") || "Success",
    type: "success",
  });
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
    console.error("代码格式化失败:", error);
    return code;
  }
};

const handleMessage = async (e: MessageEvent) => {
  try {
    if (!e.data.action) {
      return;
    }
    const params: any = e.data;

    if (params.action === "ready") {
      ready = true;
      initEditor();
    } else if (params.action === "post") {
      await postScript(params.data);

      if (saveResolve) {
        saveResolve();
        saveResolve = null;
      }
    } else if (params.action === "post:no-change") {
      ElMessage({
        message: t("meta.script.info") || "Info",
        type: "info",
      });
    } else if (params.action === "update") {
      LuaCode.value = "local meta = {}\nlocal index = ''\n" + params.data.lua;
      // JavaScriptCode.value = params.data.js;
      JavaScriptCode.value = formatJavaScript(params.data.js);
      initLuaCode.set(LuaCode.value);
    }
  } catch (e: any) {
    console.log("ex:" + e);
    return;
  }
};

// 标记是否有未保存的更改
const hasUnsavedChanges = ref<boolean>(false);
// 保存操作的 Promise 解析函数
let saveResolve: (() => void) | null = null;

const save = (): Promise<void> => {
  hasUnsavedChanges.value = false;
  return new Promise<void>((resolve, reject) => {
    saveResolve = resolve;
    postMessage("save", { language: ["lua", "js"], data: {} });
  });
};

// 页面关闭提示
const handleBeforeUnload = (event: any) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};

// 离开时，如果有未保存的更改，则提示用户是否要保存
onBeforeRouteLeave(async (to, from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm(
        t("meta.script.leave.message1"),
        t("meta.script.leave.message2"),
        {
          confirmButtonText: t("meta.script.leave.confirm"),
          cancelButtonText: t("meta.script.leave.cancel"),
          type: "warning",
          showClose: true,
          closeOnClickModal: false,
          distinguishCancelAndClose: true, // 是否将取消（点击取消按钮）与关闭（点击关闭按钮或遮罩层、按下 Esc 键）进行区分
        }
      );

      // 用户点击确认,保存并跳转
      try {
        await save();
        next();
      } catch (error) {
        ElMessage.error(t("meta.script.leave.error"));
        next(false);
      }
    } catch (action) {
      // 区分取消（否）按钮和关闭按钮(x)的行为
      if (action === "cancel") {
        // 点击取消按钮,不保存直接跳转
        hasUnsavedChanges.value = false;
        ElMessage.info(t("meta.script.leave.info"));
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

watch(LuaCode, (newValue, oldValue) => {
  hasUnsavedChanges.value = false;
  if (newValue !== initLuaCode.get()) {
    hasUnsavedChanges.value = true;
  }
});

const postMessage = (action: string, data: any = {}) => {
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
    ElMessage({
      message: t("meta.script.error3"),
      type: "error",
    });
  }
};
const test = ref<any>();
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
    const data = JSON.parse(blocklyData);

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
    console.error("Failed to decompress or parse data:", error);
  }
};
const testAction = (data: any) => {
  if (
    data &&
    data.parameters &&
    typeof data.parameters.action !== "undefined"
  ) {
    return {
      uuid: data.parameters.uuid,
      name: data.parameters.action ?? null,
      parameter: data.parameters.parameter ?? null,
    };
  }
};
const testPoint = (data: any, typeList: string[]) => {
  if (!data) {
    return;
  }
  const isValidType = typeList.find(
    (type) => data.type.toLowerCase() === type.toLowerCase()
  );

  if (isValidType) {
    const animations = data.parameters?.animations ?? null;
    return {
      uuid: data.parameters.uuid,
      name: data.parameters.name ?? null,
      ...(data.type.toLowerCase() === "polygen" ? { animations } : {}), // 如果类型为 Polygen，加入 animations 属性
    };
  }

  return undefined;
};

const addMetaData = (data: any, ret: any) => {
  const action = testAction(data);
  if (action) {
    ret.action.push(action);
  }

  const entity = testPoint(data, [
    "polygen",
    "entity",
    "voxel",
    "video",
    "picture",
    "text",
    "voxel",
  ]);

  if (entity) {
    ret.entity.push(entity);
  }

  const polygen = testPoint(data, ["polygen"]);
  if (polygen) {
    ret.polygen.push(polygen);
  }

  const video = testPoint(data, ["video"]);
  if (video) {
    ret.video.push(video);
  }

  const picture = testPoint(data, ["picture"]);
  if (picture) {
    ret.picture.push(picture);
  }

  const sound = testPoint(data, ["sound"]);
  if (sound) {
    ret.sound.push(sound);
  }

  const text = testPoint(data, ["text"]);
  if (text) {
    ret.text.push(text);
  }

  const voxel = testPoint(data, ["voxel"]);
  if (voxel) {
    ret.voxel.push(voxel);
  }

  if (data.children) {
    Object.keys(data.children).forEach((key) => {
      data.children[key].forEach((item: any) => {
        addMetaData(item, ret);
      });
    });
  }
};
const getResource = (meta: metaInfo) => {
  const data = JSON.parse(meta.data!);
  console.log("data", data);
  const ret = {
    action: [],
    trigger: [],
    polygen: [],
    picture: [],
    video: [],
    voxel: [],
    text: [],
    sound: [],
    entity: [],
    events: {
      inputs: [],
      outputs: [],
    },
  };
  ret.events = JSON.parse(meta.events!) || { inputs: [], outputs: [] };

  if (data) addMetaData(data, ret);
  return ret;
};

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});
onMounted(async () => {
  window.addEventListener("message", handleMessage);
  loadHighlightStyle(isDark.value);

  window.addEventListener("beforeunload", handleBeforeUnload);

  try {
    loading.value = true;
    const response = await getMeta(id.value, "cyber,event,share,metaCode");
    console.log("response数据", response);

    // 用递归处理层级嵌套
    const assignAnimations = (
      entities: any[],
      modelId: string,
      animationNames: string[]
    ) => {
      entities.forEach((item: any) => {
        // 如果满足条件则赋值 animations
        if (item.parameters?.resource === modelId) {
          item.parameters.animations = animationNames;
        }

        // 如果当前项还有 children.entities，继续递归处理
        if (item.children?.entities) {
          assignAnimations(item.children.entities, modelId, animationNames);
        }
      });
    };

    // 循环处理每个模型文件
    for (const [index, model] of response.data.resources.entries()) {
      if (model.type !== "polygen") {
        meta.value = response.data;
        continue;
      }

      const modelUrl = convertToHttps(model.file.url);
      // const modelUrl = model.file.url;
      console.error("modelUrl", modelUrl);
      const modelId = model.id.toString();

      // 等待每个模型加载完成获取数据后再继续
      await new Promise<void>((resolve, reject) => {
        loader.load(
          modelUrl,
          (gltf) => {
            const animationNames = gltf.animations.map((clip) => clip.name);

            let data = JSON.parse(response.data.data!);

            // 调用递归函数对所有满足条件的项赋值 animations
            assignAnimations(data.children.entities, modelId, animationNames);

            response.data.data = JSON.stringify(data);
            meta.value = response.data;

            resolve();
          },
          undefined,
          (error) => {
            console.error("An error occurred while loading the model:", error);
            reject(error);
          }
        );
      });
    }

    console.log("meta", meta.value);
    initEditor();
  } catch (error: any) {
    alert(error.message);
    ElMessage({
      message: error.message,
      type: "error",
    });
  } finally {
    loading.value = false;
  }
});

const disabled = ref<boolean>(false);
const scenePlayer = ref<InstanceType<typeof ScenePlayer>>();

const handlePolygen = (uuid: string) => {
  if (!scenePlayer.value) {
    console.error("ScenePlayer未初始化");
    return null;
  }

  const modelUuid = uuid.toString();

  // 添加重试机制
  const getModel = (uuid: string, retries = 3): THREE.Object3D | null => {
    const source = scenePlayer.value?.sources.get(uuid);
    if (source && source.type === "model") {
      return source.data as THREE.Object3D;
    }

    if (retries > 0) {
      console.log(`模型未找到，剩余重试次数: ${retries}`);
      setTimeout(() => getModel(uuid, retries - 1), 100);
    }
    return null;
  };

  const model = getModel(modelUuid);

  console.log("查找模型:", {
    requestedUuid: modelUuid,
    availableModels: Array.from(scenePlayer.value.sources.keys()),
    modelExists: scenePlayer.value.sources.has(modelUuid),
    foundModel: model,
  });

  if (!model) {
    console.error(`找不到UUID为 ${modelUuid} 的模型`);
    return null;
  }

  return {
    playAnimation: (animationName: string) => {
      console.log("播放动画:", {
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
    console.error(`找不到UUID为 ${uuid} 的音频资源`);
    return undefined;
  }

  const audio = new Audio(audioUrl);
  return audio;
};

const run = async () => {
  disabled.value = true;

  // 等待场景加载完成
  await nextTick();

  // 添加延迟等待所有模型加载完成
  const waitForModels = () => {
    return new Promise((resolve) => {
      const checkModels = () => {
        const metaData = JSON.parse(meta.value!.data!);
        const expectedModels = metaData.children.entities.length;

        if (scenePlayer.value?.sources.size === expectedModels) {
          console.log("所有资源加载完成:", {
            expected: expectedModels,
            loaded: scenePlayer.value!.sources.size,
            sources: scenePlayer.value!.sources,
          });
          resolve(true);
        } else {
          console.log("等待资源加载...", {
            expected: expectedModels,
            current: scenePlayer.value?.sources.size || 0,
          });
          setTimeout(checkModels, 100);
        }
      };
      checkModels();
    });
  };

  await waitForModels();

  if (JavaScriptCode.value) {
    const polygen = {
      playAnimation: (polygenInstance: any, animationName: string) => {
        if (!polygenInstance) {
          console.error("polygen实例为空");
          return;
        }
        if (typeof polygenInstance.playAnimation !== "function") {
          console.error("polygen实例缺少playAnimation方法");
          return;
        }
        polygenInstance.playAnimation(animationName);
      },
    };

    // 添加音频播放辅助函数
    const sound = {
      play: async (audio: HTMLAudioElement | undefined) => {
        if (!audio) {
          console.error("音频资源无效");
          return;
        }
        await scenePlayer.value?.playQueuedAudio(audio);
      },
    };

    const helper = {
      handler: (index: string, uuid: string) => {
        const source = scenePlayer.value?.sources.get(uuid);
        if (!source) {
          console.error(`找不到UUID为 ${uuid} 的实体`);
          return null;
        }
        return source.data;
      },
    };

    // 补间动画工具类
    const tween = {
      to_object: (
        fromObj: any,
        toObj: any,
        duration: number,
        easing: string
      ) => {
        if (!fromObj || !toObj) {
          console.error("补间动画对象无效");
          return null;
        }

        const startPos = fromObj.position.clone();
        const endPos = toObj.position.clone();

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
        obj: any,
        transformData: any,
        duration: number,
        easing: string
      ) => {
        if (!obj) {
          console.error("目标对象无效");
          return null;
        }

        const startPos = obj.position.clone();
        const endPos = transformData.position;

        return {
          type: "data",
          obj,
          startPos,
          endPos,
          startRotation: obj.rotation.clone(),
          endRotation: transformData.rotation,
          startScale: obj.scale.clone(),
          endScale: transformData.scale,
          duration,
          easing,
        };
      },
    };

    // 任务执行器
    const task = {
      execute: async (tweenData: any) => {
        if (!tweenData) return;

        if (typeof tweenData === "function") {
          await tweenData();
          return;
        }

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
            const progress = Math.min(elapsed / tweenData.duration, 1);

            const easing = tweenData.easing as EasingType;
            const easeProgress = easingFunctions[easing](progress);

            if (tweenData.type === "object") {
              const newPos = tweenData.startPos
                .clone()
                .lerp(tweenData.endPos, easeProgress);
              tweenData.fromObj.position.copy(newPos);
            } else if (tweenData.type === "data") {
              const newPos = tweenData.startPos
                .clone()
                .lerp(tweenData.endPos, easeProgress);
              tweenData.obj.position.copy(newPos);

              tweenData.obj.rotation.set(
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
              tweenData.obj.scale.copy(newScale);
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

    try {
      // 添加变量和函数定义
      const wrappedCode = `
        return async function(handlePolygen, polygen, handleSound, sound, THREE, task, tween, helper) {
          const meta = {};
          const index = "${meta.value?.id}";
          const Vector3 = THREE.Vector3;
          const event = {
            trigger: (index, eventId) => {
              console.log('触发事件:', index, eventId);
            }
          };
          const transform = (position, rotation, scale) => {
            return {
              position: position instanceof Vector3 ? position : new Vector3(),
              rotation: rotation instanceof Vector3 ? rotation : new Vector3(),
              scale: scale instanceof Vector3 ? scale : new Vector3(1, 1, 1)
            };
          };

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
        handleSound,
        sound,
        THREE,
        task,
        tween,
        helper
      );
    } catch (e: any) {
      console.error("执行代码出错:", e);
      ElMessage({
        message: `执行代码出错: ${e.message}`,
        type: "error",
      });
    }
  }
};
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
  overflow: hidden; /* 确保弹窗本身不滚动 */
}

.code-container2 {
  max-height: 80vh; /* 设置代码区域的最大高度 */
  overflow-y: auto; /* 允许垂直滚动 */
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
}

.dark-theme :deep(.hljs) {
  background-color: rgb(24, 24, 24) !important;
}

.light-theme :deep(.hljs) {
  background-color: #fafafa !important;
}
</style>
