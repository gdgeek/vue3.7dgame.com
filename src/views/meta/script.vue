<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div v-if="meta" class="clearfix">
              {{ meta.title }} / 【{{ $t("meta.script.title") }}】
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
          <!-- <el-container>
            <el-main style="margin: 0; padding: 0; height: 70vh">
              <iframe
                style="margin: 0; padding: 0; height: 100%; width: 100%"
                id="editor"
                ref="editor"
                :src="src"
              ></iframe>
            </el-main>
          </el-container> -->
          <el-container>
            <el-tabs
              v-model="activeName"
              type="card"
              style="width: 100%"
              @tab-click="handleClick"
            >
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
                              style="width: 30px; margin-right: 5px"
                              alt=""
                            />
                            <span>Lua</span>
                          </span>
                        </template>
                        <pre>
                <code class="lua">{{ LuaCode }}</code>
              </pre>
                      </el-tab-pane>
                      <el-tab-pane label="JavaScript" name="javascript">
                        <template #label>
                          <span style="display: flex; align-items: center">
                            <img
                              src="/javascript.png"
                              style="width: 30px; margin-right: 5px"
                              alt=""
                            />
                            <span>JavaScript</span>
                          </span>
                        </template>
                        <pre>
                <code class="lua">{{ JavaScriptCode }}</code>
              </pre>
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
import { ElMessage, TabsPaneContext } from "element-plus";
import { useAppStore } from "@/store/modules/app";

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

const postScript = async (message: any) => {
  if (meta.value === null) {
    ElMessage({
      message: t("meta.script.error1"),
      type: "error",
    });
    return;
  }
  if (!meta.value.editable) {
    ElMessage({
      message: t("meta.script.error2"),
      type: "error",
    });
    return;
  }

  const cyber: cybersType | undefined = meta.value.cyber;
  console.error("code", {
    blockly: JSON.stringify(message.data),
    lua: message.script,
  });
  await putMetaCode(meta.value.id, {
    blockly: JSON.stringify(message.data),
    js: JSON.parse(message.script).javascript,
    lua: JSON.parse(message.script).lua,
  });
  if (!cyber) {
    const response = await postCyber({
      meta_id: meta.value.id,
      data: JSON.stringify(message.data),
      script: message.script,
    });

    meta.value.cyber = response.data;
  } else {
    const response = await putCyber(cyber.id, {
      data: JSON.stringify(message.data),
      script: message.script,
    });
    meta.value.cyber = response.data;
  }

  ElMessage({
    message: t("meta.script.success"),
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
      LuaCode.value =
        "local meta = {}\nlocal index = ''\n" +
        JSON.parse(params.data.script).lua;
      JavaScriptCode.value =
        "const meta = {}\nconst index = ''\n" +
        JSON.parse(params.data.script).javascript;
    } else if (params.action === "post:no-change") {
      ElMessage({
        message: t("meta.script.info"),
        type: "info",
      });
    }
  } catch (e: any) {
    console.log("ex:" + e);
    return;
  }
};

watch(
  () => appStore.language, // 监听 language 的变化
  (newValue, oldValue) => {
    src.value = import.meta.env.VITE_APP_BLOCKLY_URL + "?language=" + newValue;
    initEditor();
  }
);

const save = () => {
  postMessage("save");
  return;
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
    console.error(t("meta.script.error3"));
    ElMessage({
      type: "error",
    });
  }
};
const initEditor = () => {
  if (!meta.value) return;
  if (!ready) return;
  const data = meta.value.metaCode?.blockly
    ? JSON.parse(meta.value.metaCode?.blockly)
    : {};
  //const data = meta.value.cyber?.data ? JSON.parse(meta.value.cyber.data) : {};
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
  if (data && data.parameters && typeof data.parameters !== "undefined") {
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
  console.log("action", action);
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

const handleClick = async (tab: TabsPaneContext, event: Event) => {
  if (activeName.value === "script") {
    LuaCode.value = LuaCode.value
      ? LuaCode.value
      : "local meta = {}\nlocal index = ''\n";
    JavaScriptCode.value = JavaScriptCode.value
      ? JavaScriptCode.value
      : "const meta = {}\nconst index = ''\n";
    await nextTick();
  }
  console.log("luaCode", LuaCode.value);
  console.log(tab, event);
};

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
onMounted(async () => {
  window.addEventListener("message", handleMessage);

  loading.value = true;
  const response = await getMeta(id.value, "cyber,event,share,metaCode");
  meta.value = response.data;
  console.log("meta", meta.value);
  console.log("CYBER", meta.value!.cyber!.script);
  initEditor();

  loading.value = false;
});
</script>

<style scoped>
.icon {
  margin-right: 5px;
}
</style>
