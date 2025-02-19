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
                            ><el-icon class="icon"
                              ><CopyDocument></CopyDocument></el-icon
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
                            ><el-icon class="icon"
                              ><CopyDocument></CopyDocument></el-icon
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

  // const cyber: cybersType | undefined = meta.value.cyber;
  console.log("postScript", message);
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
      console.log("PARAMS", params.data);
    } else if (params.action === "post:no-change") {
      ElMessage({
        message: t("meta.script.info") || "Info",
        type: "info",
      });
    } else if (params.action === "update") {
      LuaCode.value = "local meta = {}\nlocal index = ''\n" + params.data.lua;
      JavaScriptCode.value = params.data.js;
    }
  } catch (e: any) {
    console.log("ex:" + e);
    return;
  }
};

const save = () => {
  postMessage("save", { language: ["lua", "js"], data: {} });
};
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
    console.error(t("meta.script.error3") || "Error 3");
    ElMessage({
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
  return typeList.find((type) => data.type.toLowerCase() === type.toLowerCase())
    ? {
        uuid: data.parameters.uuid,
        name: data.parameters.name ?? null,
      }
    : undefined;
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
  //  console.log("data", data);
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
});
onMounted(async () => {
  window.addEventListener("message", handleMessage);
  loadHighlightStyle(isDark.value);
  try {
    loading.value = true;
    const response = await getMeta(id.value, "cyber,event,share,metaCode");

    meta.value = response.data;
    console.error("meta", meta.value);

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
