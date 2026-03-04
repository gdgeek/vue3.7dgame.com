<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      class="resource-dialog"
      width="90%"
      height="100px"
      top="2vh"
      :show-close="false"
      @close="doClose"
      append-to-body
    >
      <template #header>
        <div class="dialog-header">
          <PageActionBar
            class="dialog-action-bar"
            :title="
              $t(
                mode === 'replace'
                  ? 'meta.ResourceDialog.replaceTitle'
                  : 'meta.ResourceDialog.title'
              )
            "
            :search-placeholder="$t('ui.search')"
            :show-view-toggle="false"
            :show-name-sort="false"
            :default-sort="sorted"
            @search="search"
            @sort-change="sort"
          >
            <template #actions>
              <template v-if="mode !== 'replace'">
                <el-button
                  v-if="multiple && !isPageSelected"
                  :disabled="active.items.length === 0"
                  @click="selectAllCurrentPage"
                >
                  {{ $t("ui.selectAllPage") }}
                </el-button>
                <el-button
                  v-if="multiple && isPageSelected"
                  :disabled="active.items.length === 0"
                  @click="clearCurrentPageSelection"
                >
                  {{ $t("ui.cancelSelectAll") }}
                </el-button>
                <el-button
                  v-if="multiple"
                  type="primary"
                  :disabled="selectedIds.length === 0"
                  @click="doBatchSelect()"
                >
                  {{ $t("meta.ResourceDialog.putAllIn") }}
                </el-button>
                <el-button
                  v-if="multiple"
                  :disabled="selectedIds.length === 0"
                  @click="doEmpty()"
                >
                  {{ $t("meta.ResourceDialog.empty") }}
                </el-button>
              </template>
              <el-button @click="dialogVisible = false">
                {{ $t("meta.ResourceDialog.cancel") }}
              </el-button>
            </template>
          </PageActionBar>
        </div>
      </template>
      <el-card
        class="resource-list-shell"
        shadow="never"
        :body-style="{ padding: '0' }"
      >
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
                @view="() => handleViewInfo(item)"
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
            <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
              <div class="pagination-center">
                <el-pagination
                  :current-page="active.pagination.current"
                  :page-count="active.pagination.count"
                  :page-size="active.pagination.size"
                  :total="active.pagination.total"
                  layout="prev, pager, next"
                  background
                  @current-change="handleCurrentChange"
                ></el-pagination>
                <span class="goto-label">Go to</span>
                <el-input
                  v-model="jumpPage"
                  class="goto-input"
                  size="small"
                  @keyup.enter="applyJumpPage"
                  @blur="applyJumpPage"
                ></el-input>
              </div>
            </el-col>
          </el-row>
        </div>
      </template>
    </el-dialog>

    <DetailPanel
      v-model="detailVisible"
      :title="detailTitle"
      :name="detailResource?.name || ''"
      :z-index="6000"
      :loading="detailLoading"
      :editable="false"
      :show-delete="false"
      :properties="detailProperties"
      :placeholder-icon="detailPlaceholderIcon"
      :download-text="$t('meta.ResourceDialog.putIn')"
      :download-icon="['fas', 'plus']"
      @download="handlePutFromDetail"
      @close="handleDetailClose"
    >
      <template #preview>
        <div
          v-if="detailType === 'polygen' && detailResource"
          class="polygen-preview"
          :class="{ 'has-animations': hasAnimations }"
        >
          <polygen-view
            :file="detailResource.file"
            @loaded="handleModelLoaded"
            @progress="handleModelProgress"
          ></polygen-view>
          <el-progress
            v-if="modelProgress < 100"
            :percentage="modelProgress"
            :stroke-width="4"
            class="model-progress"
          ></el-progress>
        </div>
        <div v-else-if="detailType === 'audio'" class="audio-preview">
          <div class="audio-visual">
            <font-awesome-icon
              :icon="['fas', 'headphones']"
            ></font-awesome-icon>
          </div>
          <audio
            v-if="detailResource?.file?.url"
            ref="audioRef"
            :src="detailResource.file.url"
            controls
            class="audio-player"
          ></audio>
        </div>
        <video
          v-else-if="detailType === 'video' && detailResource?.file?.url"
          :src="detailResource.file.url"
          controls
          class="detail-video"
        ></video>
        <img
          v-else-if="detailPreviewUrl"
          :src="detailPreviewUrl"
          :alt="detailResource?.name || ''"
          class="detail-image"
        />
      </template>
    </DetailPanel>
  </div>
