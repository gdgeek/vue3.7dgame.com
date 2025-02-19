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
          ref="editor"
          :src="src"
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
import { putVerse, getVerse, VerseData } from "@/api/v1/verse";
import { getPrefab } from "@/api/v1/prefab";
import { useAppStore } from "@/store/modules/app";
import { translateRouteTitle } from "@/utils/i18n";

const appStore = useAppStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>();
const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();
let init = false;
const saveable = ref();

const title = computed(() => {
  const match = (route.query.title as string)?.match(/【(.*?)】/);
  return match ? match[0] : "";
});

const id = computed(() => parseInt(route.query.id as string));
const src = ref(
  import.meta.env.VITE_APP_EDITOR_URL +
    "/three.js/editor/verse-editor.html?language=" +
    appStore.language
);
const editor = ref<HTMLIFrameElement>();
const cancel = () => {};

watch(
  () => appStore.language, // 监听 language 的变化
  async (newValue, oldValue) => {
    src.value =
      import.meta.env.VITE_APP_EDITOR_URL +
      "/three.js/editor/verse-editor.html?language=" +
      newValue;
    await refresh();
  }
);
const refresh = async () => {
  const response = await getVerse(id.value, "metas, resources");
  const verse = response.data;
  saveable.value = verse ? verse.editable : false;
  postMessage("load", {
    id: id.value,
    data: verse,
    saveable: saveable.value,
  });
};
const postMessage = (action: string, data: any) => {
  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "scene.verse.web",
        action: action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    ElMessage({
      message: t("verse.view.sceneEditor.error1"),
      type: "error",
    });
  }
};

const setupPrefab = async ({ meta_id, data, uuid }: any) => {
  const response = await getPrefab(meta_id);
  knightDataRef.value?.open({
    schema: JSON.parse(response.data.data!),
    data: JSON.parse(data),
    callback: (setup: any) => {
      postMessage("setup-module", { uuid, setup });
    },
  });
};

const addPrefab = () => {
  prefabDialogRef.value?.open(id.value);
  ElMessage({
    type: "info",
    message: t("verse.view.sceneEditor.info1"),
  });
};

const addMeta = () => {
  metaDialogRef.value?.open(id.value);
  ElMessage({
    type: "info",
    message: t("verse.view.sceneEditor.info2"),
  });
};

const selected = async ({ data, setup, title }: any) => {
  postMessage("add-module", { data, setup, title });
};

const saveVerse = async (data: any) => {
  console.error("save verse", data);
  if (!data.verse) {
    return;
  }
  const verse: VerseData = data.verse;
  if (!saveable.value) {
    ElMessage({
      type: "info",
      message: t("verse.view.sceneEditor.info3"),
    });
    return;
  }
  await putVerse(id.value, { data: JSON.stringify(verse) });
  ElMessage({
    type: "success",
    message: t("verse.view.sceneEditor.success"),
  });
};

const handleMessage = async (e: MessageEvent) => {
  if (!e.data || !e.data.action) {
    return;
  }
  const action = e.data.action;
  const data = e.data.data; // ? JSON.parse(params.json) : undefined;

  switch (action) {
    case "edit-meta":
      router.push({
        path: "/meta/scene",
        query: { id: data.meta_id },
      });
      break;
    case "setup-prefab":
      setupPrefab(data);
      break;
    case "add-meta":
      addMeta();
      break;
    case "add-prefab":
      addPrefab();
      break;
    case "save-verse":
      saveVerse(data);
      break;
    case "goto":
      if (data.target === "blockly.js") {
        const scriptRoute = router
          .getRoutes()
          .find((route) => route.path === "/verse/script");
        if (scriptRoute && scriptRoute.meta.title) {
          const metaTitle = translateRouteTitle(
            scriptRoute.meta.title
          ).toLowerCase();
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
      if (!init) {
        init = true;
        refresh();
      }
      break;
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
