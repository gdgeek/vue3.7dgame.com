<template>
  <div class="verse-scene">
    <resource-dialog
      @selected="selectResources"
      @cancel="cancel()"
      ref="dialog"
    ></resource-dialog>
    <el-container>
      <el-main>
        <iframe
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
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { AbilityEditable } from "@/ability/ability";
import { useBreadcrumbStore } from "@/store/modules/breadcrumb";
import env from "@/environment";
import { putMeta, getMeta } from "@/api/v1/meta";
import path from "path-browserify";
import { useAbility } from "@/composables/ability";

const route = useRoute();
const router = useRouter();
const breadcrumbStore = useBreadcrumbStore();

const src = path.join("/static/three.js/editor", "meta-editor.html");

// console.log("src", src);
const isInit = ref(false);
const dialog = ref();

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title?.slice(4) as string);

const setBreadcrumbs = breadcrumbStore.setBreadcrumbs;

const cancel = () => {
  // Cancel logic
};

const selectResources = (data: any) => {
  console.error(data);
  postMessage({
    action: "load_resource",
    data,
  });
};

// const saveable = (data: any) => {
//   if (data === null) {
//     return false;
//   }
//   const { can } = useAbility();
//   return can("editable", AbilityEditable.name, {
//     editable: data.editable,
//   });
// };

const loadResource = (data: any) => {
  dialog.value.open(null, id.value, data.type);
};

const postMessage = (data: any) => {
  data.verify = "mrpp.com";
  const iframe = document.getElementById("editor") as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(data, "*");
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
            data: meta.data,
            // saveable: saveable(meta.data),
            saveable: true,
          });
        }
        break;
    }
  }
};

// const breadcrumb = (meta: any) => {
//   setBreadcrumbs([
//     {
//       path: "/",
//       meta: { title: "元宇宙实景编程平台" },
//     },
//     {
//       path: "/meta-verse/index",
//       meta: { title: "宇宙" },
//     },
//     {
//       path: `/verse/view?id=${meta.verse_id}`,
//       meta: { title: "【宇宙】" },
//     },
//     {
//       path: `/verse/scene?id=${meta.verse_id}`,
//       meta: { title: "宇宙编辑" },
//     },
//     {
//       path: `/meta/rete-meta?id=${meta.id}&title=${encodeURIComponent(title.value)}`,
//       meta: { title: "元编辑" },
//     },
//     {
//       path: ".",
//       meta: { title: "内容编辑" },
//     },
//   ]);
// };

const saveMeta = async ({ data, events }: { data: any; events: any }) => {
  // if (!saveable) {
  //   ElMessage({
  //     type: "info",
  //     message: "没有保存权限!",
  //   });
  //   return;
  // }
  await putMeta(id.value, { data, events });
  ElMessage({
    type: "success",
    message: "保存成功!",
  });
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  setBreadcrumbs([
    {
      path: "/",
      meta: { title: "元宇宙实景编程平台" },
    },
    {
      path: "/meta-verse/index",
      meta: { title: "宇宙" },
    },
    {
      path: ".",
      meta: { title: "场景编辑" },
    },
  ]);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  setBreadcrumbs([]);
});
</script>

<style lang="scss" scoped>
.content {
  height: calc(100vh - 140px);
  border-style: solid;
  border-width: 1px;
}
</style>
