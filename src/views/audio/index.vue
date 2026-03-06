<template>
  <TransitionWrapper>
    <div class="audio-index">
      <PageActionBar
        :title="t('route.resourceManagement.audioManagement.audioList')"
        :show-title="false"
        :search-placeholder="t('ui.search')"
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
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("audio.uploadAudio") }}
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
            :image="
              item.image?.url ||
              `https://api.dicebear.com/9.x/thumbs/svg?seed=${item.id}`
            "
            :title="item.name || t('ui.unnamed')"
            :meta="{ date: formatItemDate(item.updated_at || item.created_at) }"
            :selected="isSelected(item.id)"
            :selection-mode="hasSelection"
            :type-icon="['fas', 'headphones']"
            :placeholder-icon="['fas', 'headphones']"
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
                :src="
                  item.image?.url ||
                  `https://api.dicebear.com/9.x/thumbs/svg?seed=${item.id}`
                "
                :alt="item.name"
              />
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
                  <el-dropdown-item @click="openViewDialog(item.id)">
                    {{ $t("audio.viewAudio") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("verse.listPage.rename")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => {})">{{
                    t("common.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
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
        dir="audio"
        :file-type="fileType"
        :max-size="5"
        :title="$t('audio.uploadAudio')"
        @save-resource="saveAudio"
        @success="handleUploadSuccess"
      >
      </StandardUploadDialog>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="viewDialogVisible"
        :title="t('audio.viewAudio')"
        :name="currentAudio?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'headphones']"
        :download-text="t('ui.download')"
        :delete-text="t('ui.deleteResource')"
        @download="handleDownload"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #preview>
          <div class="audio-preview">
            <div class="audio-visual">
              <font-awesome-icon
                :icon="['fas', 'headphones']"
              ></font-awesome-icon>
            </div>
            <audio
              v-if="currentAudio?.file?.url"
              ref="audioRef"
              :src="currentAudio.file.url"
              controls
              class="audio-player"
            ></audio>
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
// import { ElMessage, ElMessageBox } from "element-plus";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  StandardCard,
  DetailPanel,
  ResourceScopeFilter,
} from "@/components/StandardPage";
import StandardUploadDialog from "@/components/StandardPage/StandardUploadDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getAudios,
  getAudio,
  putAudio,
  deleteAudio,
  postAudio,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { downloadResource } from "@/utils/downloadHelper";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
} from "@/utils/utilityFunctions";
import { useResourceScopeFilter } from "@/composables/useResourceScopeFilter";
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";

const { t } = useI18n();

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
    await getAudios(
      params.sort,
      params.search,
      params.page,
      Number(params.pageSize) || 24
    ),
  pageSize: 24,
});

const scopeFilter = useResourceScopeFilter("audio", 24);

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
const fileType = ref("audio/mp3, audio/wav");
const viewDialogVisible = ref(false);
const audioRef = ref<HTMLAudioElement | null>(null);

// Detail panel state
const currentAudio = ref<ResourceInfo | null>(null);
const detailLoading = ref(false);

const detailProperties = computed(() => {
  if (!currentAudio.value) return [];
  const info = currentAudio.value.info
    ? JSON.parse(currentAudio.value.info)
    : null;
  const props = [
    {
      label: t("verse.listPage.type"),
      value: t("route.resourceManagement.audioManagement.title"),
    },
    { label: t("ui.size"), value: formatSize(currentAudio.value.file?.size) },
    {
      label: t("verse.listPage.createdTime"),
      value: convertToLocalTime(currentAudio.value.created_at),
    },
  ];
  if (info?.length)
    props.push({
      label: t("video.view.info.item6"),
      value: info.length.toFixed(2) + "s",
    });
  return props;
});

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = async (id: number) => {
  viewDialogVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getAudio(id);
    currentAudio.value = response.data;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
  currentAudio.value = null;
};

const handleDownload = async () => {
  if (!currentAudio.value) return;
  const fileName = currentAudio.value.file?.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".mp3";
  await downloadResource(
    { name: currentAudio.value.name || "audio", file: currentAudio.value.file },
    fileExt,
    t,
    "audio.view.download"
  );
};

const handleRename = async (newName: string) => {
  if (!currentAudio.value) return;
  try {
    await putAudio(String(currentAudio.value.id), { name: newName });
    currentAudio.value.name = newName;
    refresh();
    Message.success(t("audio.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentAudio.value) return;
  try {
    await ElMessageBox.confirm(
      t("audio.confirm.message1"),
      t("audio.confirm.message2"),
      {
        confirmButtonText: t("audio.confirm.confirm"),
        cancelButtonText: t("audio.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteAudio(String(currentAudio.value.id));
    viewDialogVisible.value = false;
    refresh();
    Message.success(t("audio.confirm.success"));
  } catch {
    Message.info(t("audio.confirm.info"));
  }
};

const handleUploadSuccess = async () => {
  uploadDialogVisible.value = false;
  refresh();
};

const saveAudio = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  _image_id?: number
) => {
  try {
    const data: { name: string; file_id: number; info?: string } = {
      name,
      file_id,
    };
    if (info) data.info = info;
    const response = await postAudio(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    logger.error("Failed to save audio:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: number; name?: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("audio.prompt.message1"),
      t("audio.prompt.message2"),
      {
        confirmButtonText: t("audio.prompt.confirm"),
        cancelButtonText: t("audio.prompt.cancel"),
        defaultValue: item.name,
      }
    )) as { value: string };
    await putAudio(item.id, { name: value });
    refresh();
    Message.success(t("audio.prompt.success") + value);
  } catch {
    Message.info(t("audio.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: number },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("audio.confirm.message1"),
      t("audio.confirm.message2"),
      {
        confirmButtonText: t("audio.confirm.confirm"),
        cancelButtonText: t("audio.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteAudio(item.id);
    refresh();
    Message.success(t("audio.confirm.success"));
  } catch {
    Message.info(t("audio.confirm.info"));
    resetLoading();
  }
};

const handleBatchDownload = () => {
  const selected = getSelectedItems(displayItems.value || []);
  Message.info(
    t("ui.batchDownloadDev", {
      count: selected.length,
      resource: t("route.resourceManagement.audioManagement.title"),
    })
  );
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(displayItems.value || []);
  try {
    await MessageBox.confirm(
      t("ui.batchDeleteConfirm", {
        count: selected.length,
        resource: t("route.resourceManagement.audioManagement.title"),
      }),
      t("ui.batchDeleteTitle"),
      {
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );

    for (const item of selected) {
      await deleteAudio(String(item.id));
    }

    clearSelection();
    refresh();
    Message.success(
      t("ui.batchDeleteSuccess", {
        count: selected.length,
        resource: t("route.resourceManagement.audioManagement.title"),
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
.audio-index {
  padding: 12px;
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

// Audio preview in detail panel
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
  background: linear-gradient(
    135deg,
    var(--primary-color, #03a9f4),
    var(--primary-dark, #0288d1)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(3, 169, 244, 0.3);

  .svg-inline--fa {
    font-size: 56px;
    color: #fff;
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