</template>

<script setup lang="ts">
import type { CardInfo, DataInput, DataOutput } from "@/utils/types";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getAudio,
  getParticle,
  getPicture,
  getPolygen,
  getResources,
  getVideo,
  getVoxel,
} from "@/api/v1/resources";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
  getVideoCover,
} from "@/utils/utilityFunctions";
import { sortByNameWithPinyin } from "@/utils/nameSort";
import { DetailPanel, PageActionBar, StandardCard } from "@/components/StandardPage";
import type { ResourceInfo } from "@/api/v1/resources/model";
import PolygenView from "@/components/PolygenView.vue";
import { printVector2, printVector3 } from "@/assets/js/helper";

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
const selectedIds = ref<number[]>([]);
const singleSelectedId = ref<number>();
const dialogVisible = ref(false);
const type = ref("polygen");
const metaId = ref<number | null>(null);
const value = ref<unknown>(null);
const mode = ref<"normal" | "replace">("normal");
const jumpPage = ref("1");
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailResource = ref<ResourceInfo | null>(null);
const detailSourceItem = ref<CardInfo | null>(null);
const modelProgress = ref(0);
const hasAnimations = ref(false);
const audioRef = ref<HTMLAudioElement | null>(null);

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
  return item.name ?? "title";
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

const detailType = computed(() => detailResource.value?.type || detailSourceItem.value?.type || "");

const detailTitle = computed(() => t("ui.resourceDetail"));

const detailPlaceholderIcon = computed(() => getTypeIcon(detailType.value));

type Vector2 = { x: number; y: number };
type Vector3 = { x: number; y: number; z: number };
type DetailInfo = { size?: Vector2 | Vector3; faces?: number; length?: number };

const parseDetailInfo = (raw?: string | null): DetailInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as DetailInfo;
    }
  } catch {}
  return null;
};

const detailTypeLabel = computed(() => {
  switch (detailType.value) {
    case "polygen":
      return t("polygen.typeName");
    case "picture":
      return t("route.resourceManagement.pictureManagement.title");
    case "video":
      return t("video.typeName");
    case "audio":
      return t("route.resourceManagement.audioManagement.title");
    case "voxel":
      return "Voxel";
    case "particle":
      return "Particle";
    default:
      return detailType.value || "-";
  }
});

const detailPreviewUrl = computed(() => {
  if (!detailResource.value) return "";
  if (detailType.value === "video") {
    return getVideoCover(detailResource.value.image?.url || detailResource.value.file?.url);
  }
  return detailResource.value.image?.url || detailResource.value.file?.url || "";
});

const detailProperties = computed(() => {
  if (!detailResource.value) return [];
  const info = parseDetailInfo(detailResource.value.info);
  const props: Array<{ label: string; value: string | number }> = [
    { label: t("ui.type"), value: detailTypeLabel.value },
    { label: t("ui.size"), value: formatSize(detailResource.value.file?.size || 0) },
    {
      label: t("ui.createdAt"),
      value: detailResource.value.created_at
        ? convertToLocalTime(detailResource.value.created_at)
        : "-",
    },
  ];

  if (detailType.value === "polygen") {
    if (info?.size) {
      props.push({
        label: t("ui.dimensions"),
        value: printVector3(info.size as Vector3) + " (m)",
      });
    }
    if (info?.faces) {
      props.push({
        label: t("ui.modelFaces"),
        value: Number(info.faces).toLocaleString(),
      });
    }
  }

  if (detailType.value === "picture" || detailType.value === "video") {
    if (info?.size) {
      props.push({
        label: t("ui.resolution"),
        value: printVector2(info.size as Vector2),
      });
    }
  }

  if ((detailType.value === "video" || detailType.value === "audio") && info?.length) {
    props.push({
      label: t("ui.duration"),
      value: Number(info.length).toFixed(2) + "s",
    });
  }

  return props;
});

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
  jumpPage.value = "1";

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
  detailVisible.value = false;
  handleDetailClose();
  dialogVisible.value = false;
};

