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
          <el-container>
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

  await putMetaCode(meta.value.id, {
    blockly: JSON.stringify(message.data),
    lua: message.lua,
    js: message.js,
  });

  ElMessage({
    message: t("meta.script.success") || "Success",
    type: "success",
  });
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
      JavaScriptCode.value = params.data.js;
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
        }
      );

      // 用户选择保存，等待保存完成后再进行路由跳转
      try {
        await save();
        next();
      } catch (error) {
        ElMessage.error(t("meta.script.leave.error"));
        next(false);
      }
    } catch {
      // 用户选择不保存，继续路由跳转
      hasUnsavedChanges.value = false;
      ElMessage.info(t("meta.script.leave.info"));
      next();
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

  const data = meta.value.metaCode?.blockly
    ? JSON.parse(meta.value.metaCode?.blockly)
    : {};
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
  console.log("dataChildren", data.children);
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
