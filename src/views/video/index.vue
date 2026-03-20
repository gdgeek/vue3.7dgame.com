<template>
  <TransitionWrapper>
    <div class="video-index">
      <PageActionBar
        :title="t('video.listPageTitle')"
        :show-title="false"
        :search-placeholder="t('video.searchPlaceholder')"
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
            {{ $t("video.uploadVideo") }}
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
            :image="getVideoCover(item.image?.url)"
            :title="item.name || t('ui.unnamed')"
            :meta="{ date: formatItemDate(item.updated_at || item.created_at) }"
            :selected="isSelected(item.id)"
            :selection-mode="hasSelection"
            :type-icon="['fas', 'video']"
            :placeholder-icon="['fas', 'video']"
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
                :src="getVideoCover(item.image.url)"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'video']"></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.name || "—" }}</span>
          </div>
          <div class="col-size">{{ formatFileSize(item.file?.size) }}</div>
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
                  <el-dropdown-item @click="openViewDialog(item.id)">{{
                    $t("video.viewVideo")
                  }}</el-dropdown-item>
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
            :icon="['fas', 'video']"
            :text="t('video.emptyText')"
            :action-text="t('video.uploadVideo')"
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
        dir="video"
        :file-type="fileType"
        display-formats="MP4 (H.264)"
        :max-size="80"
        :title="$t('video.uploadVideo')"
        @save-resource="saveVideo"
        @success="handleUploadSuccess"
      >
      </StandardUploadDialog>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="viewDialogVisible"
        :title="t('video.detailsTitle')"
        :name="currentVideo?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'video']"
        :download-text="t('video.downloadText')"
        :delete-text="t('video.deleteText')"
        @download="handleDownload"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #preview>
          <video
            v-if="currentVideo?.file?.url"
            :src="toHttps(currentVideo.file.url)"
            controls
            class="video-preview"
          ></video>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
// import { ElMessage, ElMessageBox } from "element-plus";
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
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getVideos,
  getVideo,
  putVideo,
  deleteVideo,
  postVideo,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { downloadResource } from "@/utils/downloadHelper";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
  getResourceFormat,
  getVideoCover,
} from "@/utils/utilityFunctions";
import { printVector2 } from "@/assets/js/helper";
import { toHttps } from "@/utils/helper";
import { useResourceScopeFilter } from "@/composables/useResourceScopeFilter";
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";

const { t } = useI18n();

type Vector2 = { x: number; y: number };
type VideoInfo = { size?: Vector2; length?: number };

const parseVideoInfo = (raw?: string | null): VideoInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as VideoInfo;
    }
  } catch {}
  return null;
};

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
  fetchFn: async (params) =>
    await getVideos(
      params.sort,
      params.search,
      params.page,
      Number(params.pageSize) || 24
    ),
  pageSize: 24,
});

const scopeFilter = useResourceScopeFilter("video", 24);

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
  if (!displayItems.value || displayItems.value.length === 0) return;
  selectItems(displayItems.value);
};

const handleCancelSelectAllPage = () => {
  if (!displayItems.value || displayItems.value.length === 0) return;
  deselectItems(displayItems.value);
};

const uploadDialogVisible = ref(false);
const fileType = ref("video/mp4");
const viewDialogVisible = ref(false);
const currentVideoId = ref<number | null>(null);

// Detail panel state
const currentVideo = ref<ResourceInfo | null>(null);
const detailLoading = ref(false);

const detailProperties = computed(() => {
  if (!currentVideo.value) return [];
  const info = parseVideoInfo(currentVideo.value.info);
  const props = [
    {
      label: t("ui.format"),
      value: getResourceFormat(currentVideo.value.file),
    },
    { label: t("ui.size"), value: formatSize(currentVideo.value.file?.size) },
    {
      label: t("ui.createdAt"),
      value: convertToLocalTime(currentVideo.value.created_at),
    },
  ];
  if (info?.size)
    props.push({ label: t("ui.resolution"), value: printVector2(info.size) });
  if (info?.length)
    props.push({
      label: t("ui.duration"),
      value: info.length.toFixed(2) + "s",
    });
  return props;
});

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = async (id: number) => {
  currentVideoId.value = id;
  viewDialogVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getVideo(id);
    currentVideo.value = response.data;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentVideo.value = null;
};

const handleDownload = async () => {
  if (!currentVideo.value) return;
  const fileName = currentVideo.value.file?.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".mp4";
  await downloadResource(
    { name: currentVideo.value.name || "video", file: currentVideo.value.file },
    fileExt,
    t,
    "video.view.download"
  );
};

const handleRename = async (newName: string) => {
  if (!currentVideo.value) return;
  try {
    await putVideo(String(currentVideo.value.id), { name: newName });
    currentVideo.value.name = newName;
    refresh();
    Message.success(t("video.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentVideo.value) return;
  try {
    await MessageBox.confirm(
      t("video.confirm.message1"),
      t("video.confirm.message2"),
      {
        confirmButtonText: t("video.confirm.confirm"),
        cancelButtonText: t("video.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteVideo(String(currentVideo.value.id));
    viewDialogVisible.value = false;
    refresh();
    Message.success(t("video.confirm.success"));
  } catch {
    Message.info(t("video.confirm.info"));
  }
};

const handleUploadSuccess = async () => {
  uploadDialogVisible.value = false;
  refresh();
};

const saveVideo = async (
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
    } = { name, file_id };
    if (info) data.info = info;
    if (image_id) data.image_id = image_id;
    else data.image_id = file_id;
    const response = await postVideo(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    logger.error("Failed to save video:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: number; name?: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("video.prompt.message1"),
      t("video.prompt.message2"),
      {
        confirmButtonText: t("video.prompt.confirm"),
        cancelButtonText: t("video.prompt.cancel"),
        defaultValue: item.name || "",
      }
    )) as { value: string };
    await putVideo(item.id, { name: value });
    refresh();
    Message.success(t("video.prompt.success") + value);
  } catch {
    Message.info(t("video.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: number },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("video.confirm.message1"),
      t("video.confirm.message2"),
      {
        confirmButtonText: t("video.confirm.confirm"),
        cancelButtonText: t("video.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteVideo(item.id);
    refresh();
    Message.success(t("video.confirm.success"));
  } catch {
    Message.info(t("video.confirm.info"));
    resetLoading();
  }
};

const handleBatchDownload = () => {
  const selected = getSelectedItems(displayItems.value || []);
  Message.info(
    t("ui.batchDownloadDev", {
      count: selected.length,
      resource: t("video.resourceName"),
    })
  );
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(displayItems.value || []);
  try {
    await MessageBox.confirm(
      t("ui.batchDeleteConfirm", {
        count: selected.length,
        resource: t("video.resourceName"),
      }),
      t("ui.batchDeleteTitle"),
      {
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );

    for (const item of selected) {
      await deleteVideo(String(item.id));
    }

    clearSelection();
    refresh();
    Message.success(
      t("ui.batchDeleteSuccess", {
        count: selected.length,
        resource: t("video.resourceName"),
      })
    );
  } catch {
    Message.info(t("ui.cancelDelete"));
  }
};

const handleCancelSelection = () => {
  clearSelection();
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};
const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.video-index {
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
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
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

// Video preview in detail panel
.video-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--bg-hover, #000);
  border-radius: var(--radius-lg, 16px);
}
</style>
