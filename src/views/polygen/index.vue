<template>
  <TransitionWrapper>
    <div class="polygen-index">
      <PageActionBar
        :title="t('polygen.listPageTitle')"
        :show-title="false"
        :search-placeholder="t('polygen.searchPlaceholder')"
        :selection-count="selectedCount"
        :is-page-selected="isPageSelected"
        @search="handleSearchWithScope"
        @sort-change="handleSortChangeWithScope"
        @view-change="handleViewChange"
        @batch-download="handleBatchDownload"
        @batch-delete="handleBatchDelete"
        @cancel-selection="handleCancelSelection"
        @select-all-page="handleSelectAllPage"
        @cancel-select-all-page="handleCancelSelectAllPage"
      >
        <template #filters>
          <ResourceScopeFilter
            :mode="scopeFilter.scopeMode.value"
            :scene-id="scopeFilter.selectedSceneId.value"
            :entity-id="scopeFilter.selectedEntityId.value"
            :show-scene-select="scopeFilter.showSceneSelect.value"
            :show-entity-select="scopeFilter.showEntitySelect.value"
            :loading-scenes="scopeFilter.loadingScenes.value"
            :loading-scene-detail="scopeFilter.loadingSceneDetail.value"
            :loading-entity-detail="scopeFilter.loadingEntityDetail.value"
            :scenes="scopeFilter.scenes.value"
            :entities="scopeFilter.entities.value"
            @scene-change="handleSceneChangeWithReset"
            @entity-change="scopeFilter.handleEntityChange"
          ></ResourceScopeFilter>
        </template>
        <template #actions>
          <el-button type="primary" @click="openUploadDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ $t("polygen.uploadPolygen") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        :items="displayItems"
        :view-mode="viewMode"
        :loading="loading"
        :show-empty="!scopeFilter.loadingSceneDetail.value"
        :breakpoints="denseResourceBreakpoints"
        :card-gutter="denseResourceCardGutter"
        @row-click="(item) => openViewDialog(item.id)"
      >
        <template #grid-card="{ item }">
          <StandardCard
            class="polygen-card"
            :image="item.image?.url"
            image-fit="contain"
            :contain-padding="false"
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
                :src="toHttps(item.image.url)"
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
                    t("common.rename")
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
        :current-page="displayCurrentPage"
        :total-pages="displayTotalPages"
        :sticky="true"
        @page-change="handlePageChangeWithScope"
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
            ></polygen-view>
            <div
              v-show="isPreviewHovered && !hasPreviewInteracted"
              class="preview-center-hint"
            >
              <font-awesome-icon :icon="['fas', 'hand']"></font-awesome-icon>
            </div>
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
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
  ResourceScopeFilter,
} from "@/components/StandardPage";
import StandardUploadDialog from "@/components/StandardPage/StandardUploadDialog.vue";
import PolygenView from "@/components/PolygenView.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { postFile } from "@/api/v1/files";
import {
  getPolygens,
  getPolygen,
  putPolygen,
  deletePolygen,
  postPolygen,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { FileType, UploadFileType } from "@/api/user/model";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { downloadResource } from "@/utils/downloadHelper";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
  getResourceFormat,
} from "@/utils/utilityFunctions";
import { toHttps } from "@/utils/helper";
import { useResourceScopeFilter } from "@/composables/useResourceScopeFilter";
import { useFileStore } from "@/store/modules/config";
import { generateModelThumbnailFromUrl } from "@/utils/modelProcessor";
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";

const { t } = useI18n();
const fileStore = useFileStore().store;

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
    return await getPolygens(
      params.sort,
      params.search,
      params.page,
      Number(params.pageSize) || 24
    );
  },
  pageSize: 24,
});

const scopeFilter = useResourceScopeFilter("polygen", 24);

const displayItems = computed<ResourceInfo[]>(() =>
  scopeFilter.isFilterActive.value
    ? scopeFilter.pagedResources.value
    : items.value || []
);

