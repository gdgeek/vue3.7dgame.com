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
                <el-button
                  v-if="(saveable = true)"
                  type="primary"
                  size="small"
                  @click="save"
                >
                  <font-awesome-icon icon="save"></font-awesome-icon>
                  保存
                </el-button>
              </el-button-group>
            </div>
          </template>

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

const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const cyber = ref<cybersType>();

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

const setBreadcrumbs = breadcrumbStore.setBreadcrumbs;

const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title as string);
const blocklyRef = ref<InstanceType<typeof Coding> | null>(null);
const saveable = computed(() => {
  if (meta.value === null) return false;
  const { can } = useAbility();
  return can("editable", new AbilityEditable(meta.value!.editable));
});

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

onMounted(async () => {
  try {
    setBreadcrumbs([
      { path: "/", meta: { title: "元宇宙实景编程平台" } },
      { path: "/meta-verse/index", meta: { title: "宇宙" } },
      { path: "", meta: { title: "赛博编辑" } },
    ]);

    loading.value = true;
    const res = await getMeta(id.value, "cyber,event,share");
    meta.value = res.data;
    console.log("meta.value", meta.value);

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
        path: "/verse/view?id=" + meta.value.id,
        meta: { title: "【宇宙】" },
      },
      {
        path: "/verse/scene?id=" + meta.value.id,
        meta: { title: "宇宙编辑" },
      },
      {
        path:
          "/meta/rete-meta?id=" +
          meta.value.id +
          "&title=" +
          encodeURIComponent(title.value),
        meta: { title: "元编辑" },
      },
      {
        path: ".",
        meta: { title: "赛博" },
      },
    ]);

    if (meta.value.cyber === null) {
      if (meta.value.editable) {
        const cyberRes = await postCyber({
          meta_id: meta.value.id,
        });
        cyber.value = cyberRes.data;
      }
    } else {
      cyber.value = meta.value.cyber;
    }
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
