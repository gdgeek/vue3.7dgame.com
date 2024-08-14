<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div class="clearfix">
              <router-link
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
              </router-link>
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
            <el-main>
              <iframe
                id="editor"
                :src="
                  'https://blockly.4mr.cn/?id=' +
                  Math.floor(Math.random() * (1000000 + 1))
                "
                class="content"
                height="400px"
                width="100%"
              ></iframe>
            </el-main>
          </el-container>
          <Coding
            v-if="meta !== null"
            :meta="meta"
            ref="blocklyRef"
            :cyber="cyber!"
            :id="id"
            :index="meta!.uuid"
          ></Coding>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>
// meta cyber
<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useBreadcrumbStore } from "@/store/modules/breadcrumb";
import { getMeta, metaInfo } from "@/api/v1/meta";
import { cybersType, postCyber } from "@/api/v1/cyber";
import Coding from "@/components/Coding.vue";
import { AbilityEditable } from "@/ability/ability";
import { useAbility } from "@/composables/ability";
import { ElMessage } from "element-plus";
let ready: boolean = false;
const handleMessage = async (e: MessageEvent) => {
  /*
   origin: string;
   readonly ports: ReadonlyArray<MessagePort>;
    readonly source
  */
  console.error(e.data);
  const data: any = JSON.parse(e.data);

  if (data.type === "ready") {
    ready = true;
    initEditor();
  }
};
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const cyber = ref<cybersType>();

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

const setBreadcrumbs = breadcrumbStore.setBreadcrumbs;

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => meta.value?.title as string);
const blocklyRef = ref<InstanceType<typeof Coding> | null>(null);
// const saveable = computed(() => {
//   if (meta.value === null) return false;
//   const { can } = useAbility();
//   return can("editable", new AbilityEditable(meta.value!.editable));
// });

const save = () => {
  if (blocklyRef.value) {
    blocklyRef.value.save();
  } else {
    ElMessage({
      message: "blocklyRef 为空，无法保存",
      type: "error",
    });
  }
};
const initEditor = () => {
  if (meta.value === null) return;
  if (!ready) return;
  const iframe = document.getElementById("editor") as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(JSON.stringify(meta.value), "*");
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
    //const iframe = document.getElementById("editor") as HTMLIFrameElement;

    // iframe.contentWindow?.postMessage(JSON.stringify(meta.value), "*");

    console.error(meta.value);
    console.log("meta.value", meta.value);

    if (meta.value.cyber === null) {
      if (meta.value.editable) {
        const cyberResponse = await postCyber({
          meta_id: meta.value.id,
        });

        cyber.value = cyberResponse.data;
      }
    } else {
      cyber.value = meta.value.cyber;
    }
    //alert(cyber.value.id);
  } catch (error: any) {
    ElMessage({
      message: error.message,
      type: "error",
    });
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (blocklyRef.value) {
    blocklyRef.value.save();
  }
});
</script>

<style scoped>
.icon {
  margin-right: 5px;
}
</style>
