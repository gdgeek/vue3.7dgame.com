<template>
  <TransitionWrapper>
    <div class="polygen-index">
      <PageActionBar
        :title="t('polygen.listPageTitle')"
        :search-placeholder="t('polygen.searchPlaceholder')"
        :selection-count="selectedCount"
        :is-page-selected="isPageSelected"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
        @batch-download="handleBatchDownload"
        @batch-delete="handleBatchDelete"
        @cancel-selection="handleCancelSelection"
        @select-all-page="handleSelectAllPage"
        @cancel-select-all-page="handleCancelSelectAllPage"
      >
        <template #actions>
          <el-button type="primary" @click="openUploadDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("polygen.uploadPolygen") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        @row-click="(item) => openViewDialog(item.id)"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.name || t('ui.unnamed')"
            :meta="{ date: formatItemDate(item.updated_at || item.created_at) }"
            :selected="isSelected(item.id)"
            :selection-mode="hasSelection"
            :type-icon="['fas', 'cube']"
            :placeholder-icon="['fas', 'cube']"
            @view="openViewDialog(item.id)"
            @select="() => toggleSelection(item.id)"
          ></StandardCard>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox" @click.stop>
            <el-checkbox
              :model-value="isSelected(item.id)"
              @change="() => toggleSelection(item.id)"
            ></el-checkbox>
          </div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'cube']"></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.name || "—" }}</span>
          </div>
          <div class="col-size">{{ formatSize(item.file?.size || 0) }}</div>
          <div class="col-date">
            {{ formatItemDate(item.updated_at || item.created_at) }}
          </div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openViewDialog(item.id)">
                    {{ $t("polygen.viewPolygen") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("common.edit")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => {})">{{
                    t("common.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'cube']"
            :text="t('polygen.emptyText')"
            :action-text="t('polygen.uploadPolygen')"
            @action="openUploadDialog"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Dialogs -->
      <!-- Dialogs -->
      <StandardUploadDialog
        v-model="uploadDialogVisible"
        dir="polygen"
        :file-type="fileType"
        :max-size="30"
        :title="$t('polygen.uploadPolygen')"
        @save-resource="savePolygen"
        @success="handleUploadSuccess"
      >
      </StandardUploadDialog>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="viewDialogVisible"
        :title="t('polygen.detailsTitle')"
        :name="currentPolygen?.name || ''"
        :loading="detailLoading"
        preview-height="360px"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'cube']"
        :download-text="t('polygen.downloadText')"
        :delete-text="t('polygen.deleteText')"
        @download="handleDownload"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #preview>
          <div
            v-if="currentPolygen"
            class="polygen-preview"
            :class="{ 'has-animations': hasAnimations }"
            @mouseenter="isPreviewHovered = true"
            @mouseleave="isPreviewHovered = false"
            @pointerdown.capture="handlePreviewInteracted"
            @wheel.capture.passive="handlePreviewInteracted"
            @touchstart.capture.passive="handlePreviewInteracted"
          >
            <polygen-view
              ref="polygenViewRef"
              :key="currentPolygen.id"
              :file="currentPolygen.file"
              :has-animations="hasAnimations"
              @loaded="handleModelLoaded"
              @progress="handleModelProgress"
            ></polygen-view>
            <div
              v-show="isPreviewHovered && !hasPreviewInteracted"
              class="preview-center-hint"
            >
              <font-awesome-icon :icon="['fas', 'hand']"></font-awesome-icon>
            </div>
            <el-progress
              v-if="modelProgress < 100"
              :percentage="modelProgress"
              :stroke-width="4"
              class="model-progress"
            ></el-progress>
          </div>
          <div v-else class="preview-placeholder">
            <font-awesome-icon :icon="['fas', 'cube']"></font-awesome-icon>
          </div>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import StandardUploadDialog from "@/components/StandardPage/StandardUploadDialog.vue";
import PolygenView from "@/components/PolygenView.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getPolygens,
  getPolygen,
  putPolygen,
  deletePolygen,
  postPolygen,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { downloadResource } from "@/utils/downloadHelper";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
} from "@/utils/utilityFunctions";
import { printVector3 } from "@/assets/js/helper";

const { t } = useI18n();

// Standard page data
const {
  items,
  loading,
  pagination,
  viewMode,
  totalPages,
  refresh,
  handleSearch,
  handleSortChange,
  handlePageChange,
  handleViewChange,
} = usePageData<ResourceInfo>({
  fetchFn: async (params) => {
    return await getPolygens(params.sort, params.search, params.page);
  },
});

