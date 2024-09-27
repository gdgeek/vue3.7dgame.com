<template>
  <div class="verse-scene">
    <resource-dialog
      @selected="selectResources"
      @cancel="cancel"
      ref="dialog"
    ></resource-dialog>
    <el-container>
      <el-main>
        <iframe
          ref="editor"
          id="editor"
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
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { putMeta, getMeta } from "@/api/v1/meta";
import { useAppStore } from "@/store/modules/app";
import { translateRouteTitle } from "@/utils/i18n";

const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const src = ref(
  import.meta.env.VITE_APP_EDITOR_URL +
    "/three.js/editor/meta-editor.html?language=" +
    appStore.language
);

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

let init = false;
const dialog = ref();
const editor = ref<HTMLIFrameElement | null>();

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title?.slice(4) as string);

const { t } = useI18n();

const cancel = () => {
  // Cancel logic
};

const selectResources = (data: any) => {
  postMessage("load-resource", data);
};

const saveable = (data: any) => {
  if (data === null) {
    return false;
  }
  return data.editable;
};
const loadResource = (data: any) => {
  dialog.value.open(null, id.value, data.type);
};

const postMessage = (action: string, data: any = {}) => {
  console.error("postMessage:!", action);

  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "scene.meta.web",
        action: action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    ElMessage({
      message: t("meta.scene.error"),
      type: "error",
    });
  }
};

const handleMessage = async (e: MessageEvent) => {
  if (!e.data || !e.data.action) {
    return;
  }

  const action = e.data.action;
  const data = e.data.data;
  switch (action) {
    case "save":
      saveMeta(data);
      break;
    case "load-resource":
      loadResource(data);
      break;
    case "goto":
      if (data.target === "blockly.js") {
        const scriptRoute = router
          .getRoutes()
          .find((route) => route.path === "/meta/script");

        if (scriptRoute && scriptRoute.meta.title) {
          const metaTitle = translateRouteTitle(
            scriptRoute.meta.title
          ).toLowerCase();

          router.push({
            path: "/meta/script",
            query: {
              id: id.value,
              title: metaTitle + title.value,
            },
          });
        }
      } else if (data.data === "rete.js") {
        router.push({
          path: "/meta/rete-meta",
          query: { id: id.value, title: title.value },
        });
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
const refresh = async () => {
  const meta = await getMeta(id.value);
  postMessage("load", {
    data: meta.data,
    saveable: saveable(meta.data),
  });
};
const saveMeta = async ({ meta, events }: { meta: any; events: any }) => {
  if (!saveable) {
    ElMessage({
      type: "info",
      message: t("meta.scene.info"),
    });
    return;
  }
  await putMeta(id.value, { data: meta, events });
  ElMessage({
    type: "success",
    message: t("meta.scene.success"),
  });
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
