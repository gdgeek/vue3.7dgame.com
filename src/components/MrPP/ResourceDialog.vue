<template>
  <div>
    <el-dialog v-model="dialogVisible" width="95%" height="100px" :show-close="false" @close="doClose">
      <template #header>
        <div class="dialog-footer">
          <el-tabs v-model="activeName" type="card" class="demo-tabs" @tab-click="handleClick">
            <el-tab-pane :label="$t('meta.ResourceDialog.label1')" name="binding" v-if="metaId != null"></el-tab-pane>
            <el-tab-pane :label="$t('meta.ResourceDialog.label2')" name="owner"></el-tab-pane>
          </el-tabs>
          <MrPPHeader :sorted="active.sorted" :searched="active.searched" @search="search" @sort="sort">
            <el-tag>
              <b>{{ $t("meta.ResourceDialog.title") }}</b>
            </el-tag>
          </MrPPHeader>
          <el-divider content-position="left">
            <el-tag v-if="active.searched !== ''" size="small" closable @close="clearSearched">
              {{ active.searched }}
            </el-tag>
          </el-divider>
          <div class="batch-actions" v-if="metaId != null">
            <el-button-group>
              <el-button size="small" type="primary" @click="toggleMultiSelectMode">
                {{ isMultiSelectMode ? $t("meta.ResourceDialog.exitMultiSelect") :
                  $t("meta.ResourceDialog.enterMultiSelect") }}
              </el-button>
              <el-button v-if="isMultiSelectMode && activeName === 'owner'" size="small" type="success"
                @click="doBatchBinding" :disabled="selectedItems.length === 0">
                {{ $t("meta.ResourceDialog.batchBind") }}
                ({{ selectedItems.length }})
              </el-button>
              <el-button v-if="isMultiSelectMode && activeName === 'binding'" size="small" type="success"
                @click="doBatchBinding" :disabled="selectedItems.length === 0">
                {{ $t("meta.ResourceDialog.batchDeploy") }}
                ({{ selectedItems.length }})
              </el-button>
              <el-button v-if="isMultiSelectMode && activeName === 'binding'" size="small" type="warning"
                @click="doBatchUnbind" :disabled="selectedItems.length === 0">
                {{ $t("meta.ResourceDialog.batchUnbind") }}
                ({{ selectedItems.length }})
              </el-button>
            </el-button-group>
            <div v-if="isMultiSelectMode && activeName === 'owner'" class="select-resource-tip">
              <el-tag type="info" size="small">
                {{ $t("meta.ResourceDialog.availableForBinding", { count: unboundItemsCount }) }}
              </el-tag>
            </div>
            <div v-if="isMultiSelectMode && activeName === 'binding'" class="select-resource-tip">
              <el-tag type="info" size="small">
                {{ $t("meta.ResourceDialog.availableForDeployment", { count: deployableItemsCount }) }}
              </el-tag>
            </div>
          </div>
        </div>
      </template>

      <Waterfall v-if="active !== null && active.items !== null" :list="viewCards" :width="230" :gutter="10"
        :backgroundColor="'rgba(255, 255, 255, .05)'">
        <template #default="{ item }">
          <div style="width: 230px">
            <el-card v-if="activeName === 'owner'" style="width: 220px" class="box-card"
              :class="{ 'selected-card': isMultiSelectMode && isSelected(item) }">
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <div class="mrpp-title">
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </div>
                  <div class="image-container">
                    <img v-if="!item.image" src="@/assets/image/none.png"
                      style="width: 100%; height: auto; object-fit: contain" />
                    <LazyImg v-if="item.image" style="width: 100%; height: auto" fit="contain" :url="item.image.url">
                    </LazyImg>
                    <div v-if="item.type === 'audio'" class="info-container">
                      <audio id="audio" controls style="width: 100%; height: 30px" :src="item.file.url"></audio>
                    </div>
                  </div>
                  <div v-if="item.created_at" style="
                      width: 100%;
                      text-align: center;
                      position: relative;
                      z-index: 2;
                    ">
                    {{ convertToLocalTime(item.created_at) }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix" v-if="metaId != null">
                <!-- 多选模式下显示选择按钮 -->
                <el-button-group v-if="isMultiSelectMode">
                  <el-button v-if="isSelected(item)" type="success" size="small" @click="toggleSelect(item)">
                    {{ $t("meta.ResourceDialog.deselect") }}
                  </el-button>
                  <el-button v-else type="primary" size="small" @click="toggleSelect(item)">
                    {{ $t("meta.ResourceDialog.select") }}
                  </el-button>
                </el-button-group>
                <template v-else>
                  <el-button-group v-if="item.id === value">
                    <el-button type="warning" size="small" @click="doEmpty">
                      {{ $t("meta.ResourceDialog.cancelSelect") }}
                    </el-button>
                  </el-button-group>
                  <el-button-group v-else-if="isBinding(item)">
                    <el-button type="primary" size="small" @click="doSelect(item)">
                      {{ $t("meta.ResourceDialog.select") }}
                    </el-button>
                    <el-button type="warning" size="small" @click="doUnbind(item)">
                      {{ $t("meta.ResourceDialog.doUnbind") }}
                    </el-button>
                  </el-button-group>
                  <el-button v-else size="small" @click="doBinding(item)">
                    {{ $t("meta.ResourceDialog.bind") }}
                  </el-button>
                </template>
              </div>
              <div class="clearfix" v-else>
                <el-button type="primary" size="small" @click="doSelect(item)">
                  {{ $t("meta.ResourceDialog.select") }}
                </el-button>
              </div>
              <div class="bottom clearfix"></div>
            </el-card>
            <el-card v-else style="width: 220px" class="box-card"
              :class="{ 'selected-card': isMultiSelectMode && isSelected(item) }">
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <div class="mrpp-title">
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </div>
                  <img v-if="item.image" style="width: 100%; height: 180px" fit="contain" :src="item.image.url" lazy />
                  <div style="width: 100%; text-align: center">
                    {{ item.created_at }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix">
                <el-button-group v-if="isMultiSelectMode">
                  <el-button v-if="isSelected(item)" type="success" size="small" @click="toggleSelect(item)">
                    {{ $t("meta.ResourceDialog.deselect") }}
                  </el-button>
                  <el-button v-else type="primary" size="small" @click="toggleSelect(item)">
                    {{ $t("meta.ResourceDialog.select") }}
                  </el-button>
                </el-button-group>
                <template v-else>
                  <el-button-group v-if="value === null || item.id !== value">
                    <el-button type="primary" size="small" @click="doSelect(item)">
                      {{ $t("meta.ResourceDialog.select") }}
                    </el-button>
                    <el-button type="warning" size="small" @click="doUnbind(item)">
                      {{ $t("meta.ResourceDialog.doUnbind") }}
                    </el-button>
                  </el-button-group>
                  <el-button-group v-else>
                    <el-button type="warning" size="small" @click="doEmpty">
                      {{ $t("meta.ResourceDialog.cancelSelect") }}
                    </el-button>
                  </el-button-group>
                </template>
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
              <el-pagination :current-page="active.pagination.current" :page-count="active.pagination.count"
                :page-size="active.pagination.size" :total="active.pagination.total" layout="prev, pager, next, jumper"
                background @current-change="handleCurrentChange"></el-pagination>
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
import { getResources } from "@/api/v1/resources";
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
  isMultiSelectMode: false,
  selectedItems: [] as any[]
});
const owner = ref({
  items: [] as any[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
  isMultiSelectMode: false,
  selectedItems: [] as any[]
});

const active = computed(() => {
  return activeName.value === "binding" ? binding.value : owner.value;
});

const isMultiSelectMode = computed(() => {
  return activeName.value === "binding"
    ? binding.value.isMultiSelectMode
    : owner.value.isMultiSelectMode;
});

const selectedItems = computed(() => {
  return activeName.value === "binding"
    ? binding.value.selectedItems
    : owner.value.selectedItems;
});

const isSelected = (item: any) => {
  return selectedItems.value.some((selected) => selected.id === item.id);
};

const toggleSelect = (item: any) => {
  const currentTab = activeName.value === "binding" ? binding.value : owner.value;

  if (isSelected(item)) {
    currentTab.selectedItems = currentTab.selectedItems.filter((selected) => selected.id !== item.id);
  } else {
    currentTab.selectedItems.push(item);
  }
};

const toggleMultiSelectMode = () => {
  const currentTab = activeName.value === "binding" ? binding.value : owner.value;
  currentTab.isMultiSelectMode = !currentTab.isMultiSelectMode;

  if (!currentTab.isMultiSelectMode) {
    currentTab.selectedItems = [];
  }
};

const doBatchBinding = async () => {
  const currentTab = activeName.value === "binding" ? binding.value : owner.value;

  if (currentTab.selectedItems.length === 0) {
    ElMessage.warning(t("meta.ResourceDialog.noItemSelected"));
    return;
  }

  try {
    if (activeName.value === 'owner') {
      await ElMessageBox.confirm(
        t("meta.ResourceDialog.batchConfirm.message1", { count: currentTab.selectedItems.length }),
        t("meta.ResourceDialog.batchConfirm.message2"),
        {
          confirmButtonText: t("meta.ResourceDialog.batchConfirm.confirm"),
          cancelButtonText: t("meta.ResourceDialog.batchConfirm.cancel"),
          type: "warning",
        }
      );

      const promises = currentTab.selectedItems.map(item =>
        postMetaResource({
          meta_id: metaId.value,
          resource_id: item.id,
        })
      );

      await Promise.all(promises);
      await refresh();
      ElMessage.success(t("meta.ResourceDialog.batchConfirm.success"));

      try {
        await ElMessageBox.confirm(
          t("meta.ResourceDialog.batchConfirm.selectOne.message1"),
          t("meta.ResourceDialog.batchConfirm.selectOne.message2"),
          {
            confirmButtonText: t("meta.ResourceDialog.batchConfirm.selectOne.confirm"),
            cancelButtonText: t("meta.ResourceDialog.batchConfirm.selectOne.cancel"),
            type: "warning",
          }
        );

        await currentTab.selectedItems.map(item => {
          selected(item);
        });

        ElMessage.success(t("meta.ResourceDialog.batchConfirm.selectOne.success"));

      } catch {
        // 如果用户取消确认，清空选择状态
        currentTab.selectedItems = [];
        currentTab.isMultiSelectMode = false;
        ElMessage.info(t("meta.ResourceDialog.batchConfirm.selectOne.info"));
      }
    } else {
      try {
        await ElMessageBox.confirm(
          t("meta.ResourceDialog.batchConfirm2.message1", { count: currentTab.selectedItems.length }),
          t("meta.ResourceDialog.batchConfirm2.message2"),
          {
            confirmButtonText: t("meta.ResourceDialog.batchConfirm2.confirm"),
            cancelButtonText: t("meta.ResourceDialog.batchConfirm2.cancel"),
            type: "warning",
          }
        );
        await currentTab.selectedItems.map(item => {
          selected(item);
        });

        ElMessage.success(t("meta.ResourceDialog.batchConfirm.selectOne.success"));
      } catch {
        // 如果用户取消确认，清空选择状态
        currentTab.selectedItems = [];
        currentTab.isMultiSelectMode = false;
        ElMessage.info(t("meta.ResourceDialog.batchConfirm2.info"));
      }
    }
  } catch (error) {
    console.log(error);
    ElMessage.error(t("meta.ResourceDialog.batchConfirm.info"));
  }

  // 清空选择状态
  currentTab.selectedItems = [];
  currentTab.isMultiSelectMode = false;
};

const isBinding = (item: any) => {
  if (!item.metaResources || !metaId.value) return false;
  return item.metaResources.some((resource: any) => resource.meta_id === metaId.value);
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
    isMultiSelectMode: false,
    selectedItems: []
  };
  owner.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
    isMultiSelectMode: false,
    selectedItems: []
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
  // 重置状态
  binding.value.selectedItems = [];
  binding.value.isMultiSelectMode = false;
  owner.value.selectedItems = [];
  owner.value.isMultiSelectMode = false;
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

const doUnbind = async (item: any) => {
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

    const resourceToDelete = item.metaResources.find((resource: any) => resource.meta_id === metaId.value);
    if (resourceToDelete) {
      await deleteMetaResource(resourceToDelete.id);
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

const doBatchUnbind = async () => {
  const currentTab = activeName.value === "binding" ? binding.value : owner.value;

  if (currentTab.selectedItems.length === 0) {
    ElMessage.warning(t("meta.ResourceDialog.noItemSelected"));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t("meta.ResourceDialog.batchUnbindConfirm.message1", { count: currentTab.selectedItems.length }),
      t("meta.ResourceDialog.batchUnbindConfirm.message2"),
      {
        confirmButtonText: t("meta.ResourceDialog.batchUnbindConfirm.confirm"),
        cancelButtonText: t("meta.ResourceDialog.batchUnbindConfirm.cancel"),
        type: "warning",
      }
    );

    // 执行批量解绑操作
    const promises = currentTab.selectedItems.map(item => {
      const resourceToDelete = item.metaResources.find((resource: any) => resource.meta_id === metaId.value);
      return resourceToDelete ? deleteMetaResource(resourceToDelete.id) : Promise.resolve();
    });

    await Promise.all(promises);
    await refresh();
    ElMessage.success(t("meta.ResourceDialog.batchUnbindConfirm.success"));

    // 清空选择状态
    currentTab.selectedItems = [];
    currentTab.isMultiSelectMode = false;
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
  let cards = transformToViewCard(active.value.items);
  // 只在 owner 标签页时过滤已绑定资源
  if (isMultiSelectMode.value && activeName.value === 'owner') {
    cards = cards.filter(item => !isBinding(item));
  }
  console.log("viewCards", cards);
  return cards;
});

// 未绑定资源的数量
const unboundItemsCount = computed(() => {
  if (!isMultiSelectMode.value || activeName.value !== 'owner') return 0;
  return active.value.items.filter(item => !isBinding(item)).length;
});

// 可部署资源数量
const deployableItemsCount = computed(() => {
  if (!isMultiSelectMode.value || activeName.value !== 'binding') return 0;
  return binding.value.items.length;
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
  opacity: 0;
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}

.image-container:hover .info-container {
  transform: scale(1);
  opacity: 1;
}

.select-resource-tip {
  margin-top: 10px;
  text-align: left;
}

.batch-actions {
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.selected-card {
  border: 1px solid #67c23a !important;
  box-shadow: 0 0 10px rgba(103, 194, 58, 0.5) !important;
  transform: scale(1.02);
  transition: all 0.3s ease;
}
</style>
