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
                <el-main style="margin: 0; padding: 0; height: 70vh">
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

    try {
      // 添加变量和函数定义
      const wrappedCode = `
        return async function(handlePolygen, polygen, handleSound, sound, THREE) {
          // 添加必要的变量定义
          const meta = {};
          const index = "${meta.value?.id}";
          const Vector3 = THREE.Vector3;
          const event = {
            trigger: (index, eventId) => {
              console.log('触发事件:', index, eventId);
            }
          };
          const transform = (position, rotation, scale) => {
            console.log('变换:', position, rotation, scale);
          };

          ${JavaScriptCode.value}
          
          // 如果存在初始化函数则执行
          if (typeof meta['@init'] === 'function') {
            await meta['@init']();
          }
        }
      `;

      const createFunction = new Function(wrappedCode);
      const executableFunction = createFunction();
      // 在执行函数时传入 THREE 对象
      await executableFunction(
        handlePolygen,
        polygen,
        handleSound,
        sound,
        THREE
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
</style>
