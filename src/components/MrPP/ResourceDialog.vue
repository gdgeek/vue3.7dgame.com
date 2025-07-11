<template>
  <div>
    <el-dialog v-model="dialogVisible" width="95%" height="100px" :show-close="false" @close="doClose">
      <template #header>
        <div class="dialog-footer">
          <MrPPHeader :sorted="active.sorted" :searched="active.searched" @search="search" @sort="sort">
            <el-tag>
              <b>{{ $t(mode === 'replace' ? "meta.ResourceDialog.replaceTitle" : "meta.ResourceDialog.title") }}</b>
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
                        <audio id="audio" controls style="width: 100%; height: 30px" :src="item.file.url"
                          @play="handleAudioPlay"></audio>
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

                <div class="clearfix">
                  <div class="demo-button-style">
                    <el-checkbox-group v-if="mode !== 'replace'" v-model="selectedIds" size="small">
                      <el-checkbox-button :value="item.id" v-if="multiple">
                        {{ $t("meta.ResourceDialog.select") }}
                      </el-checkbox-button>
                      <el-checkbox-button @click="doSelect(item)">
                        {{ $t("meta.ResourceDialog.putIn") }}
                      </el-checkbox-button>
                    </el-checkbox-group>
                    <el-button v-else size="small" @click="doReplace(item)">
                      {{ $t("meta.ResourceDialog.replace") }}
                    </el-button>
                  </div>
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
                <template v-if="mode !== 'replace'">
                  <el-button v-if="multiple" size="small" :disabled="selectedIds.length == 0"
                    @click="doBatchSelect()">{{
                      $t("meta.ResourceDialog.putAllIn") }}</el-button>
                  <el-button v-if="multiple" size="small" :disabled="selectedIds.length == 0" @click="doEmpty()">{{
                    $t("meta.ResourceDialog.empty") }}</el-button>
                </template>
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


const props = defineProps({

  multiple: {
    type: Boolean,
    default: true,
  },

});
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
const singleSelectedId = ref<number>();
const dialogVisible = ref(false);
const type = ref("polygen");
const metaId = ref<number | null>(null);
const value = ref<any>(null);
const mode = ref<'normal' | 'replace'>('normal');

const currentPlayingAudio = ref<HTMLAudioElement | null>(null);

const handleAudioPlay = (event: Event) => {
  const audioElement = event.target as HTMLAudioElement;
  if (currentPlayingAudio.value && currentPlayingAudio.value !== audioElement) {
    currentPlayingAudio.value.pause();
  }
  currentPlayingAudio.value = audioElement;
};

const active = ref<ActiveState>({
  items: [],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

// 事件和国际化
const emit = defineEmits(["selected", "replaced", "cancel", "close"]);
const { t } = useI18n();

// 计算属性
const viewCards = computed(() => {
  console.log("viewCards", transformToViewCard(active.value.items));
  return transformToViewCard(active.value.items);
});

// 方法
const isSelected = (item: any): boolean => {
  if (mode.value === 'replace') {
    return singleSelectedId.value === item.id;
  }
  return selectedIds.value.some((id) => id === item.id);
}

const getItemTitle = (item: any): string => {
  return item.title ?? item.name ?? "title";
}

const open = async (newValue: any, meta_id: any = null, newType: any = null, openMode: 'normal' | 'replace' = 'normal') => {
  active.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };

  type.value = newType;
  metaId.value = meta_id;
  value.value = newValue;
  mode.value = openMode; // 设置打开模式

  // 重置选择状态
  selectedIds.value = [];
  singleSelectedId.value = undefined;

  await refresh();
  dialogVisible.value = true;
}

const openIt = async ({ selected = null, binding = null, type }: any, openMode: 'normal' | 'replace' = 'normal') => {
  await open(selected, binding, type, openMode);
}

// 替换模式下的选择处理
const doReplace = (data: ViewCard) => {
  emit("replaced", data);
  dialogVisible.value = false;
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
/*
function selected(data = null) {
  emit("selected", data);
  dialogVisible.value = false;
}
*/
function doEmpty() {
  value.value = null;
  selectedIds.value = [];
}

const doClose = () => {
  selectedIds.value = [];
  singleSelectedId.value = undefined;
  emit("close");
}

async function doBatchSelect() {
  console.log("doBatchSelect", selectedIds.value);
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
      console.log("doBatchSelectobj", obj);
      if (obj) {
        // 转换为ViewCard确保所有属性都被包含
        const viewCardObj = transformToViewCard([obj])[0];
        console.log("doBatchSelectviewCardObj", viewCardObj);
        doSelect(viewCardObj);
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
    // metaResources: item.metaResources,
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
  border: 1px solid #3894ff !important;
  box-shadow: 0 0 10px rgba(56, 148, 255, 0.5) !important;
  transform: scale(1.02);
  transition: all 0.3s ease;
}
</style>
