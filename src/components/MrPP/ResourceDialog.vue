<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="95%"
      height="100px"
      :show-close="false"
      @close="doClose"
      append-to-body
    >
      <template #header>
        <div class="dialog-footer">
          <MrPPHeader
            :sorted="sorted"
            :searched="searched"
            @search="search"
            @sort="sort"
          >
            <el-tag>
              <b>{{
                $t(
                  mode === "replace"
                    ? "meta.ResourceDialog.replaceTitle"
                    : "meta.ResourceDialog.title"
                )
              }}</b>
            </el-tag>
          </MrPPHeader>
          <div class="search-chip-row">
            <el-tag
              v-if="searched !== ''"
              size="small"
              closable
              @close="clearSearched"
            >
              {{ searched }}
            </el-tag>
          </div>
        </div>
      </template>
      <el-card shadow="hover" :body-style="{ padding: '8px' }">
        <div v-if="active.items?.length" class="resource-grid">
          <div
            v-for="item in active.items"
            :key="item.id"
            class="resource-item"
            :class="{ disabled: !item.enabled }"
          >
            <div v-loading="!item.enabled">
              <StandardCard
                :image="item.image?.url"
                :title="getItemTitle(item)"
                :meta="{
                  date: item.created_at ? convertToLocalTime(item.created_at) : '',
                }"
                :selected="isSelected(item)"
                :selection-mode="mode !== 'replace' && multiple"
                :type-icon="getTypeIcon(item.type)"
                :placeholder-icon="getTypeIcon(item.type)"
                @select="() => toggleSelection(item)"
                @view="() => (mode === 'replace' ? doReplace(item) : doSelect(item))"
              ></StandardCard>
              <slot name="bar" :item="item"></slot>
              <div class="card-actions">
                <template v-if="mode !== 'replace'">
                  <el-button
                    v-if="multiple"
                    size="small"
                    @click="toggleSelection(item)"
                  >
                    {{
                      isSelected(item)
                        ? $t("meta.ResourceDialog.cancelSelect")
                        : $t("meta.ResourceDialog.select")
                    }}
                  </el-button>
                  <el-button size="small" type="primary" @click="doSelect(item)">
                    {{ $t("meta.ResourceDialog.putIn") }}
                  </el-button>
                </template>
                <el-button
                  v-else
                  size="small"
                  type="primary"
                  @click="doReplace(item)"
                >
                  {{ $t("meta.ResourceDialog.replace") }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <template v-else>
          <el-skeleton></el-skeleton>
        </template>
      </el-card>

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
                <template v-if="mode !== 'replace'">
                  <el-button
                    v-if="multiple && !isPageSelected"
                    size="small"
                    :disabled="active.items.length === 0"
                    @click="selectAllCurrentPage"
                  >
                    {{ $t("ui.selectAllPage") }}
                  </el-button>
                  <el-button
                    v-if="multiple && isPageSelected"
                    size="small"
                    :disabled="active.items.length === 0"
                    @click="clearCurrentPageSelection"
                  >
                    {{ $t("ui.cancelSelectAll") }}
                  </el-button>
                  <el-button
                    v-if="multiple"
                    size="small"
                    :disabled="selectedIds.length == 0"
                    @click="doBatchSelect()"
                    >{{ $t("meta.ResourceDialog.putAllIn") }}</el-button
                  >
                  <el-button
                    v-if="multiple"
                    size="small"
                    :disabled="selectedIds.length == 0"
                    @click="doEmpty()"
                    >{{ $t("meta.ResourceDialog.empty") }}</el-button
                  >
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
import type { CardInfo, DataInput, DataOutput } from "@/utils/types";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { getResources } from "@/api/v1/resources";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import { StandardCard } from "@/components/StandardPage";
import type { ResourceInfo } from "@/api/v1/resources/model";

const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    onGetDatas?: (input: DataInput) => Promise<DataOutput>;
  }>(),
  {
    multiple: true,
  }
);
const sorted = ref("-created_at");
const searched = ref("");

// 响应式状态
const selectedIds = ref<Array<number | string>>([]);
const singleSelectedId = ref<number | string>();
const dialogVisible = ref(false);
const type = ref("polygen");
const metaId = ref<number | null>(null);
const value = ref<unknown>(null);
const mode = ref<"normal" | "replace">("normal");

