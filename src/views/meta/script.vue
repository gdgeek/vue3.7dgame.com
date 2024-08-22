<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div class="clearfix">
              <!-- <router-link
                v-if="meta"
                :to="
                  '/meta/rete-meta?id=' +
                  meta.id +
                  '&title=' +
                  encodeURIComponent(title)
                "
              >
                <el-link v-if="meta" :underline="false">
                  【元：{{ title }}】
                </el-link>
              </router-link> -->
              / 【script】

              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="save">
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  保存
                </el-button>
              </el-button-group>
            </div>
          </template>
          <el-container>
            <el-main style="margin: 0; padding: 0; height: 70vh">
              <iframe
                style="margin: 0; padding: 0; height: 100%; width: 100%"
                id="editor"
                src="https://blockly.4mr.cn/"
              ></iframe>
            </el-main>
          </el-container>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>
// meta cyber
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useBreadcrumbStore } from "@/store/modules/breadcrumb";
import { getMeta, metaInfo } from "@/api/v1/meta";
import { cybersType, postCyber, putCyber } from "@/api/v1/cyber";

import { ElMessage } from "element-plus";
let ready: boolean = false;
const postScript = async (message: any) => {
  if (meta.value === null) {
    ElMessage({
      message: "没有元信息",
      type: "error",
    });
    return;
  }
  if (!meta.value.editable) {
    ElMessage({
      message: "没有编辑权限",
      type: "error",
    });
    return;
  }

  const cyber: cybersType | undefined = meta.value.cyber;
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
    message: "保存成功",
    type: "success",
  });
};
const handleMessage = async (e: MessageEvent) => {
  console.error(e.data);
  const data: any = JSON.parse(e.data);

  if (data.type === "ready") {
    ready = true;
    initEditor();
  } else if (data.type === "post") {
    await postScript(data.message);
  } else if (data.type === "post:no-change") {
    ElMessage({
      message: "没有修改",
      type: "info",
    });
    //alert("no");
  }
};
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
//const cyber = ref<cybersType>();

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

const setBreadcrumbs = breadcrumbStore.setBreadcrumbs;

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => meta.value?.title as string);

const save = () => {
  postMessage({
    type: "save",
    message: { language: "lua", data: {} },
  });
};
const postMessage = (message: any) => {
  const iframe = document.getElementById("editor") as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(message, "*");
};
const initEditor = () => {
  if (meta.value === null) return;
  if (!ready) return;

  const data = meta.value.cyber ? JSON.parse(meta.value.cyber.data) : {};
  postMessage({
    type: "init",
    message: {
      language: ["lua", "js"],
      style: ["base", "meta"],
      data: data,
      parameters: {
        index: meta.value.id,
        resource: getResource(meta.value),
      },
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

  console.log("entity", entity);

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
  console.log("events", ret.events);
  addMetaData(data, ret);
  return ret;
};

onMounted(async () => {
  window.addEventListener("message", handleMessage);

  try {
    // setBreadcrumbs([
    //   { path: "/", meta: { title: "元宇宙实景编程平台" } },
    //   { path: "/meta-verse/index", meta: { title: "宇宙" } },
    //   { path: "", meta: { title: "赛博编辑" } },
    // ]);

    loading.value = true;
    const response = await getMeta(id.value, "cyber,event,share");

    meta.value = response.data;
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