const handleViewInfo = (item: CardInfo) => {
  detailSourceItem.value = item;
  detailVisible.value = true;
  detailLoading.value = true;
  modelProgress.value = 0;
  hasAnimations.value = false;

  const id = item.id;
  const type = item.type;

  const fetchMap: Record<string, () => Promise<{ data: ResourceInfo }>> = {
    polygen: () => getPolygen(id) as Promise<{ data: ResourceInfo }>,
    picture: () => getPicture(id),
    video: () => getVideo(id),
    audio: () => getAudio(id),
    voxel: () => getVoxel(id) as Promise<{ data: ResourceInfo }>,
    particle: () => getParticle(id),
  };

  const fetcher = fetchMap[type ?? ""];
  if (!fetcher) {
    detailResource.value = item.context as ResourceInfo;
    detailLoading.value = false;
    return;
  }

  fetcher()
    .then((res) => {
      detailResource.value = res.data;
    })
    .catch(() => {
      detailResource.value = item.context as ResourceInfo;
    })
    .finally(() => {
      detailLoading.value = false;
    });
};

const handlePutFromDetail = () => {
  const item = detailSourceItem.value;
  if (!item) return;
  detailVisible.value = false;
  handleDetailClose();
  if (mode.value === "replace") {
    doReplace(item);
  } else {
    doSelect(item);
  }
};

const handleDetailClose = () => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
  detailResource.value = null;
  detailSourceItem.value = null;
  detailLoading.value = false;
  modelProgress.value = 0;
  hasAnimations.value = false;
};

const handleModelLoaded = (info: {
  size: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  anim?: { name: string; length: number }[];
}) => {
  modelProgress.value = 100;
  hasAnimations.value = !!(info.anim && info.anim.length > 0);
};

const handleModelProgress = (progress: number) => {
  modelProgress.value = progress;
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
          name: item.name ?? "", // 使用 name
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
      const sortedItems = sortByNameWithPinyin(
        items,
        sorted.value,
        (item) => String(item.name ?? "")
      );
      resolve({ items: sortedItems, pagination });
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

watch(
  () => active.value.pagination.current,
  (page) => {
    jumpPage.value = String(page || 1);
  }
);

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
  detailVisible.value = false;
  handleDetailClose();
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
  detailVisible.value = false;
  handleDetailClose();
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
    detailVisible.value = false;
    handleDetailClose();
    dialogVisible.value = false;
  } catch {
    selectedIds.value = [];
  }
}

function handleCurrentChange(page: number) {
  active.value.pagination.current = page;
  refresh();
}

function applyJumpPage() {
  const target = Number.parseInt(jumpPage.value, 10);
  if (Number.isNaN(target)) {
    jumpPage.value = String(active.value.pagination.current || 1);
    return;
  }
  const maxPage = active.value.pagination.count || 1;
  const nextPage = Math.min(Math.max(target, 1), maxPage);
  if (nextPage === active.value.pagination.current) {
    jumpPage.value = String(nextPage);
    return;
  }
  handleCurrentChange(nextPage);
}

// 对外暴露的方法
defineExpose({
  openIt,
  open,
});
</script>

<style scoped lang="scss">
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0;
}

:deep(.resource-dialog .el-dialog) {
  border-radius: 18px;
}

