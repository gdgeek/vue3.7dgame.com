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
              /【{{ $t("verse.view.script.title") }}】

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

          <el-container>
            <el-tabs v-model="activeName" type="card" style="width: 100%">
              <el-tab-pane :label="$t('verse.view.script.edit')" name="blockly">
                <el-main style="margin: 0; padding: 0; height: 70vh">
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
                            ><el-icon class="icon"
                              ><CopyDocument></CopyDocument></el-icon
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
                            @click="copyCode(LuaCode)"
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
import { getVerse, putVerseCode, VerseData } from "@/api/v1/verse";
import { useAppStore } from "@/store/modules/app";
import { TabsPaneContext } from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";

const appStore = useAppStore();
const { t } = useI18n();
const loading = ref(false);
const verse = ref<VerseData>();
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const activeName = ref<string>("blockly");
const languageName = ref<string>("lua");
const LuaCode = ref("");
const JavaScriptCode = ref("");

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
      message: t("copy.success"),
      type: "success",
    });
  } catch (error) {
    ElMessage({
      message: t("copy.error"),
      type: "error",
    });
  }
};

watch(
  () => appStore.language, // 监听 language 的变化
  (newValue, oldValue) => {
    src.value = import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + newValue;
    initEditor();
  }
);

const postScript = async (message: any) => {
  if (verse.value === null) {
    ElMessage({
      message: t("verse.view.script.error1"),
      type: "error",
    });
    return;
  }
  if (!verse.value!.editable) {
    ElMessage({
      message: t("verse.view.script.error2"),
      type: "error",
    });
    return;
  }

  await putVerseCode(verse.value!.id, {
    blockly: JSON.stringify(message.data),
    js: JSON.parse(message.script).javascript,
    lua: JSON.parse(message.script).lua,
  });

  ElMessage({
    message: t("verse.view.script.success"),
    type: "success",
  });
};

const handleMessage = async (e: MessageEvent) => {
  if (!e.data.action) {
    return;
  }
  const params: any = e.data;

  if (params.action === "ready") {
    ready = true;
    initEditor();
  } else if (params.action === "post") {
    await postScript(params.data);
    LuaCode.value =
      "local verse = {}\nlocal is_playing = ''\n" +
      JSON.parse(params.data.script).lua;
    JavaScriptCode.value =
      "const verse = {}\nconst is_playing = ''\n" +
      JSON.parse(params.data.script).javascript;
  } else if (params.action === "post:no-change") {
    ElMessage({
      message: t("verse.view.script.info"),
      type: "info",
    });
  }
};

const save = () => {
  postMessage("save", { language: "lua", data: {} });
};

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
    console.error(t("verse.view.script.error3"));
    ElMessage({
      type: "error",
    });
  }
};

const initEditor = () => {
  if (!verse.value) return;
  if (!ready) return;
  const data = verse.value.verseCode?.blockly
    ? JSON.parse(verse.value.verseCode.blockly)
    : {};
  postMessage("init", {
    language: ["lua", "js"],
    style: ["base", "verse"],
    data: data,
    parameters: {
      index: verse.value!.id,
      resource: resource.value,
    },
  });
};

const resource = computed(() => {
  const inputs: any[] = [];
  const outputs: any[] = [];

  verse.value!.metas!.forEach((meta: any) => {
    let events = JSON.parse(meta.events || "{}");
    events.inputs = events.inputs || [];
    events.outputs = events.outputs || [];

    events.inputs.forEach((input: any) => {
      const data = map.get(meta.id.toString());
      inputs.push({
        title: `${data.title}:${input.title}`,
        index: data.uuid,
        uuid: input.uuid,
      });
    });

    events.outputs.forEach((output: any) => {
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

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
onMounted(async () => {
  window.addEventListener("message", handleMessage);
  loadHighlightStyle(isDark.value);

  try {
    loading.value = true;
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    verse.value = response.data;
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
