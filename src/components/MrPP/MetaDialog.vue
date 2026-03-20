<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      class="resource-dialog meta-dialog"
      width="90%"
      top="2vh"
      :show-close="false"
      append-to-body
      @close="cancel"
    >
      <template #header>
        <div class="dialog-header">
          <PageActionBar
            class="dialog-action-bar"
            :title="$t('verse.view.metaDialog.title')"
            :search-placeholder="$t('ui.search')"
            :show-view-toggle="true"
            :default-sort="active.sorted"
            @search="search"
            @sort-change="sort"
            @view-change="handleViewChange"
          >
            <template #actions>
              <el-button
                v-if="selectedIds.length > 0"
                type="primary"
                @click="putSelected"
              >
                {{ $t("verse.view.metaDialog.putAllIn") }}
              </el-button>
              <el-button
                v-if="!isPageSelected"
                :disabled="active.items.length === 0"
                @click="selectAllCurrentPage"
              >
                {{ $t("ui.selectAllPage") }}
              </el-button>
              <el-button
                v-else
                :disabled="active.items.length === 0"
                @click="clearCurrentPageSelection"
              >
                {{ $t("ui.cancelSelectAll") }}
              </el-button>
              <el-button type="primary" @click="create">
                {{ $t("verse.view.metaDialog.create") }}
              </el-button>
              <el-button @click="dialogVisible = false">
                {{ $t("verse.view.metaDialog.cancel") }}
              </el-button>
            </template>
          </PageActionBar>
        </div>
      </template>

      <el-card
        v-loading="loading"
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
            <div class="resource-item">
              <StandardCard
                :image="item.image?.url || ''"
                :title="title(item)"
                :meta="{
                  date: item.created_at
                    ? convertToLocalTime(item.created_at)
                    : '',
                }"
                :selected="isSelected(item)"
                :selection-mode="true"
                :show-checkbox="true"
                :type-icon="['fas', 'puzzle-piece']"
                :placeholder-icon="['fas', 'puzzle-piece']"
                @select="() => toggleSelection(item)"
                @view="() => handleViewInfo(item)"
              ></StandardCard>
              <div class="card-actions">
                <el-button size="small" @click="toggleSelection(item)">
                  {{
                    isSelected(item)
                      ? $t("verse.view.metaDialog.cancelSelect")
                      : $t("verse.view.metaDialog.select")
                  }}
                </el-button>
                <el-button size="small" type="primary" @click="putSingle(item)">
                  {{ $t("verse.view.metaDialog.putIn") }}
                </el-button>
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
                :model-value="isSelected(item)"
                @change="() => toggleSelection(item)"
              ></el-checkbox>
            </div>
            <div class="col-name">
              <div class="item-thumb" @click.stop="handleViewInfo(item)">
                <img
                  v-if="item.image?.url"
                  :src="item.image.url"
                  :alt="title(item)"
                />
                <div v-else class="thumb-placeholder">
                  <font-awesome-icon
                    :icon="['fas', 'puzzle-piece']"
                  ></font-awesome-icon>
                </div>
              </div>
              <span class="item-name" :title="title(item)">
                {{ title(item) }}
              </span>
            </div>
            <div class="col-date">
              {{ item.created_at ? convertToLocalTime(item.created_at) : "-" }}
            </div>
            <div class="col-actions" @click.stop>
              <div class="list-actions">
                <el-button size="small" @click="toggleSelection(item)">
                  {{
                    isSelected(item)
                      ? $t("verse.view.metaDialog.cancelSelect")
                      : $t("verse.view.metaDialog.select")
                  }}
                </el-button>
                <el-button size="small" type="primary" @click="putSingle(item)">
                  {{ $t("verse.view.metaDialog.putIn") }}
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
      :title="$t('meta.list.detailTitle')"
      :name="detailMetaTitle"
      :loading="detailLoading"
      :editable="false"
      :show-delete="false"
      :secondary-action="false"
      :z-index="6000"
      width="520px"
      :properties="detailProperties"
      :placeholder-icon="['fas', 'puzzle-piece']"
      :download-text="$t('verse.view.metaDialog.putIn')"
      :download-icon="['fas', 'plus']"
      @download="putFromDetail"
      @close="handleDetailClose"
    >
      <template #preview>
        <img
          v-if="detailMeta?.image?.url"
          :src="detailMeta.image.url"
          :alt="detailMetaTitle"
          class="detail-image"
        />
        <div v-else class="detail-preview-placeholder">
          <font-awesome-icon
            :icon="['fas', 'puzzle-piece']"
          ></font-awesome-icon>
        </div>
      </template>
      <template #info>
        <SignalInfoPanel
          :inputs="eventInputs"
          :outputs="eventOutputs"
        ></SignalInfoPanel>
      </template>
    </DetailPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { ElMessage, ElMessageBox } from "element-plus";
