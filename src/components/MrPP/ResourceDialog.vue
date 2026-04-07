<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      class="resource-dialog"
      width="90%"
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
            :show-view-toggle="true"
            :show-name-sort="true"
            :default-sort="sorted"
            @search="search"
            @sort-change="sort"
            @view-change="handleViewChange"
          >
            <template #actions>
              <template v-if="mode !== 'replace'">
                <el-button
                  v-if="multiple && selectedIds.length > 0"
                  type="primary"
                  @click="doBatchSelect()"
                >
                  {{ $t("meta.ResourceDialog.putAllIn") }}
                </el-button>
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
        <ViewContainer
          v-if="active.items?.length"
          class="resource-view-container"
          :items="active.items"
          :view-mode="viewMode"
          :show-empty="false"
          :card-gutter="26"
          @row-click="handleRowClick"
        >
          <template #grid-card="{ item }">
            <div class="resource-item" :class="{ disabled: !item.enabled }">
              <div v-loading="!item.enabled">
                <StandardCard
                  :image="getCardPreviewUrl(item)"
                  image-fit="contain"
                  :contain-padding="item.type !== 'polygen'"
                  :contain-scale="item.type === 'polygen' ? 0.88 : 1"
                  :thumbnail-variant="
                    item.type === 'audio' ? 'audio' : 'default'
                  "
                  :title="getItemTitle(item)"
                  :meta="{
                    date: item.created_at
                      ? convertToLocalTime(item.created_at)
                      : '',
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
                    <el-button
                      size="small"
                      type="primary"
                      @click="doSelect(item)"
                    >
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
          </template>

          <template #list-header>
            <div class="col-checkbox"></div>
            <div class="col-name">{{ $t("common.name") }}</div>
            <div class="col-date">{{ $t("ui.createdAt") }}</div>
            <div class="col-actions"></div>
          </template>

          <template #list-item="{ item }">
            <div class="col-checkbox" @click.stop>
              <el-checkbox
                v-if="mode !== 'replace' && multiple"
                :model-value="isSelected(item)"
                :disabled="!item.enabled"
                @change="() => toggleSelection(item)"
              ></el-checkbox>
            </div>
            <div class="col-name">
              <div class="item-thumb" @click.stop="handleViewInfo(item)">
                <div
                  v-if="item.type === 'audio'"
                  class="item-thumb-audio-badge"
                >
                  <font-awesome-icon
                    :icon="['fas', 'headphones']"
                  ></font-awesome-icon>
                </div>
                <img
                  v-else-if="getCardPreviewUrl(item)"
                  :src="getCardPreviewUrl(item)"
                  :alt="getItemTitle(item)"
                />
                <div v-else class="thumb-placeholder">
                  <font-awesome-icon
                    :icon="getTypeIcon(item.type)"
                  ></font-awesome-icon>
                </div>
              </div>
              <span class="item-name" :title="getItemTitle(item)">
                {{ getItemTitle(item) }}
              </span>
            </div>
            <div class="col-date">
              {{ item.created_at ? convertToLocalTime(item.created_at) : "-" }}
            </div>
            <div class="col-actions" @click.stop>
              <div class="list-actions">
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
                  <el-button
                    size="small"
                    type="primary"
                    @click="doSelect(item)"
                  >
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
          </template>
        </ViewContainer>
        <template v-else>
          <el-skeleton></el-skeleton>
        </template>
      </el-card>

      <template #footer>
        <div class="dialog-footer">
          <PagePagination
            :current-page="active.pagination.current"
            :total-pages="active.pagination.count || 1"
            @page-change="handleCurrentChange"
          ></PagePagination>
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
          ></polygen-view>
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
            :src="toHttps(detailResource.file.url)"
            controls
            class="audio-player"
          ></audio>
        </div>
        <video
          v-else-if="detailType === 'video' && detailResource?.file?.url"
          :src="toHttps(detailResource.file.url)"
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
import { computed, ref } from "vue";
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
  getResourceFormat,
  getVideoCover,
} from "@/utils/utilityFunctions";
import { sortByNameWithPinyin } from "@/utils/nameSort";
import {
  DetailPanel,
  PageActionBar,
  PagePagination,
  StandardCard,
  ViewContainer,
} from "@/components/StandardPage";
import type { ResourceInfo } from "@/api/v1/resources/model";
import PolygenView from "@/components/PolygenView.vue";
import { printVector2 } from "@/assets/js/helper";
import { toHttps } from "@/utils/helper";
import { logger } from "@/utils/logger";
import type { ViewMode } from "@/components/StandardPage/types";

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
const viewMode = ref<ViewMode>("grid");
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailResource = ref<ResourceInfo | null>(null);
const detailSourceItem = ref<CardInfo | null>(null);
const hasAnimations = ref(false);
const audioRef = ref<HTMLAudioElement | null>(null);
const loadedModelStats = ref<{ faces?: number; vertices?: number } | null>(
  null
);

