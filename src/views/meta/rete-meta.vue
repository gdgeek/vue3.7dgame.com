<!-- <template>
  <div>
    <resource-dialog
      @selected="selectResources"
      @cancel="openResources"
      ref="dialog"
    ></resource-dialog>
    <el-container>
      <el-main>
        <el-card v-loading="loading" class="box-card">
          <template #header>
            <div v-if="meta !== null" class="clearfix">
              / 【元】{{ title }}
              <el-button-group style="float: right">
                <el-button
                  v-if="meta?.editable"
                  type="primary"
                  size="small"
                  @click="save"
                >
                  <font-awesome-icon
                    class="icon"
                    icon="save"
                  ></font-awesome-icon>
                  保存
                </el-button>
                <el-button v-else type="primary" size="small" @click="arrange">
                  <font-awesome-icon
                    class="icon"
                    icon="project-diagram"
                  ></font-awesome-icon>
                  整理
                </el-button>
              </el-button-group>
            </div>
          </template>
          <div v-show="visible" class="rete" ref="rete"></div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import editor from "@/node-editor/meta";
import { getMeta, metaInfo, putMeta } from "@/api/v1/meta";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";

const route = useRoute();
const dialog = ref();
const rete = ref();
const loading = ref(false);
const visible = ref(true);
const meta = ref<metaInfo>();

const id = parseInt(route.query.id as string);
const title = computed(() => route.query.title as string);

const resource = reactive({
  callback: null as ((data: any) => void) | null,
});

const openResources = ({ value = null, callback = null, type = null } = {}) => {
  resource.callback = callback;
  if (callback) dialog.value.open(value, id, type);
};

const selectResources = (data: any) => {
  if (resource.callback) resource.callback(data);
};

const save = async () => {
  const data = await editor.save();
  await putMeta(id, { data });
  editor.arrange();
};

const arrange = async () => {
  editor.arrange();
};

onMounted(async () => {
  editor.initMeta({ container: rete.value, root: this });
  const response = await getMeta(id, "verse,share");
  meta.value = response.data;

  if (meta.value.data !== null) {
    await editor.setup(JSON.parse(meta.value.data));
  } else {
    await editor.create({ name: meta.value.title, id: meta.value.id });
    await save();
  }
  loading.value = false;
  if (!meta.value.editable) {
    editor.ban();
  }
});

onBeforeUnmount(() => {
  if (meta.value?.editable) save();
});
</script>

<style lang="scss" scoped>
#rete {
  width: 100%;
  height: 1000px;
}

.node .control input,
.node .input-control input {
  width: 140px;
}

.rete {
  max-width: 100%;
  min-height: calc(73vh);
  max-height: calc(73vh);

  border-style: solid;
  border-width: 1px;
}

select,
input {
  width: 100%;
  border-radius: 30px;
  background-color: white;
  padding: 2px 6px;
  border: 1px solid #999;
  font-size: 110%;
  width: 170px;
}

.icon {
  margin-right: 5px;
}
</style> -->

<template>
  <div class="app-container">
    <h1>Vue3-Element-Admin-Thin</h1>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Dashboard",
  inheritAttrs: false,
});
</script>

<style lang="scss" scoped></style>
