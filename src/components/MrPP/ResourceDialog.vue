<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="95%"
      height="100px"
      :show-close="false"
      @close="doClose"
    >
      <template #header>
        <div class="dialog-footer">
          <el-tabs
            v-model="activeName"
            type="card"
            class="demo-tabs"
            @tab-click="handleClick"
          >
            <el-tab-pane
              :label="$t('meta.ResourceDialog.label1')"
              name="binding"
              v-if="metaId != null"
            ></el-tab-pane>
            <el-tab-pane
              :label="$t('meta.ResourceDialog.label2')"
              name="owner"
            ></el-tab-pane>
          </el-tabs>
          <mr-p-p-header
            :sorted="active.sorted"
            :searched="active.searched"
            @search="search"
            @sort="sort"
          >
            <el-tag>
              <b>{{ $t("meta.ResourceDialog.title") }}</b>
            </el-tag>
          </mr-p-p-header>
          <el-divider content-position="left">
            <el-tag
              v-if="active.searched !== ''"
              size="small"
              closable
              @close="clearSearched"
            >
              {{ active.searched }}
            </el-tag>
          </el-divider>
        </div>
      </template>

      <Waterfall
        v-if="active !== null && active.items !== null"
        :list="viewCards"
        :width="230"
        :gutter="10"
        :backgroundColor="'rgba(255, 255, 255, .05)'"
      >
        <template #default="{ item }">
          <div style="width: 230px">
            <el-card
              v-if="activeName === 'owner'"
              style="width: 220px"
              class="box-card"
            >
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <div class="mrpp-title">
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </div>
                  <div class="image-container">
                    <img
                      v-if="!item.image"
                      src="@/assets/image/none.png"
                      style="width: 100%; height: auto; object-fit: contain"
                    />
                    <LazyImg
                      v-if="item.image"
                      style="width: 100%; height: auto"
                      fit="contain"
                      :url="item.image.url"
                    >
                    </LazyImg>
                    <div v-if="item.type === 'audio'" class="info-container">
                      <audio
                        id="audio"
                        controls
                        style="width: 100%; height: 30px"
                        :src="item.file.url"
                      ></audio>
                    </div>
                  </div>
                  <div
                    v-if="item.created_at"
                    style="
                      width: 100%;
                      text-align: center;
                      position: relative;
                      z-index: 2;
                    "
                  >
                    {{ convertToLocalTime(item.created_at) }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix" v-if="metaId != null">
                <el-button-group v-if="item.id === value">
                  1111
                  <el-button type="warning" size="small" @click="doEmpty">
                    {{ $t("meta.ResourceDialog.cancelSelect") }}
                  </el-button>
                </el-button-group>
                <el-button-group v-else-if="isBinding(item)">
                  <el-button
                    type="primary"
                    size="small"
                    @click="doSelect(item)"
                  >
                    {{ $t("meta.ResourceDialog.select") }}
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    @click="doUnbind(item)"
                  >
                    {{ $t("meta.ResourceDialog.doUnbind") }}
                  </el-button>
                </el-button-group>
                <el-button v-else size="small" @click="doBinding(item)">
                  {{ $t("meta.ResourceDialog.bind") }}
                </el-button>
              </div>
              <div class="clearfix" v-else>
                <el-button type="primary" size="small" @click="doSelect(item)">
                  {{ $t("meta.ResourceDialog.select") }}
                </el-button>
              </div>
              <div class="bottom clearfix"></div>
            </el-card>
            <el-card v-else style="width: 220px" class="box-card">
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <div class="mrpp-title">
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </div>
                  <img
                    v-if="item.image"
                    style="width: 100%; height: 180px"
                    fit="contain"
                    :src="item.image.url"
                    lazy
                  />
                  <div style="width: 100%; text-align: center">
                    {{ item.created_at }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix">
                <el-button-group v-if="value === null || item.id !== value">
                  <el-button
                    type="primary"
                    size="small"
                    @click="doSelect(item)"
                  >
                    {{ $t("meta.ResourceDialog.select") }}
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    @click="doUnbind(item)"
                  >
                    {{ $t("meta.ResourceDialog.doUnbind") }}
                  </el-button>
                </el-button-group>
                <el-button-group v-else>
                  <el-button type="warning" size="small" @click="doEmpty">
                    {{ $t("meta.ResourceDialog.cancelSelect") }}
                  </el-button>
                </el-button-group>
              </div>
              <div class="bottom clearfix"></div>
            </el-card>
            <br />
          </div>
        </template>
      </Waterfall>
      <template v-else>
        <el-skeleton></el-skeleton>
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-row :gutter="0">
            <el-col :xs="16" :sm="16" :md="16" :lg="16" :xl="16">
              <el-pagination
                :current-page="active.pagination.current"
                :page-count="active.pagination.count"
                :page-size="active.pagination.size"
                :total="active.pagination.total"
                layout="prev, pager, next, jumper"
                background
                @current-change="handleCurrentChange"
              ></el-pagination>
            </el-col>
            <el-col :xs="8" :sm="8" :md="8" :lg="8" :xl="8">
              <el-button-group>
                <el-button size="small" @click="doEmpty()">{{
                  $t("meta.ResourceDialog.empty")
                }}</el-button>
                <el-button size="small" @click="dialogVisible = false">
                  {{ $t("meta.ResourceDialog.cancel") }}
                </el-button>
              </el-button-group>
            </el-col>
          </el-row>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { getResources } from "@/api/resources";
import {
  getMetaResources,
  postMetaResource,
  deleteMetaResource,
} from "@/api/v1/meta-resource";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const dialogVisible = ref(false);
const activeName = ref("binding");
const type = ref("polygen");
const metaId = ref<number | null>(null);
const value = ref<any>(null);
const emit = defineEmits(["selected", "cancel", "close"]);
const { t } = useI18n();
const binding = ref({
  items: [] as any[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});
const owner = ref({
  items: [] as any[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

const active = computed(() => {
  return activeName.value === "binding" ? binding.value : owner.value;
});

const isBinding = (item: any) => {
  for (let i = 0; i < item.metaResources.length; ++i) {
    if (item.metaResources[i].meta_id === metaId.value) {
      return true;
    }
  }
  return false;
};

const handleClick = (tab: any, event: any) => {
  refresh();
};

const title = (item: any) => {
  return item.title ?? item.name ?? "title";
};

const openIt = async ({ selected = null, binding = null, type }: any) => {
  await open(selected, binding, type);
};

const open = async (
  newValue: any,
  meta_id: any = null,
  newType: any = null
) => {
  binding.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };
  owner.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };

  type.value = newType;
  metaId.value = meta_id;
  value.value = newValue;

  await refreshOwner();
  await refreshBinding();
  if (binding.value.items !== null && binding.value.items.length !== 0) {
    activeName.value = "binding";
  } else {
    activeName.value = "owner";
  }
  dialogVisible.value = true;
};

const refreshOwner = async () => {
  const response = await getResources(
    type.value,
    owner.value.sorted,
    owner.value.searched,
    owner.value.pagination.current,
    "image, metaResources"
  );
  owner.value.items = response.data;

  owner.value.pagination = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
};

const refreshBinding = async () => {
  const response = await getMetaResources(
    metaId.value!,
    type.value,
    binding.value.sorted,
    binding.value.searched,
    binding.value.pagination.current,
    "image,author,metaResources"
  );
  binding.value.pagination = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
  binding.value.items = response.data;
};

const close = () => {
  dialogVisible.value = false;
};

const sort = (value: string) => {
  active.value.sorted = value;
  refresh();
};

const search = (value: string) => {
  active.value.searched = value;
  refresh();
};

const clearSearched = () => {
  active.value.searched = "";
  refresh();
};

const doSelect = (data: ViewCard) => {
  emit("selected", data);
  dialogVisible.value = false;
};

const doEmpty = () => {
  value.value = null;
  emit("selected", null);
  emit("cancel");
  dialogVisible.value = false;
};

const selected = (data = null) => {
  emit("selected", data);
  dialogVisible.value = false;
};

const doClose = () => {
  emit("close");
};

const handleCurrentChange = (page: number) => {
  active.value.pagination.current = page;
  refresh();
};

const refresh = async () => {
  if (activeName.value === "binding") {
    await refreshBinding();
    if (binding.value.items === null || binding.value.items.length === 0) {
      await refreshOwner();
      activeName.value = "owner";
    }
  } else {
    await refreshOwner();
  }
};

const doUnbind = async (data: any) => {
  try {
    await ElMessageBox.confirm(
      t("meta.ResourceDialog.confirm1.message1"),
      t("meta.ResourceDialog.confirm1.message2"),
      {
        confirmButtonText: t("meta.ResourceDialog.confirm1.confirm"),
        cancelButtonText: t("meta.ResourceDialog.confirm1.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    for (let i = 0; i < data.metaResources.length; ++i) {
      if (data.metaResources[i].meta_id == metaId.value) {
        await deleteMetaResource(data.metaResources[i].id);
        break;
      }
    }
    await refresh();
    ElMessage.success(t("meta.ResourceDialog.confirm1.success"));
  } catch {
    ElMessage.info(t("meta.ResourceDialog.confirm1.info"));
  }
};

const doBinding = async (data: any) => {
  try {
    await ElMessageBox.confirm(
      t("meta.ResourceDialog.confirm2.message1"),
      t("meta.ResourceDialog.confirm2.message2"),
      {
        confirmButtonText: t("meta.ResourceDialog.confirm2.confirm"),
        cancelButtonText: t("meta.ResourceDialog.confirm2.cancel"),
        type: "warning",
      }
    );
    const response = await postMetaResource({
      meta_id: metaId.value,
      resource_id: data.id,
    });
    await refresh();
    ElMessage.success(t("meta.ResourceDialog.confirm2.success"));

    await ElMessageBox.confirm(
      t("meta.ResourceDialog.confirm2.confirm2.message1"),
      t("meta.ResourceDialog.confirm2.confirm2.message2"),
      {
        confirmButtonText: t("meta.ResourceDialog.confirm2.confirm2.confirm"),
        cancelButtonText: t("meta.ResourceDialog.confirm2.confirm2.cancel"),
        type: "warning",
      }
    );
    selected(data);
    ElMessage.success(t("meta.ResourceDialog.confirm2.confirm2.success"));
  } catch {
    ElMessage.info(t("meta.ResourceDialog.info"));
  }
};

defineExpose({
  openIt,
  open,
});

type ViewCard = {
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

// 瀑布流数据类型转换
const transformToViewCard = (items: any[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.file.url,
      id: item.id ? item.id.toString() : undefined,
      name: item.name,
      info: item.info,
      uuid: item.uuid,
      type: item.type,
      image_id: item.image_id,
      image: item.image,
      created_at: item.created_at,
      file: item.file,
      metaResources: item.metaResources,
    };
  });
};

const viewCards = computed(() => {
  const cards = transformToViewCard(active.value.items);
  console.log("viewCards", cards);
  return cards;
});
</script>

<style scoped>
.card-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-container {
  position: relative;
  width: 100%;
  height: auto;
}

.info-container {
  position: absolute;
  bottom: 0;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
  padding: 10px;
  transform: scale(0);
  /* 或 translateX(-100%) 等 */
  opacity: 0;
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}

.image-container:hover .info-container {
  transform: scale(1);
  opacity: 1;
}
</style>