const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelection,
  clearSelection,
  getSelectedItems,
  selectItems,
  deselectItems,
} = useSelection();

const isPageSelected = computed(() => {
  if (!items.value || items.value.length === 0) return false;
  return items.value.every((item) => isSelected(item.id));
});

const handleSelectAllPage = () => {
  if (items.value && items.value.length > 0) {
    selectItems(items.value);
    Message.success(
      t("polygen.selectPageSuccess", { count: items.value.length })
    );
  }
};

const handleCancelSelectAllPage = () => {
  if (items.value && items.value.length > 0) {
    deselectItems(items.value);
    Message.success(t("polygen.cancelSelectPageSuccess"));
  }
};

// Dialog state
const uploadDialogVisible = ref(false);
const fileType = ref(".glb, .gltf, .obj, .fbx");
const viewDialogVisible = ref(false);

// Detail panel state
const currentPolygen = ref<ResourceInfo | null>(null);
const detailLoading = ref(false);
const modelProgress = ref(0);
const polygenViewRef = ref<InstanceType<typeof PolygenView> | null>(null);
const isPreviewHovered = ref(false);
const hasPreviewInteracted = ref(false);

const detailProperties = computed(() => {
  if (!currentPolygen.value) return [];
  const info = currentPolygen.value.info
    ? JSON.parse(currentPolygen.value.info)
    : null;
  return [
    { label: t("ui.type"), value: t("polygen.typeName") },
    {
      label: t("ui.size"),
      value: formatSize(currentPolygen.value.file?.size || 0),
    },
    {
      label: t("ui.createdAt"),
      value: convertToLocalTime(currentPolygen.value.created_at),
    },
    ...(info?.size
      ? [{ label: t("ui.dimensions"), value: printVector3(info.size) + " (m)" }]
      : []),
    ...(info?.faces
      ? [{ label: t("ui.modelFaces"), value: info.faces.toLocaleString() }]
      : []),
  ];
});

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = async (id: number) => {
  viewDialogVisible.value = true;
  detailLoading.value = true;
  modelProgress.value = 0;
  hasAnimations.value = false;

  try {
    const response = (await getPolygen(id)) as { data: ResourceInfo };
    currentPolygen.value = response.data;
    hasAnimations.value = hasAnimationsFromResourceInfo(response.data);
    hasPreviewInteracted.value = false;
    isPreviewHovered.value = false;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentPolygen.value = null;
  modelProgress.value = 0;
  hasAnimations.value = false;
  isPreviewHovered.value = false;
  hasPreviewInteracted.value = false;
};

const hasAnimations = ref(false);

const hasAnimationsFromResourceInfo = (resource: ResourceInfo | null) => {
  if (!resource?.info) return false;
  try {
    const parsed = JSON.parse(resource.info) as {
      anim?: unknown;
      animations?: unknown;
    };
    return (
      (Array.isArray(parsed.anim) && parsed.anim.length > 0) ||
      (Array.isArray(parsed.animations) && parsed.animations.length > 0)
    );
  } catch {
    return false;
  }
};

const handleModelLoaded = (info: {
  size: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  anim?: { name: string; length: number }[];
}) => {
  modelProgress.value = 100;
  const hasAnimationsFromLoaded = !!(info.anim && info.anim.length > 0);
  hasAnimations.value = hasAnimations.value || hasAnimationsFromLoaded;
};

const handleModelProgress = (progress: number) => {
  modelProgress.value = progress;
};

const handlePreviewInteracted = () => {
  hasPreviewInteracted.value = true;
};

const handleDownload = async () => {
  if (currentPolygen.value) {
    const resource = {
      ...currentPolygen.value,
      name: currentPolygen.value.name || "model",
    };
    await downloadResource(resource, ".glb", t, "polygen.view.download");
  }
};

const handleRename = async (newName: string) => {
  if (!currentPolygen.value) return;
  try {
    await putPolygen(String(currentPolygen.value.id), { name: newName });
    currentPolygen.value.name = newName;
    refresh();
    Message.success(t("polygen.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentPolygen.value) return;
  try {
    await MessageBox.confirm(
      t("polygen.confirm.message1"),
      t("polygen.confirm.message2"),
      {
        confirmButtonText: t("polygen.confirm.confirm"),
        cancelButtonText: t("polygen.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePolygen(String(currentPolygen.value.id));
    viewDialogVisible.value = false;
    refresh();
    Message.success(t("polygen.confirm.success"));
  } catch {
    Message.info(t("polygen.confirm.info"));
  }
};

const handleUploadSuccess = async (_uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refresh();
};

const savePolygen = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  image_id?: number
) => {
  try {
    const data: {
      name: string;
      file_id: number;
      info?: string;
      image_id?: number;
    } = {
      name,
      file_id,
    };
    if (info) data.info = info;
    if (image_id) data.image_id = image_id;
    const response = await postPolygen(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    logger.error("Failed to save polygen:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: number; name?: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("polygen.prompt.message1"),
      t("polygen.prompt.message2"),
      {
        confirmButtonText: t("polygen.prompt.confirm"),
        cancelButtonText: t("polygen.prompt.cancel"),
        defaultValue: item.name,
      }
    )) as { value: string };
    await putPolygen(item.id, { name: value });
    refresh();
    Message.success(t("polygen.prompt.success") + value);
  } catch {
    Message.info(t("polygen.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: number },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("polygen.confirm.message1"),
      t("polygen.confirm.message2"),
      {
        confirmButtonText: t("polygen.confirm.confirm"),
        cancelButtonText: t("polygen.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePolygen(String(item.id));
    refresh();
    Message.success(t("polygen.confirm.success"));
  } catch {
    Message.info(t("polygen.confirm.info"));
    resetLoading();
  }
};

const handleBatchDownload = () => {
  const selected = getSelectedItems(items.value || []);
  Message.info(
    t("ui.batchDownloadDev", {
      count: selected.length,
      resource: t("polygen.resourceName"),
    })
  );
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(items.value || []);
  try {
    await MessageBox.confirm(
      t("ui.batchDeleteConfirm", {
        count: selected.length,
        resource: t("polygen.resourceName"),
      }),
      t("ui.batchDeleteTitle"),
      {
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );

    for (const item of selected) {
      await deletePolygen(String(item.id));
    }

    clearSelection();
    refresh();
    Message.success(
      t("ui.batchDeleteSuccess", {
        count: selected.length,
        resource: t("polygen.resourceName"),
      })
    );
  } catch {
    Message.info(t("ui.cancelDelete"));
  }
};

const handleCancelSelection = () => {
  clearSelection();
};

// Helpers for list view
const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.polygen-index {
  padding: 20px;
}

// List view styles - using CSS variables for theme compatibility
.col-checkbox {
  width: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-size,
.col-date {
  width: 100px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-date {
  width: 120px;
}

.col-actions {
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

.item-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm, 12px);
  overflow: hidden;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition-fast, 0.15s ease);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 24px;
  }
}

.item-name {
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm, 12px);
  transition: all var(--transition-fast, 0.15s ease);
  opacity: 0.6;

  &:hover {
    background: var(--bg-active, #e2e8f0);
    color: var(--text-primary, #1e293b);
    opacity: 1;
  }
}
</style>

<!-- Unscoped: Override DetailPanel's Teleported .panel-preview for polygen -->
<style lang="scss">
.panel-preview:has(.polygen-preview) {
  aspect-ratio: unset !important;
  overflow: visible !important;
}

// These styles target teleported DOM (via DetailPanel's Teleport to="body")
// and MUST be unscoped to take effect.
.polygen-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  overflow: visible;

  &.has-animations {
    .box-card #three {
      border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
    }
  }

  .box-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    background-color: transparent !important;

    .el-card__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0;
      background: transparent !important;
    }

    #three {
      flex: 1;
      min-height: 0;
      height: 100%;
      border-radius: var(--radius-lg, 16px);
      background: transparent !important;
    }

    .animation-bar {
      flex-shrink: 0;
      border-radius: 0 0 var(--radius-lg, 16px) var(--radius-lg, 16px);
    }
  }
}

.panel-preview > .preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #94a3b8);
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);

  .svg-inline--fa {
    font-size: 48px;
  }
}

.model-progress {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
}

.preview-center-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 11px;
  color: #fff;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(6px);
  pointer-events: none;
  animation:
    preview-hint-float 1.8s ease-in-out infinite,
    preview-hint-pulse 1.8s ease-in-out infinite;
}

@keyframes preview-hint-float {
  0%,
  100% {
    transform: translate(-50%, -50%);
  }
  50% {
    transform: translate(-50%, calc(-50% - 5px));
  }
}

@keyframes preview-hint-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(255, 255, 255, 0);
  }
}
</style>
