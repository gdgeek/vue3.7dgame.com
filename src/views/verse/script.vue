<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card :loading="loading" class="box-card">
          <template #header>
            <div v-if="verse" class="clearfix">
              <el-link :href="`/verse/view?id=${id}`" :underline="false">{{
                verse.name
              }}</el-link>
              /【{{ $t("verse.view.script.title") || "Script Title" }}】
              <el-button type="primary" size="small" @click="run"
                >测试运行</el-button
              >
              <el-button
                v-if="disabled"
                type="primary"
                size="small"
                @click="disabled = false"
              >
                返回
              </el-button>
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
                  {{ $t("verse.view.script.save") || "Save" }}
                </el-button>
              </el-button-group>
            </div>
          </template>

          <el-container v-if="!disabled">
            <el-tabs v-model="activeName" type="card" style="width: 100%">
              <el-tab-pane
                :label="$t('verse.view.script.edit') || 'Edit'"
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
                          style="margin-right: 10px"
                          @click="showFullscreenCode('javascript')"
                        >
                          JavaScript
                        </el-button>
                        <el-button
                          size="small"
                          type="primary"
                          style="margin-right: 50px"
                          @click="run"
                        >
                          测试运行
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
              <el-tab-pane
                :label="$t('verse.view.script.code') || 'Code'"
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
              ref="scenePlayer"
              :verse="verse"
              :is-scene-fullscreen="isSceneFullscreen"
            ></ScenePlayer>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { getVerse, putVerseCode, VerseData } from "@/api/v1/verse";
import { useAppStore } from "@/store/modules/app";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useI18n } from "vue-i18n";
import { ElMessageBox, ElMessage } from "element-plus";
import pako from "pako";
import jsBeautify from "js-beautify";
import ScenePlayer from "./ScenePlayer.vue";
import * as THREE from "three";

const appStore = useAppStore();
const { t } = useI18n();
const loading = ref(false);
const verse = ref<VerseData>();
const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));
const activeName = ref<string>("blockly");
const languageName = ref<string>("lua");
const LuaCode = ref("");
const JavaScriptCode = ref("");
const disabled = ref<boolean>(false);
const scenePlayer = ref<InstanceType<typeof ScenePlayer>>();
const isSceneFullscreen = ref(false);
const isFullscreen = ref(false);
const showCodeDialog = ref(false);
const currentCode = ref("");
const currentCodeType = ref("");
const codeDialogTitle = ref("");
const unsavedBlocklyData = ref<any>(null);

