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
import env from "@/environment";
import { putMeta, getMeta } from "@/api/v1/meta";
import path from "path-browserify";

const route = useRoute();
const router = useRouter();
const editUrl = import.meta.env.VITE_APP_EDITOR_URL;
const src = editUrl + "/three.js/editor/meta-editor.html"; //path.join("", "");

// console.log("src", src);
const isInit = ref(false);
const dialog = ref();
const editor = ref<HTMLIFrameElement | null>();

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title?.slice(4) as string);

const cancel = () => {
  // Cancel logic
};
type Message = {
  action: string;
  json: string;
};
const selectResources = (data: any) => {
  console.error("data");
  console.error(data);
  postMessage({
    action: "load_resource",
    json: JSON.stringify(data),
  });
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

const postMessage = (message: Message) => {
  console.error("postMessage", message);

  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(message, "*");
  } else {
    ElMessage({
      message: "没有编辑器",
      type: "error",
    });
  }
};

const handleMessage = async (e: MessageEvent) => {
  const data = e.data;
  if (data.from === "mrpp-editor") {
    switch (data.action) {
      case "save":
        saveMeta(data);
        break;
      case "load_resource":
        loadResource(data.data);
        break;
      case "goto":
        if (data.data === "blockly.js") {
          const scriptRoute = router
            .getRoutes()
            .find((route) => route.path === "/meta/script");
          if (scriptRoute && scriptRoute.meta.title) {
            const metaTitle = scriptRoute.meta.title as string;
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
        if (!isInit.value) {
          isInit.value = true;
          const meta = await getMeta(id.value);
          // breadcrumb(meta.data);
          postMessage({
            action: "load",
            json: JSON.stringify({
              data: meta.data,
              saveable: saveable(meta.data),
            }),
          });
        }
        break;
    }
  }
};

const saveMeta = async ({ data, events }: { data: any; events: any }) => {
  if (!saveable) {
    ElMessage({
      type: "info",
      message: "没有保存权限!",
    });
    return;
  }
  await putMeta(id.value, { data, events });
  ElMessage({
    type: "success",
    message: "场景保存成功!",
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