const active = ref<DataOutput>({
  items: [],
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

const emit = defineEmits<{
  (e: "selected", data: CardInfo, replace: boolean): void;
  (e: "cancel"): void;
}>();

// 事件和国际化
//const emit = defineEmits(["selected", "replaced", "cancel", "close"]);

const { t } = useI18n();

// 方法
const isSelected = (item: CardInfo): boolean => {
  if (mode.value === "replace") {
    return singleSelectedId.value === item.id;
  }
  return selectedIds.value.some((id) => id === item.id);
};

const getItemTitle = (item: CardInfo): string => {
  return item.title ?? item.name ?? "title";
};

const getTypeIcon = (type?: string): string[] => {
  switch (type) {
    case "polygen":
      return ["fas", "cube"];
    case "picture":
    case "phototype":
      return ["fas", "image"];
    case "video":
      return ["fas", "video"];
    case "audio":
      return ["fas", "music"];
    case "voxel":
      return ["fas", "cubes"];
    case "particle":
      return ["fas", "wand-magic-sparkles"];
    default:
      return ["fas", "file"];
  }
};

const isPageSelected = computed(() => {
  if (!props.multiple || active.value.items.length === 0) return false;
  return active.value.items.every(
    (item) => item.enabled && selectedIds.value.includes(item.id)
  );
});

const open = async (
  newValue: unknown,
  meta_id: number | null = null,
  newType: string | null = null,
  openMode: "normal" | "replace" = "normal"
) => {
  active.value = {
    items: [],
    // sorted: "-created_at",
    // searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };

  type.value = newType;
  metaId.value = meta_id;
  value.value = newValue;
  mode.value = openMode; // 设置打开模式

  selectedIds.value = [];
  singleSelectedId.value = undefined;

  await refresh();
  dialogVisible.value = true;
};

type OpenItParams = {
  selected?: unknown;
  binding?: number | null;
  type: string;
};

const openIt = async (
  { selected = null, binding = null, type }: OpenItParams,
  openMode: "normal" | "replace" = "normal"
) => {
  await open(selected, binding, type, openMode);
};

// 替换模式下的选择处理
const doReplace = (data: CardInfo) => {
  emit("selected", data, true);
  dialogVisible.value = false;
};
async function getDatas(input: DataInput): Promise<DataOutput> {
  if (props.onGetDatas) {
    return props.onGetDatas(input);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const response = await getResources(
        input.type,
        sorted.value,
        searched.value,
        input.current,
        "image"
      );
      console.log("获取数据", response.data);
      const items = response.data.map((item: ResourceInfo) => {
        return {
          id: item.id,
          context: item,
          type: item.type,
          created_at: item.created_at,
          name: item.name ? item.name : item.title, // 使用name或title
          image: item.image ? { url: item.image.url } : null,
          enabled: true,
        } as CardInfo;
      });

      const pagination = {
        current: parseInt(
          String(response.headers["x-pagination-current-page"] ?? "1")
        ),
        count: parseInt(
          String(response.headers["x-pagination-page-count"] ?? "1")
        ),
        size: parseInt(
          String(response.headers["x-pagination-per-page"] ?? "20")
        ),
        total: parseInt(
          String(response.headers["x-pagination-total-count"] ?? "0")
        ),
      };
      resolve({ items, pagination });
    } catch (error) {
      console.error("获取数据失败", error);
      reject(error);
    }
  });
}

async function refresh() {
  active.value = await getDatas({
    type: type.value,
    sorted: sorted.value,
    searched: searched.value,
    current: active.value.pagination.current,
  });
  // active.value = output;
  //active.value.pagination = output.pagination;
}

// 排序和搜索
function sort(value: string) {
  sorted.value = value;
  refresh();
}

function search(value: string) {
  searched.value = value;
  active.value.pagination.current = 1;
  refresh();
}

function clearSearched() {
  searched.value = "";
  active.value.pagination.current = 1;
  refresh();
}

// 选择和取消操作
function doSelect(data: CardInfo) {
  emit("selected", data, false);
  dialogVisible.value = false;
}

function doEmpty() {
  value.value = null;
  selectedIds.value = [];
}

function toggleSelection(item: CardInfo) {
  if (!item.enabled || mode.value === "replace") return;
  const id = item.id;
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((v) => v !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
}

function selectAllCurrentPage() {
  const pageIds = active.value.items.filter((item) => item.enabled).map((item) => item.id);
  selectedIds.value = Array.from(new Set([...selectedIds.value, ...pageIds]));
}

function clearCurrentPageSelection() {
  const pageIdSet = new Set(active.value.items.map((item) => item.id));
  selectedIds.value = selectedIds.value.filter((id) => !pageIdSet.has(id));
}

const doClose = () => {
  selectedIds.value = [];
  singleSelectedId.value = undefined;
  dialogVisible.value = false;
  //emit("close");
};

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
        confirmButtonText: t(
          "meta.ResourceDialog.batchConfirm.selectOne.confirm"
        ),
        cancelButtonText: t(
          "meta.ResourceDialog.batchConfirm.selectOne.cancel"
        ),
        type: "warning",
      }
    );

    for (const id of selectedIds.value) {
      const obj = active.value.items.find((item) => item.id == id);
      if (obj) {
        emit("selected", obj, false);
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

// 对外暴露的方法
defineExpose({
  openIt,
  open,
});
</script>

<style scoped lang="scss">
.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 4px;
}

.search-chip-row {
  min-height: 8px;
  margin-top: 4px;
}

.resource-item {
  min-width: 0;

  &.disabled {
    opacity: 0.55;
  }
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
}

.info-container {
  margin-top: 8px;
}
</style>