const handleBlocklyChange = (data: any) => {
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

const src = ref(
  import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + appStore.language
);
let ready: boolean = false;
const saveable = computed(() => {
  return verse.value!.editable;
});
let map = new Map<string, any>();

const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

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

const postScript = async (message: any) => {
  if (verse.value === null) {
    ElMessage({
      message: t("verse.view.script.error1") || "Error 1",
      type: "error",
    });
    return;
  }
  if (!verse.value!.editable) {
    ElMessage({
      message: t("verse.view.script.error2") || "Error 2",
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

  await putVerseCode(verse.value!.id, {
    blockly: blocklyData,
    js: message.js,
    lua: message.lua,
  });

  ElMessage({
    message: t("verse.view.script.success") || "Success",
    type: "success",
  });
};

// 格式化JavaScript代码
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
      console.log(params.data);
      await postScript(params.data);

      if (saveResolve) {
        saveResolve();
        saveResolve = null;
      }
    } else if (params.action === "post:no-change") {
      ElMessage({
        message: t("verse.view.script.info") || "Info",
        type: "info",
      });
    } else if (params.action === "update") {
      LuaCode.value = "local verse = {}\nlocal index = ''\n" + params.data.lua;
      JavaScriptCode.value = formatJavaScript(params.data.js); // 使用格式化函数
      initLuaCode.set(LuaCode.value);
      handleBlocklyChange(params.data.blocklyData);
    }
  } catch (error) {
    console.error(e);
  }
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
        t("verse.view.script.leave.message1"),
        t("verse.view.script.leave.message2"),
        {
          confirmButtonText: t("verse.view.script.leave.confirm"),
          cancelButtonText: t("verse.view.script.leave.cancel"),
          type: "warning",
          showClose: true,
          closeOnClickModal: false,
          distinguishCancelAndClose: true,
        }
      );

      // 用户点击确认,保存并跳转
      try {
        await save();
        next();
      } catch (error) {
        ElMessage.error(t("verse.view.script.leave.error"));
        next(false);
      }
    } catch (action) {
      if (action === "cancel") {
        hasUnsavedChanges.value = false;
        ElMessage.info(t("verse.view.script.leave.info"));
        next();
      } else {
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

const editor = ref<HTMLIFrameElement | null>(null);
const postMessage = (action: string, data: any = {}) => {
  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "script.verse.web",
        action: action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    ElMessage({
      message: t("verse.view.script.error3") || "Error 3",
      type: "error",
    });
  }
};

const initEditor = () => {
  if (!verse.value) return;
  if (!ready) return;

  try {
    let blocklyData = verse.value.verseCode?.blockly || "{}";
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
    const data = unsavedBlocklyData.value || JSON.parse(blocklyData);

    postMessage("init", {
      language: ["lua", "js"],
      style: ["base", "verse"],
      data: data,
      parameters: {
        index: verse.value!.id,
        resource: resource.value,
      },
    });
  } catch (error) {
    console.error("Fail to decompress or parse data:", error);
  }
};

const resource = computed(() => {
  const inputs: any[] = [];
  const outputs: any[] = [];

  verse.value!.metas!.forEach((meta: any) => {
    let events = JSON.parse(meta.events || "{}");
    events.inputs = events.inputs || [];
    events.outputs = events.outputs || [];

    events.outputs.forEach((input: any) => {
      const data = map.get(meta.id.toString());
      inputs.push({
        title: `${data.title}:${input.title}`,
        index: data.uuid,
        uuid: input.uuid,
      });
    });

    events.inputs.forEach((output: any) => {
      const data = map.get(meta.id.toString());
      outputs.push({
        title: `${data.title}:${output.title}`,
        index: data.uuid,
        uuid: output.uuid,
      });
    });
  });

  return {
    events: { inputs, outputs },
  };
});

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("beforeunload", handleBeforeUnload);
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
  window.addEventListener("message", handleMessage);
  loadHighlightStyle(isDark.value);

  window.addEventListener("beforeunload", handleBeforeUnload);

  try {
    loading.value = true;
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    verse.value = response.data;
    console.log("Verse", verse.value);
    if (verse.value && verse.value.data) {
      const json: string = verse.value.data;
      const data = JSON.parse(json);
      data.children.modules.forEach((module: any) => {
        map.set(module.parameters.meta_id.toString(), {
          uuid: module.parameters.uuid,
          title: module.parameters.title,
        });
      });
    }
    initEditor();
  } catch (error: any) {
    ElMessage({
      message: error.message,
      type: "error",
    });
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

const run = async () => {
  // 保存当前的全屏状态
  const wasFullscreen = isFullscreen.value;

  // 如果当前是全屏状态，先退出编辑器的全屏
  if (wasFullscreen) {
    document.exitFullscreen();
    await new Promise((resolve) => setTimeout(resolve, 100)); // 确保退出全屏后再进入全屏
  }

  disabled.value = true;

  await nextTick();

  // 如果之前是全屏状态，则将运行区域设置为全屏
  if (wasFullscreen) {
    const runArea = document.querySelector(".runArea");
    if (runArea) {
      runArea.requestFullscreen();
      isSceneFullscreen.value = true;
    }
  }

  // 添加延迟等待所有模型加载完成
  const waitForModels = () => {
    return new Promise((resolve) => {
      const checkModels = () => {
        const metasData = verse.value!.metas!;
        let expectedModels = 0;
        for (const meta of metasData) {
          const metaData = JSON.parse(meta.data!);
          expectedModels += metaData.children.entities.length;
        }

        if (scenePlayer.value?.sources.size === expectedModels) {
          console.error("所有资源加载完成:", {
            expected: expectedModels,
            loaded: scenePlayer.value!.sources.size,
            sources: scenePlayer.value!.sources,
          });
          resolve(true);
        } else {
          console.log("等待资源加载...", {
            expected: expectedModels,
            current: scenePlayer.value?.sources.size || 0,
            sources: scenePlayer.value?.sources,
          });
          setTimeout(checkModels, 100);
        }
      };
      checkModels();
    });
  };

  await waitForModels();

  if (JavaScriptCode.value) {
    window.verse = {};
    const Vector3 = THREE.Vector3;
    const sound = {
      play: async (audio: HTMLAudioElement | undefined) => {
        if (!audio) {
          console.error("音频资源无效");
          return;
        }
        await scenePlayer.value?.playQueuedAudio(audio);
      },

      createTask: (audio: HTMLAudioElement | undefined) => {
        if (!audio) {
          console.error("音频资源无效");
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
        taskObj.execute();
        return taskObj;
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
        obj: any,
        transformData: any,
        duration: number,
        easing: string
      ) => {
        if (!obj) {
          console.error("目标对象无效");
          return null;
        }

        const startPos = obj.mesh.position.clone();
        const endPos = transformData.position;

        return {
          type: "data",
          obj,
          startPos,
          endPos,
          startRotation: obj.mesh.rotation.clone(),
          endRotation: transformData.rotation,
          startScale: obj.mesh.scale.clone(),
          endScale: transformData.scale,
          duration,
          easing,
        };
      },
    };

    // 任务执行器
    const task = {
      circle: async (count: number, taskToRepeat: any) => {
        console.log("Executing circle task:", { count, taskToRepeat });

        if (typeof count !== "number" || count < 0) {
          console.warn("循环次数必须是正数:", count);
          return;
        }

        let resolvedTask = taskToRepeat;
        if (taskToRepeat instanceof Promise) {
          resolvedTask = await taskToRepeat;
        }

        for (let i = 0; i < count; i++) {
          console.log(`执行第 ${i + 1}/${count} 次任务`);

          try {
            if (resolvedTask) {
              if (typeof resolvedTask === "function") {
                await resolvedTask();
              } else if (typeof resolvedTask.execute === "function") {
                await resolvedTask.execute();
              } else if (resolvedTask.type === "audio") {
                await sound.play(resolvedTask.data);
              } else if (resolvedTask.type === "animation") {
                await resolvedTask.execute();
              } else {
                console.warn(`无法执行的任务类型:`, resolvedTask);
                return;
              }
            }

            if (i < count - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(`第 ${i + 1} 次任务执行失败:`, error);
          }
        }
      },

      array: (type: string, items: any[]) => {
        console.log("Creating array:", { type, items });

        const processArrayItems = (items: any[]): any[] => {
          return items.map((item) => {
            // 如果是数组，递归处理
            if (Array.isArray(item)) {
              return processArrayItems(item);
            }
            if (item && typeof item === "object" && item.type) {
              return item;
            }
            if (item && typeof item === "object" && item.url) {
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
          console.warn(`未知的数组类型: ${type}，默认使用 LIST 类型`);
          result = processArrayItems(items);
        }

        console.log("Processed array result:", result);
        return result;
      },

      execute: async (tweenData: any) => {
        if (!tweenData) return;

        if (typeof tweenData === "function") {
          await tweenData();
          return;
        }
        if (tweenData instanceof Promise) {
          return await tweenData;
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

            const easing = (
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
      createTask: (polygenInstance: any, animationName: string) => {
        if (!polygenInstance) {
          console.error("polygen实例为空");
          return null;
        }
        if (typeof polygenInstance.playAnimation !== "function") {
          console.error("polygen实例缺少playAnimation方法");
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

      playTask: (polygenInstance: any, animationName: string) => {
        const taskObj = animation.createTask(polygenInstance, animationName);
        if (!taskObj) return null;

        // 立即执行
        taskObj.execute();
        return taskObj;
      },
    };

    const event = {
      signal: (moduleUuid: string, eventUuid: string, parameter?: any) => {
        console.log("触发事件:", moduleUuid, eventUuid, parameter);
      },
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
      point: (position: any) => {
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
            return async function(sound, THREE, task, tween, helper, animation, event, argument, Vector3) {
              const verse = window.verse;
              const index = ${verse.value?.id};
              
              ${JavaScriptCode.value}
              if (typeof verse['#init'] === 'function') {
                await verse['#init']();
              }
            }`;
      const wrappedFunction = new Function(wrappedCode);
      const executableFunction = wrappedFunction();

      await executableFunction(
        sound,
        THREE,
        task,
        tween,
        helper,
        animation,
        event,
        argument,
        Vector3
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
