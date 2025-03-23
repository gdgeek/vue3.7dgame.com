<template>
  <div>
    <el-dialog v-model="dialogVisible" width="95%" height="100px" :show-close="false" @close="doClose">
      <template #header>
        <div class="dialog-footer">
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
        </div>
      </template>

      <el-card shadow="hover" :body-style="{ padding: '0px' }">
        <Waterfall v-if="active.items?.length" :list="viewCards" :width="230" :gutter="10"
          :backgroundColor="'rgba(255, 255, 255, .05)'">
          <template #default="{ item }">
            <div style="width: 230px">
              <el-card style="width: 220px" class="box-card" :class="{ 'selected-card': isSelected(item) }">
                <template #header>
                  <el-card shadow="hover" :body-style="{ padding: '0px' }">
                    <div class="mrpp-title">
                      <b class="card-title" nowrap>{{ getItemTitle(item) }}</b>
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
                  <div class="demo-button-style">
                    <el-checkbox-group v-model="selectedIds" size="small">
                      <el-checkbox-button :value="item.id">
                        {{ $t("meta.ResourceDialog.select") }}
                      </el-checkbox-button>
                      <el-checkbox-button @click="doSelect(item)">
                        放入
                      </el-checkbox-button>
                    </el-checkbox-group>
                  </div>
                </div>
                <div class="clearfix" v-else>
                  <el-button type="primary" size="small" @click="doSelect(item)">
                    {{ $t("meta.ResourceDialog.select") }}
                  </el-button>
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
      </el-card>

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
                <el-button size="small" :disabled="selectedIds.length == 0" @click="doBatchSelect()">放入全部选择</el-button>
                <el-button size="small" @click="doEmpty()">{{ $t("meta.ResourceDialog.empty") }}</el-button>
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
import { ref, computed, defineEmits, defineExpose } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { getResources } from "@/api/v1/resources";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";

// 类型定义
type ViewCard = {
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

type ActiveState = {
  items: any[];
  sorted: string;
  searched: string;
  pagination: {
    current: number;
    count: number;
    size: number;
    total: number;
  };
};

// 响应式状态
const selectedIds = ref<any[]>([]);
const dialogVisible = ref(false);
const type = ref("polygen");
const metaId = ref<number | null>(null);
const value = ref<any>(null);

const active = ref<ActiveState>({
  items: [],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

// 事件和国际化
const emit = defineEmits(["selected", "cancel", "close"]);
const { t } = useI18n();

// 计算属性
const viewCards = computed(() => {
  return transformToViewCard(active.value.items);
});

// 方法
function isSelected(item: any): boolean {
  return selectedIds.value.some((id) => id === item.id);
}

function getItemTitle(item: any): string {
  return item.title ?? item.name ?? "title";
}

async function open(newValue: any, meta_id: any = null, newType: any = null) {
  active.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };

  type.value = newType;
  metaId.value = meta_id;
  value.value = newValue;

  selectedIds.value = [];
  await refresh();
  dialogVisible.value = true;
}

async function openIt({ selected = null, binding = null, type }: any) {
  await open(selected, binding, type);
}

async function refresh() {
  const response = await getResources(
    type.value,
    active.value.sorted,
    active.value.searched,
    active.value.pagination.current,
    "image, metaResources"
  );

  active.value.items = response.data;
  active.value.pagination = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
}

// 排序和搜索
function sort(value: string) {
  active.value.sorted = value;
  refresh();
}

function search(value: string) {
  active.value.searched = value;
  refresh();
}

function clearSearched() {
  active.value.searched = "";
  refresh();
}

// 选择和取消操作
function doSelect(data: ViewCard) {
  emit("selected", data);
  dialogVisible.value = false;
}

function selected(data = null) {
  emit("selected", data);
  dialogVisible.value = false;
}

function doEmpty() {
  value.value = null;
  selectedIds.value = [];
}

function doClose() {
  selectedIds.value = [];
  emit("close");
}

async function doBatchSelect() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning(t("meta.ResourceDialog.noItemSelected"));
    return;
  }

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

    for (const id of selectedIds.value) {
      const obj = active.value.items.find((item) => item.id == id);
      if (obj) {
        selected(obj);
      }
    }

    ElMessage.success(t("meta.ResourceDialog.batchConfirm.selectOne.success"));
    dialogVisible.value = false;
  } catch {
    selectedIds.value = [];
  }
}

function handleCurrentChange(page: number) {
  active.value.pagination.current = page;
  refresh();
}

// 辅助函数
function transformToViewCard(items: any[]): ViewCard[] {
  return items.map((item) => ({
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
  }));
}

// 对外暴露的方法
defineExpose({
  openIt,
  open,
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

.selected-card {
  border: 1px solid #67c23a !important;
  box-shadow: 0 0 10px rgba(103, 194, 58, 0.5) !important;
  transform: scale(1.02);
  transition: all 0.3s ease;
}
</style>
