<template>
  <div class="verse-scene">
    <KnightDataDialog ref="knightDataRef"></KnightDataDialog>
    <MetaDialog
      @selected="selected"
      @cancel="cancel"
      ref="metaDialogRef"
    ></MetaDialog>
    <PrefabDialog
      @selected="selected"
      @cancel="cancel"
      ref="prefabDialogRef"
    ></PrefabDialog>
    <el-container>
      <el-main>
        <iframe
          id="editor"
          :src="editorUrl"
          class="content"
          height="100%"
          width="100%"
        ></iframe>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import PrefabDialog from "@/components/MrPP/PrefabDialog.vue";
import MetaDialog from "@/components/MrPP/MetaDialog.vue";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import { putVerse, getVerse } from "@/api/v1/verse";
import { getPrefab } from "@/api/v1/prefab";
import { getMeta } from "@/api/v1/meta";
import qs from "querystringify";
import path from "path-browserify";

const route = useRoute();
const router = useRouter();
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>(null);
const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();
const init = ref(false);
const saveable = ref(null);

const id = computed(() => parseInt(route.query.id as string));
const editorUrl = computed(() =>
  path.join(
    "/static/three.js/editor",
    "verse-editor.html" + qs.stringify({ id: id.value }, true)
  )
);

const cancel = () => {};

const postMessage = (data: any) => {
  data.verify = "mrpp.com";
  console.log("data3", data);
  const iframe = document.getElementById("editor") as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(data, "*");
};

const setupPrefab = async ({ meta_id, data, uuid }: any) => {
  const response = await getPrefab(meta_id);
  knightDataRef.value?.open({
    schema: JSON.parse(response.data.data!),
    data: JSON.parse(data),
    callback: (setup: any) => {
      postMessage({
        action: "setup-module",
        data: { uuid, setup },
      });
    },
  });
};

const addPrefab = () => {
  prefabDialogRef.value?.open();
  ElMessage({
    type: "info",
    message: "添加预设",
  });
};

const addMeta = () => {
  metaDialogRef.value?.open();
  ElMessage({
    type: "info",
    message: "添加模块",
  });
};

const selected = async ({ data, setup, title }: any) => {
  console.log("data2", data, setup, title);
  const res = postMessage({
    action: "add-module",
    data: { data, setup, title },
  });
  console.log("res", res);
};

const saveVerse = async (verse: any) => {
  if (!saveable.value) {
    ElMessage({
      type: "info",
      message: "没有保存权限!",
    });
    return;
  }
  await putVerse(id.value, { data: verse });
  ElMessage({
    type: "success",
    message: "场景保存成功!!!",
  });
};

const handleMessage = async (e: MessageEvent) => {
  if (e.data.from === "mrpp-editor") {
    switch (e.data.action) {
      case "edit-meta":
        router.push({
          path: "/meta/scene",
          query: { id: e.data.data.meta_id },
        });
        break;
      case "setup-prefab":
        setupPrefab(e.data.data);
        break;
      case "add-meta":
        addMeta();
        break;
      case "add-prefab":
        addPrefab();
        break;
      case "save-verse":
        saveVerse(e.data.data);
        break;
      case "goto":
        if (e.data.data === "blockly.js") {
          router.push({
            path: "/verse/script",
            query: { id: id.value, title: "" },
          });
        }
        break;
      case "ready":
        if (!init.value) {
          init.value = true;
          const response = await getVerse(id.value, "metas, resources");
          const verse = response.data;
          saveable.value = verse ? verse.editable : false;
          postMessage({
            action: "load",
            id: id.value,
            data: verse,
            saveable: saveable.value,
          });
        }
        break;
    }
  }
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  // setBreadcrumbs({
  //   list: [
  //     { path: "/", meta: { title: "元宇宙实景编程平台" } },
  //     { path: "/meta-verse/index", meta: { title: "宇宙" } },
  //     { path: `/verse/view?id=${id.value}`, meta: { title: "【宇宙】" } },
  //     { path: `/verse/scene?id=${id.value}`, meta: { title: "宇宙编辑" } },
  //     { path: ".", meta: { title: "场景编辑" } },
  //   ],
  // });
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  // setBreadcrumbs({ list: [] });
});
</script>

<style lang="scss" scoped>
.content {
  height: calc(100vh - 140px);
  border-style: solid;
  border-width: 1px;
}
</style>
