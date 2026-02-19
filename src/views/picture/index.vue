<template>
  <TransitionWrapper>
    <div class="picture-index">
      <PageActionBar
        title="所有图片素材"
        search-placeholder="搜索图片..."
        :selection-count="selectedCount"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
        @batch-download="handleBatchDownload"
        @batch-delete="handleBatchDelete"
        @cancel-selection="handleCancelSelection"
      >
        <template #actions>
          <el-button type="primary" @click="openUploadDialog">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >upload</span
            >
            {{ $t("picture.uploadPicture") }}
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
            :title="item.name || '未命名'"
            :meta="{ date: formatItemDate(item.updated_at || item.created_at) }"
            placeholder-icon="image"
            :selected="isSelected(item.id)"
            :selection-mode="hasSelection"
            type-icon="image"
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
                <span class="material-symbols-outlined">image</span>
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
              <span class="material-symbols-outlined actions-icon"
                >more_horiz</span
              >
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openViewDialog(item.id)">
                    {{ $t("picture.viewPicture") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)"
                    >重命名</el-dropdown-item
                  >
                  <el-dropdown-item @click="deletedWindow(item, () => {})"
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      ></PagePagination>

      <!-- Dialogs -->
      <!-- Dialogs -->
      <StandardUploadDialog
        v-model="uploadDialogVisible"
        dir="picture"
        :file-type="fileType"
        :max-size="5"
        :title="$t('picture.uploadPicture')"
        @save-resource="savePicture"
        @success="handleUploadSuccess"
      ></StandardUploadDialog>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="viewDialogVisible"
        title="图片详情"
        :name="currentPicture?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        placeholder-icon="image"
        download-text="下载图片"
        delete-text="删除此图片"
        @download="handleDownload"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #preview>
          <img
            v-if="currentPicture?.file?.url"
            :src="currentPicture.file.url"
            :alt="currentPicture.name"
          />
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
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
} from "@/components/StandardPage";
import StandardUploadDialog from "@/components/StandardPage/StandardUploadDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getPictures,
  getPicture,
  putPicture,
  deletePicture,
  postPicture,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { downloadResource } from "@/utils/downloadHelper";
import {
  convertToLocalTime,
  formatFileSize as formatSize,
} from "@/utils/utilityFunctions";
import { printVector2 } from "@/assets/js/helper";

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
} = usePageData({
  fetchFn: async (params) =>
    await getPictures(params.sort, params.search, params.page),
});

// Selection management
const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelection,
  clearSelection,
  getSelectedItems,
} = useSelection();

const uploadDialogVisible = ref(false);
const fileType = ref("image/gif, image/jpeg, image/png, image/webp");
const viewDialogVisible = ref(false);
const currentPictureId = ref<number | null>(null);

// Detail panel state
const currentPicture = ref<ResourceInfo | null>(null);
const detailLoading = ref(false);

const detailProperties = computed(() => {
  if (!currentPicture.value) return [];
  const info = currentPicture.value.info
    ? JSON.parse(currentPicture.value.info)
    : null;
  return [
    { label: "类型", value: "图片" },
    { label: "大小", value: formatSize(currentPicture.value.file?.size) },
    {
      label: "创建时间",
      value: convertToLocalTime(currentPicture.value.created_at),
    },
    ...(info?.size ? [{ label: "尺寸", value: printVector2(info.size) }] : []),
  ];
});

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = async (id: number) => {
  currentPictureId.value = id;
  viewDialogVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getPicture(id);
    currentPicture.value = response.data;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentPicture.value = null;
};

const handleDownload = async () => {
  if (!currentPicture.value) return;
  const fileName = currentPicture.value.file?.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".jpg";
  await downloadResource(
    {
      name: currentPicture.value.name || "image",
      file: currentPicture.value.file,
    },
    fileExt,
    t,
    "picture.view.download"
  );
};

const handleRename = async (newName: string) => {
  if (!currentPicture.value) return;
  try {
    await putPicture(String(currentPicture.value.id), { name: newName });
    currentPicture.value.name = newName;
    refresh();
    Message.success(t("picture.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentPicture.value) return;
  try {
    await ElMessageBox.confirm(
      t("picture.confirm.message1"),
      t("picture.confirm.message2"),
      {
        confirmButtonText: t("picture.confirm.confirm"),
        cancelButtonText: t("picture.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePicture(String(currentPicture.value.id));
    viewDialogVisible.value = false;
    refresh();
    Message.success(t("picture.confirm.success"));
  } catch {
    Message.info(t("picture.confirm.info"));
  }
};

const handleUploadSuccess = async () => {
  uploadDialogVisible.value = false;
  refresh();
};

const savePicture = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  image_id?: number
) => {
  try {
    const data: any = { name, file_id };
    if (info) {
      data.info = info;
      data.image_id = file_id;
    }
    const response = await postPicture(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    console.error("Failed to save picture:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("picture.prompt.message1"),
      t("picture.prompt.message2"),
      {
        confirmButtonText: t("picture.prompt.confirm"),
        cancelButtonText: t("picture.prompt.cancel"),
        defaultValue: item.name,
      }
    )) as { value: string };
    await putPicture(item.id, { name: value });
    refresh();
    Message.success(t("picture.prompt.success") + value);
  } catch {
    Message.info(t("picture.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("picture.confirm.message1"),
      t("picture.confirm.message2"),
      {
        confirmButtonText: t("picture.confirm.confirm"),
        cancelButtonText: t("picture.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePicture(item.id);
    refresh();
    Message.success(t("picture.confirm.success"));
  } catch {
    Message.info(t("picture.confirm.info"));
    resetLoading();
  }
};

// Batch operations
const handleBatchDownload = () => {
  const selected = getSelectedItems(items.value || []);
  Message.info(`批量下载 ${selected.length} 个文件（功能开发中）`);
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(items.value || []);
  try {
    await MessageBox.confirm(
      `确定要删除选中的 ${selected.length} 个图片吗？`,
      "批量删除",
      { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }
    );

    for (const item of selected) {
      await deletePicture(String(item.id));
    }

    clearSelection();
    refresh();
    Message.success(`成功删除 ${selected.length} 个图片`);
  } catch {
    Message.info("已取消删除");
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
.picture-index {
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

  .material-symbols-outlined {
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