:deep(.resource-dialog .el-dialog__header) {
  padding: 10px 16px 0;
  border-bottom: none;
}

:deep(.resource-dialog .el-dialog__body) {
  padding: 2px 16px 0;
}

:deep(.resource-dialog .el-dialog__footer) {
  padding: 8px 16px 16px;
}

.dialog-action-bar {
  :deep(.page-action-bar) {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
  }

  :deep(.title-row) {
    padding: 8px 0 12px;
  }

  :deep(.controls-row) {
    padding: 8px 0 8px;
  }
  :deep(.controls-right) {
    gap: 8px;
  }
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 0.96fr));
  gap: var(--resource-dialog-grid-gap, 26px);
  max-height: 67vh;
  overflow: auto;
  padding: 0
    var(--resource-dialog-grid-padding-x, 20px)
    var(--resource-dialog-grid-padding-bottom, 6px)
    var(--resource-dialog-grid-padding-x, 20px);
  justify-content: space-between;
}

.resource-list-shell {
  border: none !important;
  background: transparent !important;
  margin-top: var(--resource-dialog-shell-offset-top, -6px);

  :deep(.el-card__body) {
    border: none !important;
    background: transparent !important;
  }

  :deep(.standard-card) {
    border: 1px solid
      var(--resource-dialog-card-border-color, var(--border-color, #e2e8f0));
    box-shadow: var(--resource-dialog-card-shadow, none);
  }

  :deep(.standard-card:hover) {
    border-color: var(
      --resource-dialog-card-hover-border-color,
      var(--border-color-hover, #cbd5e1)
    );
    box-shadow: var(
      --resource-dialog-card-hover-shadow,
      0 6px 16px rgba(15, 23, 42, 0.08)
    );
    transform: translateY(-2px);
  }

  :deep(.standard-card.is-selected) {
    border-color: var(--resource-dialog-card-selected-border-color, var(--primary-color));
    box-shadow: var(
      --resource-dialog-card-selected-shadow,
      0 0 0 2px var(--primary-light)
    );
  }
}

.resource-item {
  min-width: 0;

  &.disabled {
    opacity: 0.55;
  }
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  padding-top: 10px;

  :deep(.el-button) {
    min-width: 76px;
    height: 30px;
    padding: 0 14px;
    margin: 0;
    border-radius: 999px;
    font-size: 13px;
  }
}

.pagination-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.dialog-footer {
  margin-top: 0;
}

@media (max-width: 1680px) {
  .resource-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 1360px) {
  .resource-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.goto-label {
  color: var(--text-secondary, #64748b);
  font-size: 14px;
}

.goto-input {
  width: 64px;
}

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-video {
  width: 100%;
  height: 100%;
}

.info-container {
  margin-top: 8px;
}

/* These styles target teleported DOM (DetailPanel) */
:global(.panel-preview:has(.polygen-preview)) {
  aspect-ratio: unset !important;
  overflow: visible !important;
}

:global(.polygen-preview) {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  overflow: visible;
}

:global(.polygen-preview .box-card) {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

:global(.polygen-preview .box-card .el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: transparent !important;
}

:global(.polygen-preview .box-card #three) {
  flex: 1;
  min-height: 300px;
  border-radius: var(--radius-lg, 16px);
  background: transparent !important;
}

.model-progress {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
}

.audio-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
}

.audio-visual {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(
    --resource-dialog-audio-visual-bg,
    linear-gradient(135deg, var(--primary-color), var(--primary-dark))
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(
    --resource-dialog-audio-visual-shadow,
    0 8px 32px var(--primary-light)
  );

  .svg-inline--fa {
    font-size: 56px;
    color: var(--resource-dialog-audio-icon-color, var(--text-inverse, #fff));
  }
}

.audio-player {
  width: 100%;
  max-width: 320px;
  height: 48px;
  border-radius: var(--radius-md, 12px);

  &::-webkit-media-controls-panel {
    background: var(--bg-hover, #f1f5f9);
  }
}
</style>