import { getMeta, getMetas, metaInfo, postMeta } from "@/api/v1/meta";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import {
  DetailPanel,
  PageActionBar,
  PagePagination,
  StandardCard,
  ViewContainer,
} from "@/components/StandardPage";
import SignalInfoPanel from "@/components/Meta/SignalInfoPanel.vue";
import { useDialogList } from "@/composables/useDialogList";
import type { ViewMode } from "@/components/StandardPage/types";

const emit = defineEmits(["selected", "cancel"]);

const { t } = useI18n();
const metaCache = new Map<
  string,
  { data: metaInfo[]; headers?: Record<string, unknown> }
>();
const selectedIds = ref<number[]>([]);
const viewMode = ref<ViewMode>("grid");
const selectedMetaMap = new Map<number, metaInfo>();
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailMeta = ref<metaInfo | null>(null);
const detailSourceItem = ref<metaInfo | null>(null);

const {
  dialogVisible,
  loading,
  active,
  sort,
  search,
  handleCurrentChange,
  openDialog,
} = useDialogList<metaInfo>(async (sorted, searched, page) => {
  const key = `${sorted}::${searched}::${page}`;
  const cached = metaCache.get(key);
  if (cached) return cached;

  const response = (await getMetas(
    sorted,
    searched,
    page,
    "image",
    "id,title,name,created_at,image",
    24
  )) as { data: metaInfo[]; headers?: Record<string, unknown> };

  metaCache.set(key, response);
  return response;
});

const title = (item: metaInfo) => {
  return item.title || item.name || "title";
};

const isSelected = (item: metaInfo): boolean => {
  return selectedIds.value.includes(item.id);
};

const toggleSelection = (item: metaInfo) => {
  if (isSelected(item)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id);
    selectedMetaMap.delete(item.id);
    return;
  }
  selectedIds.value = [...selectedIds.value, item.id];
  selectedMetaMap.set(item.id, item);
};

const clearSelection = () => {
  selectedIds.value = [];
  selectedMetaMap.clear();
};

const getResourceCount = (item?: {
  resources?: unknown;
  resource_count?: number;
  resources_count?: number;
}) => {
  if (typeof item?.resource_count === "number") {
    return item.resource_count;
  }
  if (typeof item?.resources_count === "number") {
    return item.resources_count;
  }
  return Array.isArray(item?.resources) ? item.resources.length : 0;
};

type MetaEventItem = { title: string; name: string; type: string };

const normalizeEventList = (value: unknown): MetaEventItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const title = String(record.title ?? record.name ?? `#${index + 1}`);
    const name = String(record.name ?? "");
    const rawType = record.type;
    return {
      title,
      name,
      type: rawType === null || rawType === undefined ? "" : String(rawType),
    };
  });
};

const eventInputs = computed(() =>
  normalizeEventList(detailMeta.value?.events?.inputs)
);
const eventOutputs = computed(() =>
  normalizeEventList(detailMeta.value?.events?.outputs)
);

const detailMetaTitle = computed(() => {
  const item = detailMeta.value || detailSourceItem.value;
  return item?.title || item?.name || t("meta.list.unnamed");
});

const detailProperties = computed(() => {
  const item = detailMeta.value || detailSourceItem.value;
  if (!item) return [];
  return [
    {
      label: t("meta.list.properties.type"),
      value: t("meta.list.properties.entity"),
    },
    {
      label: t("meta.list.properties.author"),
      value: item.author?.nickname || item.author?.username || "—",
    },
    {
      label: t("meta.list.properties.resources"),
      value: getResourceCount(item),
    },
    {
      label: t("ui.createdAt"),
      value: item.created_at ? convertToLocalTime(item.created_at) : "-",
    },
  ];
});