const active = ref<DataOutput>({
  items: [],
  pagination: { current: 1, count: 1, size: 24, total: 24 },
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
      return ["fas", "headphones"];
    case "voxel":
      return ["fas", "cubes"];
    case "particle":
      return ["fas", "wand-magic-sparkles"];
    default:
      return ["fas", "file"];
  }
};

const detailType = computed(
  () => detailResource.value?.type || detailSourceItem.value?.type || ""
);

const detailTitle = computed(() => t("ui.resourceDetail"));

const detailPlaceholderIcon = computed(() => getTypeIcon(detailType.value));

type Vector2 = { x: number; y: number };
type Vector3 = { x: number; y: number; z: number };
type DetailInfo = {
  size?: Vector2 | Vector3;
  faces?: number;
  vertices?: number;
  length?: number;
};

const formatModelStat = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue.toLocaleString()
    : "—";
};

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

const detailPreviewUrl = computed(() => {
  if (!detailResource.value) return "";
  if (detailType.value === "video") {
    return getVideoCover(
      detailResource.value.image?.url || detailResource.value.file?.url
    );
  }
  if (detailType.value === "picture") {
    return toHttps(
      detailResource.value.file?.url || detailResource.value.image?.url || ""
    );
  }
  return (
    detailResource.value.image?.url || detailResource.value.file?.url || ""
  );
});

const getCardPreviewUrl = (item: CardInfo) => {
  if (item.type === "audio") return undefined;
  if (item.type === "picture") {
    const picture = item.context as ResourceInfo;
    return toHttps(picture.file?.url || item.image?.url || "");
  }
  return toHttps(item.image?.url || "");
};

const detailProperties = computed(() => {
  if (!detailResource.value) return [];
  const info = parseDetailInfo(detailResource.value.info);
  const props: Array<{ label: string; value: string | number }> = [
    {
      label: t("ui.format"),
      value: getResourceFormat(detailResource.value.file),
    },
    {
      label: t("ui.size"),
      value: formatSize(detailResource.value.file?.size || 0),
    },
    {
      label: t("ui.createdAt"),
      value: detailResource.value.created_at
        ? convertToLocalTime(detailResource.value.created_at)
        : "-",
    },
  ];

  if (detailType.value === "polygen") {
    const faces = info?.faces ?? loadedModelStats.value?.faces;
    const vertices = info?.vertices ?? loadedModelStats.value?.vertices;
    props.push({
      label: t("ui.modelFaces"),
      value: formatModelStat(faces),
    });
    props.push({
      label: t("ui.modelVertices"),
      value: formatModelStat(vertices),
    });
  }

  if (detailType.value === "picture" || detailType.value === "video") {
    if (info?.size) {
      props.push({
        label: t("ui.resolution"),
        value: printVector2(info.size as Vector2),
      });
    }
  }

  if (
    (detailType.value === "video" || detailType.value === "audio") &&
    info?.length
  ) {
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
    pagination: { current: 1, count: 1, size: 24, total: 24 },
  };

  type.value = newType ?? type.value;
  metaId.value = meta_id ?? null;
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
  detailVisible.value = false;
  handleDetailClose();
  dialogVisible.value = false;
};

const handleViewInfo = (item: CardInfo) => {
  detailSourceItem.value = item;
  detailVisible.value = true;
  detailLoading.value = true;
  hasAnimations.value = false;
  loadedModelStats.value = null;

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
  hasAnimations.value = false;
  loadedModelStats.value = null;
};

const handleModelLoaded = (info: {
  size: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  faces?: number;
  vertices?: number;
  anim?: { name: string; length: number }[];
}) => {
  hasAnimations.value = !!(info.anim && info.anim.length > 0);
  loadedModelStats.value = {
    faces: info.faces,
    vertices: info.vertices,
  };
};

const handleViewChange = (mode: ViewMode) => {
  viewMode.value = mode;
};

const handleRowClick = (item: CardInfo) => {
  handleViewInfo(item);
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
        "image",
        24
      );
      logger.debug("获取数据", response.data);
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
          String(response.headers["x-pagination-per-page"] ?? "24")
        ),
        total: parseInt(
          String(response.headers["x-pagination-total-count"] ?? "0")
        ),
      };
      const sortedItems = sortByNameWithPinyin(items, sorted.value, (item) =>
        String(item.name ?? "")
      );
      resolve({ items: sortedItems, pagination });
    } catch (error) {
      logger.error("获取数据失败", error);
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

// 选择和取消操作
function doSelect(data: CardInfo) {
  emit("selected", data, false);
  detailVisible.value = false;
  handleDetailClose();
  dialogVisible.value = false;
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
  const pageIds = active.value.items
    .filter((item) => item.enabled)
    .map((item) => item.id);
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
  logger.debug("doBatchSelect", selectedIds.value);
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
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: none;
  }

  :deep(.title-row) {
    padding: 8px 0 12px;
  }

  :deep(.controls-row) {
    padding: 8px 0;
  }

  :deep(.controls-right) {
    gap: 8px;
  }
}