const displayCurrentPage = computed(() =>
  scopeFilter.isFilterActive.value
    ? scopeFilter.localPage.value
    : pagination.current
);

const displayTotalPages = computed(() =>
  scopeFilter.isFilterActive.value
    ? scopeFilter.totalPages.value
    : totalPages.value
);

const handleSearchWithScope = (value: string) => {
  if (scopeFilter.handleScopedSearch(value)) return;
  handleSearch(value);
};

const handleSortChangeWithScope = (value: string) => {
  if (scopeFilter.handleScopedSort(value)) return;
  handleSortChange(value);
};

const handlePageChangeWithScope = (page: number) => {
  if (scopeFilter.handleScopedPageChange(page)) return;
  handlePageChange(page);
};

const handleSceneChangeWithReset = async (sceneId: number | null) => {
  await scopeFilter.handleSceneChange(sceneId);
  clearSelection();
  if (sceneId == null) {
    handleSearch("");
  }
};

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
  if (!displayItems.value || displayItems.value.length === 0) return false;
  return displayItems.value.every((item) => isSelected(item.id));
});

const handleSelectAllPage = () => {
  if (displayItems.value && displayItems.value.length > 0) {
    selectItems(displayItems.value);
    Message.success(
      t("polygen.selectPageSuccess", { count: displayItems.value.length })
    );
  }
};

const handleCancelSelectAllPage = () => {
  if (displayItems.value && displayItems.value.length > 0) {
    deselectItems(displayItems.value);
    Message.success(t("polygen.cancelSelectPageSuccess"));
  }
};

// Dialog state
const uploadDialogVisible = ref(false);
const fileType = ref(".glb");
const viewDialogVisible = ref(false);

// Detail panel state
const currentPolygen = ref<ResourceInfo | null>(null);
const detailLoading = ref(false);
const polygenViewRef = ref<InstanceType<typeof PolygenView> | null>(null);
const isPreviewHovered = ref(false);
const hasPreviewInteracted = ref(false);
const refreshingThumbnail = ref(false);
const refreshedThumbnailId = ref<number | null>(null);
const loadedModelStats = ref<{ faces?: number; vertices?: number } | null>(
  null
);
const autoRefreshingPageThumbnails = ref(false);
const refreshedPageThumbnailIds = new Set<number>();
const failedPageThumbnailIds = new Set<number>();
let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let autoRefreshCycle = 0;

const formatModelStat = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue.toLocaleString()
    : "—";
};