const isPageSelected = computed(() => {
  if (active.value.items.length === 0) return false;
  return active.value.items.every((item) =>
    selectedIds.value.includes(item.id)
  );
});

const handleViewInfo = async (item: metaInfo) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detailSourceItem.value = item;

  try {
    const response = await getMeta(item.id, {
      expand: "image,author,resources",
    });
    detailMeta.value = response.data;
  } catch (err) {
    detailMeta.value = item;
    ElMessage.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handleDetailClose = () => {
  detailMeta.value = null;
  detailSourceItem.value = null;
  detailLoading.value = false;
};

const resolveMetaForSceneInsert = async (item: metaInfo): Promise<metaInfo> => {
  const hasMetaData = item?.data !== undefined && item?.data !== null;
  const hasResources = Array.isArray(item?.resources);
  if (hasMetaData && hasResources) return item;

  try {
    const response = await getMeta(item.id, {
      expand: "resources",
    });
    return response.data;
  } catch {
    return item;
  }
};

const emitSelectedMeta = async (item: metaInfo) => {
  const completeMeta = await resolveMetaForSceneInsert(item);
  emit("selected", {
    data: completeMeta,
    title: completeMeta.title || item.title,
  });
};

const putSingle = async (item: metaInfo) => {
  await emitSelectedMeta(item);
  dialogVisible.value = false;
};

const putSelected = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning(t("verse.view.metaDialog.noItemSelected"));
    return;
  }

  for (const id of selectedIds.value) {
    const selectedMeta =
      selectedMetaMap.get(id) ||
      active.value.items.find((item) => item.id === id);
    if (selectedMeta) {
      await emitSelectedMeta(selectedMeta);
    }
  }
  dialogVisible.value = false;
};

const selectAllCurrentPage = () => {
  const ids = active.value.items.map((item) => item.id);
  selectedIds.value = Array.from(new Set([...selectedIds.value, ...ids]));
  for (const item of active.value.items) {
    selectedMetaMap.set(item.id, item);
  }
};

const clearCurrentPageSelection = () => {
  const pageIdSet = new Set(active.value.items.map((item) => item.id));
  selectedIds.value = selectedIds.value.filter((id) => !pageIdSet.has(id));
  for (const item of active.value.items) {
    selectedMetaMap.delete(item.id);
  }
};

const handleViewChange = (mode: ViewMode) => {
  viewMode.value = mode;
};

const handleRowClick = (item: metaInfo) => {
  handleViewInfo(item);
};

const putFromDetail = () => {
  const target = detailMeta.value || detailSourceItem.value;
  if (!target) return;
  putSingle(target);
};

const open = async (_newValue?: unknown, _newVerseId?: number) => {
  clearSelection();
  detailVisible.value = false;
  handleDetailClose();
  await openDialog();
};

const input = async (text: string): Promise<string> => {
  try {
    const { value } = (await ElMessageBox.prompt(
      text,
      t("verse.view.metaDialog.prompt.message"),
      {
        confirmButtonText: t("verse.view.metaDialog.prompt.confirm"),
        cancelButtonText: t("verse.view.metaDialog.prompt.cancel"),
      }
    )) as { value: string };
    return value;
  } catch {
    ElMessage.info(t("verse.view.metaDialog.prompt.info"));
    throw new Error("User cancelled input");
  }
};

const create = async () => {
  const name = await input(t("verse.view.metaDialog.input2"));
  const response = await postMeta({
    title: name || "新建实体",
    custom: true,
    uuid: uuidv4(),
  });
  metaCache.clear();
  putSingle(response.data);
};

const cancel = () => {
  clearSelection();
  detailVisible.value = false;
  handleDetailClose();
  emit("cancel");
};

defineExpose({
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
  width: 220px;
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
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  object-fit: cover;
}

.detail-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-secondary, #94a3b8);
  background: var(--bg-secondary, #f1f5f9);

  .svg-inline--fa {
    font-size: 64px;
  }
}
</style>
