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
        {{ editorUrl }}
        <iframe
          id="editor"
          :src="src"
          class="content"
          height="100%"
          width="100%"
        ></iframe
        >111
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

const route = useRoute();
const router = useRouter();
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>();
const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();
const init = ref(false);
const saveable = ref();
const title = computed(() => route.query.title?.slice(2) as string);

const id = computed(() => parseInt(route.query.id as string));
const src =
  import.meta.env.VITE_APP_EDITOR_URL + "/three.js/editor/verse-editor.html";

const cancel = () => {};

const postMessage = (data: any) => {
  try {
    data.verify = "mrpp.com";
    console.log("data3", data);
    const safeData = JSON.parse(JSON.stringify(data));
    const iframe = document.getElementById("editor") as HTMLIFrameElement;
    iframe.contentWindow?.postMessage(safeData, "*");
  } catch (error) {
    console.error("Error in postMessage:", error);
  }
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
  prefabDialogRef.value?.open(id.value);
  ElMessage({
    type: "info",
    message: "添加预设",
  });
};

const addMeta = () => {
  metaDialogRef.value?.open(id.value);
  ElMessage({
    type: "info",
    message: "添加模块",
  });
};

const selected = async ({ data, setup, title }: any) => {
  try {
    console.log("data2", data, setup, title);
    const res = await postMessage({
      action: "add-module",
      data: { data, setup, title },
    });
    console.log("加载meta", res);
  } catch (error) {
    console.error("Error in selectedHandler:", error);
  }
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
          const scriptRoute = router
            .getRoutes()
            .find((route) => route.path === "/verse/script");
          if (scriptRoute && scriptRoute.meta.title) {
            const metaTitle = scriptRoute.meta.title as string;
            router.push({
              path: "/verse/script",
              query: {
                id: id.value,
                title: metaTitle + title.value,
              },
            });
          }
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
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style lang="scss" scoped>
.content {
  height: calc(100vh - 140px);
  border-style: solid;
  border-width: 1px;
}
</style>