const detailProperties = computed(() => {
  if (!currentPolygen.value) return [];
  const info = currentPolygen.value.info
    ? JSON.parse(currentPolygen.value.info)
    : null;
  const faces = info?.faces ?? loadedModelStats.value?.faces;
  const vertices = info?.vertices ?? loadedModelStats.value?.vertices;
  return [
    {
      label: t("ui.format"),
      value: getResourceFormat(currentPolygen.value.file),
    },
    {
      label: t("ui.size"),
      value: formatSize(currentPolygen.value.file?.size || 0),
    },
    {
      label: t("ui.createdAt"),
      value: convertToLocalTime(currentPolygen.value.created_at),
    },
    { label: t("ui.modelFaces"), value: formatModelStat(faces) },
    { label: t("ui.modelVertices"), value: formatModelStat(vertices) },
  ];
});

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = async (id: number) => {
  viewDialogVisible.value = true;
  detailLoading.value = true;
  hasAnimations.value = false;
  loadedModelStats.value = null;

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
  hasAnimations.value = false;
  isPreviewHovered.value = false;
  hasPreviewInteracted.value = false;
  refreshingThumbnail.value = false;
  refreshedThumbnailId.value = null;
  loadedModelStats.value = null;
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

const hasLegacyThumbnail = (resource: ResourceInfo | null) => {
  const imageUrl = resource?.image?.url || "";
  return /\.(jpe?g)(\?|$)/i.test(imageUrl);
};

const needsThumbnailRefresh = (resource: ResourceInfo | null) => {
  if (!resource) return false;
  const imageUrl = resource.image?.url || "";
  return !imageUrl || hasLegacyThumbnail(resource);
};

const updateDisplayedThumbnail = (
  resourceId: number,
  image: NonNullable<ResourceInfo["image"]>
) => {
  const updateTarget = (target: ResourceInfo | null) => {
    if (target && target.id === resourceId) {
      target.image = image;
    }
  };

  updateTarget(currentPolygen.value);
  displayItems.value.forEach(updateTarget);
  items.value?.forEach(updateTarget);
};

const uploadThumbnailFile = async (resource: ResourceInfo, file: File) => {
  const extension = ".png";
  const md5 = await fileStore.fileMD5(file);
  const handler = await fileStore.publicHandler();
  const has = await fileStore.fileHas(
    md5,
    extension,
    handler,
    "screenshot/polygen"
  );

  if (!has) {
    await fileStore.fileUpload(
      md5,
      extension,
      file,
      () => {},
      handler,
      "screenshot/polygen"
    );
  }

  const fileData: UploadFileType = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.fileUrl(md5, extension, handler, "screenshot/polygen"),
  };
  const fileResponse = await postFile(fileData);
  await putPolygen(String(resource.id), { image_id: fileResponse.data.id });

  const image: FileType = {
    id: fileResponse.data.id,
    md5: fileData.md5,
    type: file.type || resource.image?.type || "image/png",
    url: fileData.url,
    filename: file.name,
    size: file.size,
    key: fileData.key,
  };
  updateDisplayedThumbnail(resource.id, image);

  return image;
};

const refreshThumbnailForResource = async (resource: ResourceInfo) => {
  const detail = (await getPolygen(resource.id)) as { data: ResourceInfo };
  const fileUrl = detail.data.file?.url;

  if (!fileUrl) return false;

  const thumbnailFile = await generateModelThumbnailFromUrl(
    fileUrl,
    `${resource.name || "model"}.glb`
  );

  await uploadThumbnailFile(resource, thumbnailFile);
  return true;
};

const refreshCurrentThumbnail = async () => {
  const resource = currentPolygen.value;
  if (
    !resource ||
    refreshingThumbnail.value ||
    refreshedThumbnailId.value === resource.id ||
    !needsThumbnailRefresh(resource)
  ) {
    return;
  }

  try {
    refreshingThumbnail.value = true;
    const blob = await polygenViewRef.value?.screenshot();
    if (!blob) return;

    const file = new File([blob], `${resource.name || "model"}.png`, {
      type: "image/png",
      lastModified: Date.now(),
    });
    const image = await uploadThumbnailFile(resource, file);

    refreshedThumbnailId.value = resource.id;
    currentPolygen.value = { ...resource, image };
  } catch (error) {
    logger.error("Failed to refresh polygen thumbnail", error);
  } finally {
    refreshingThumbnail.value = false;
  }
};

const runAutoRefreshForCurrentPage = async (cycle: number) => {
  if (autoRefreshingPageThumbnails.value) return;

  autoRefreshingPageThumbnails.value = true;
  try {
    while (cycle === autoRefreshCycle) {
      const nextResource = displayItems.value.find(
        (item) =>
          needsThumbnailRefresh(item) &&
          !refreshedPageThumbnailIds.has(item.id) &&
          !failedPageThumbnailIds.has(item.id)
      );

      if (!nextResource) break;

      try {
        const refreshed = await refreshThumbnailForResource(nextResource);
        if (refreshed) {
          refreshedPageThumbnailIds.add(nextResource.id);
        } else {
          failedPageThumbnailIds.add(nextResource.id);
        }
      } catch (error) {
        failedPageThumbnailIds.add(nextResource.id);
        logger.error(
          "Failed to auto refresh polygen thumbnail",
          nextResource.id,
          error
        );
      }
    }
  } finally {
    autoRefreshingPageThumbnails.value = false;
    if (cycle !== autoRefreshCycle) {
      scheduleAutoRefreshForCurrentPage();
    }
  }
};