.resource-view-container {
  max-height: 67vh;
  padding: 0 var(--resource-dialog-grid-padding-x, 20px)
    var(--resource-dialog-grid-padding-bottom, 6px)
    var(--resource-dialog-grid-padding-x, 20px);
  overflow: auto;
}

.resource-list-shell {
  margin-top: var(--resource-dialog-shell-offset-top, -6px);
  background: transparent !important;
  border: none !important;

  :deep(.el-card__body) {
    background: transparent !important;
    border: none !important;
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
      0 6px 16px rgb(15 23 42 / 8%)
    );
    transform: translateY(-2px);
  }

  :deep(.standard-card.is-selected) {
    border-color: var(
      --resource-dialog-card-selected-border-color,
      var(--primary-color)
    );
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

.col-checkbox {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
}

.col-name {
  display: flex;
  flex: 1;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.col-date {
  flex-shrink: 0;
  width: 180px;
  padding-right: 16px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-actions {
  flex-shrink: 0;
  width: 240px;
}

.item-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  cursor: pointer;
  background: var(--resource-card-thumbnail-bg, #f4f7fa);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.item-thumb-audio-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: linear-gradient(180deg, #1fb8f2 0%, #0999df 100%);
  border-radius: 50%;
  box-shadow: 0 6px 14px rgb(9 153 223 / 22%);

  .svg-inline--fa {
    font-size: 15px;
    color: #fff;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 20px;
  }
}

.item-name {
  overflow: hidden;
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;

  :deep(.el-button) {
    min-width: 72px;
    height: 30px;
    padding: 0 12px;
    margin: 0;
    font-size: 13px;
    border-radius: 999px;
  }
}

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding-top: 10px;

  :deep(.el-button) {
    min-width: 76px;
    height: 30px;
    padding: 0 14px;
    margin: 0;
    font-size: 13px;
    border-radius: 999px;
  }
}

.dialog-footer {
  margin-top: 0;
}

.dialog-footer :deep(.page-pagination) {
  padding: 12px 0 4px;
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: visible;
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
}

:global(.polygen-preview .box-card) {
  display: flex;
  flex: 1;
  flex-direction: column;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:global(.polygen-preview .box-card .el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0;
  background: transparent !important;
}

:global(.polygen-preview .box-card #three) {
  flex: 1;
  min-height: 300px;
  background: transparent !important;
  border-radius: var(--radius-lg, 16px);
}

.audio-preview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
}

.audio-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  background: var(
    --resource-dialog-audio-visual-bg,
    linear-gradient(135deg, var(--primary-color), var(--primary-dark))
  );
  border-radius: 50%;
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
