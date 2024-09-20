<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card :loading="loading" class="box-card">
          <template #header>
            <div v-if="verse" class="clearfix">
              {{ verse.name }} / 【{{ $t("verse.view.script.title") }}】

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
                    <pre>
                        <code class="lua">{{ LuaCode }}</code>
                      </pre>
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
// import BlocklyScript from "@/components/Script.vue";
import {
  getVerseScript,
  postVerseScript,
  putVerseScript,
} from "@/api/v1/verse-script";
import {
  getVerse,
  putVerseCode,
  postVerse,
  Script,
  VerseData,
} from "@/api/v1/verse";
import { useAppStore } from "@/store/modules/app";
import type { TabsPaneContext } from "element-plus";

const appStore = useAppStore();
const { t } = useI18n();

const loading = ref(false);
//const script = ref<Script>();
const verse = ref<VerseData>();
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const activeName = ref<string>("blockly");
const codeName = ref<string>("lua");
const LuaCode = ref("");
const src = ref(
  import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + appStore.language
);
let ready: boolean = false;
const saveable = computed(() => {
  return verse.value!.editable;
});
let map = new Map<string, any>();

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
  //script.value = verse.value?.script;
  await putVerseCode(verse.value!.id, {
    blockly: JSON.stringify(message.data),
    lua: message.script,
  });
  /*if (!script.value) {
    const response = await postVerseScript({
      verse_id: verse.value!.id,
      workspace: JSON.stringify(message.data),
      script: message.script,
    });
    verse.value!.script = response.data;
  } else {
    const response = await putVerseScript(script.value.id, {
      workspace: JSON.stringify(message.data),
      script: message.script,
    });
    verse.value!.script = response.data;
  }*/

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
      // resource: getResource(meta.value),
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

/*
const handleClick = async (tab: TabsPaneContext, event: Event) => {
  if (activeName.value === "script") {
    LuaCode.value = script.value?.script
      ? "local meta = {}\nlocal index = ''\n" + script.value?.script
      : "local meta = {}\nlocal index = ''\n";
    await nextTick();
  }
  console.log("luaCode", LuaCode.value);
  console.log(tab, event);
};*/
//https://appleid.apple.com/auth/authorize?client_id=com.mrpp.www&redirect_uri=https%3A%2F%2Ftest.mrpp.com%3A8888%2Fhome%2Findex&response_type=code%20id_token&state=1726813929167&scope=name%20email&response_mode=web_message&frame_id=f8abd4d8-d83f-4f15-a65b-fe7e52404f84&m=12&v=1.5.5
onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
onMounted(async () => {
  window.addEventListener("message", handleMessage);

  try {
    loading.value = true;
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    verse.value = response.data;
    //script.value = verse.value?.script;
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
</style>