const scheduleAutoRefreshForCurrentPage = () => {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
  }

  autoRefreshTimer = setTimeout(() => {
    autoRefreshTimer = null;
    if (
      loading.value ||
      scopeFilter.loadingSceneDetail.value ||
      scopeFilter.loadingEntityDetail.value ||
      viewDialogVisible.value
    ) {
      return;
    }
    void runAutoRefreshForCurrentPage(autoRefreshCycle);
  }, 180);
};

const handleModelLoaded = (info: {
  size: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  faces?: number;
  vertices?: number;
  anim?: { name: string; length: number }[];
}) => {
  const hasAnimationsFromLoaded = !!(info.anim && info.anim.length > 0);
  hasAnimations.value = hasAnimations.value || hasAnimationsFromLoaded;
  loadedModelStats.value = {
    faces: info.faces,
    vertices: info.vertices,
  };

  void refreshCurrentThumbnail();
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
  const selected = getSelectedItems(displayItems.value || []);
  Message.info(
    t("ui.batchDownloadDev", {
      count: selected.length,
      resource: t("polygen.resourceName"),
    })
  );
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(displayItems.value || []);
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

watch(
  () =>
    displayItems.value
      .map((item) => `${item.id}:${item.image?.url || "none"}`)
      .join("|"),
  () => {
    autoRefreshCycle += 1;
    scheduleAutoRefreshForCurrentPage();
  },
  { immediate: true }
);

watch(
  [
    loading,
    () => scopeFilter.loadingSceneDetail.value,
    () => scopeFilter.loadingEntityDetail.value,
    viewDialogVisible,
  ],
  ([isLoading, isSceneLoading, isEntityLoading, isDialogVisible]) => {
    if (isLoading || isSceneLoading || isEntityLoading || isDialogVisible) {
      return;
    }
    autoRefreshCycle += 1;
    scheduleAutoRefreshForCurrentPage();
  }
);

onBeforeUnmount(() => {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
  }
});
</script>

<style scoped lang="scss">
.polygen-index {
  padding: 12px;
}

// List view styles - using CSS variables for theme compatibility
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
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.col-size,
.col-date {
  flex-shrink: 0;
  width: 100px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-date {
  width: 120px;
}

.col-actions {
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}

.item-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  overflow: hidden;
  background: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
  transition: transform var(--transition-fast, 0.15s ease);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 24px;
  }
}

:deep(.polygen-card .thumbnail-inner),
:deep(.polygen-card .thumbnail-placeholder) {
  background: transparent;
}

.item-name {
  overflow: hidden;
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  padding: 6px;
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--radius-sm, 12px);
  opacity: 0.6;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--text-primary, #1e293b);
    background: var(--bg-active, #e2e8f0);
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: visible;
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);

  &.has-animations {
    .box-card #three {
      border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
    }
  }

  .box-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;

    .el-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 0;
      background: transparent !important;
    }

    #three {
      flex: 1;
      height: 100%;
      min-height: 0;
      background: transparent !important;
      border-radius: var(--radius-lg, 16px);
    }

    .animation-bar {
      flex-shrink: 0;
      border-radius: 0 0 var(--radius-lg, 16px) var(--radius-lg, 16px);
    }
  }
}

.panel-preview > .preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted, #94a3b8);
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);

  .svg-inline--fa {
    font-size: 48px;
  }
}

.preview-center-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 11px;
  color: #fff;
  pointer-events: none;
  background: rgb(30 41 59 / 45%);
  backdrop-filter: blur(6px);
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
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
    box-shadow: 0 0 0 0 rgb(255 255 255 / 35%);
  }

  70% {
    box-shadow: 0 0 0 12px rgb(255 255 255 / 0%);
  }
}
</style>
