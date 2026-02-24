<template>
  <TransitionWrapper>
    <div class="voxel-index">
      <PageActionBar
        :title="t('voxel.listPageTitle')"
        :search-placeholder="t('voxel.searchPlaceholder')"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #actions>
          <el-button type="primary" @click="openUploadDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("voxel.uploadVoxel") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer :items="items" :view-mode="viewMode" :loading="loading">
        <template #grid-card="{ item }">
          <MrPPCard
            :item="item"
            :type="t('voxel.typeName')"
            color="#9b59b6"
            @named="namedWindow"
            @deleted="deletedWindow"
          >
            <template #enter>
              <router-link :to="`/resource/voxel/view?id=${item.id}`">
                <el-button-group :inline="true">
                  <el-button
                    v-if="item.info === null || item.image === null"
                    type="warning"
                    size="small"
                  >
                    {{ $t("voxel.initializeVoxelData") }}
                  </el-button>
                  <el-button v-else type="primary" size="small">
                    {{ $t("voxel.viewVoxel") }}
                  </el-button>
                </el-button-group>
              </router-link>
            </template>
          </MrPPCard>
        </template>

        <template #list-item="{ item }">
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'cubes']"></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.name || "—" }}</span>
          </div>
          <div class="col-size">{{ formatFileSize(item.file?.size) }}</div>
          <div class="col-date">
            {{ formatItemDate(item.updated_at || item.created_at) }}
          </div>
          <div class="col-actions">
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    ><router-link :to="`/resource/voxel/view?id=${item.id}`">{{
                      $t("voxel.viewVoxel")
                    }}</router-link></el-dropdown-item
                  >
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
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <mr-p-p-upload-dialog
        v-model="uploadDialogVisible"
        dir="voxel"
        :file-type="fileType"
        @save-resource="saveVoxel"
        @success="handleUploadSuccess"
      >
        {{ $t("voxel.uploadFile") }}
      </mr-p-p-upload-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
} from "@/components/StandardPage";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getVoxels,
  putVoxel,
  deleteVoxel,
  postVoxel,
} from "@/api/v1/resources/index";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { usePageData } from "@/composables/usePageData";

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
    await getVoxels(params.sort, params.search, params.page),
});

const uploadDialogVisible = ref(false);
const fileType = ref(".vox");

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};
const handleUploadSuccess = async () => {
  uploadDialogVisible.value = false;
  refresh();
};

const saveVoxel = async (
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
    const response = await postVoxel(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    console.error("Failed to save voxel:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: number; name?: string }) => {
  try {
    const { value } = (await ElMessageBox.prompt(
      t("voxel.prompt.message1"),
      t("voxel.prompt.message2"),
      {
        confirmButtonText: t("voxel.prompt.confirm"),
        cancelButtonText: t("voxel.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name || "",
      }
    )) as { value: string };
    await putVoxel(item.id, { name: value });
    refresh();
    ElMessage.success(t("voxel.prompt.success") + value);
  } catch {
    ElMessage.info(t("voxel.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: number },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("voxel.confirm.message1"),
      t("voxel.confirm.message2"),
      {
        confirmButtonText: t("voxel.confirm.confirm"),
        cancelButtonText: t("voxel.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteVoxel(item.id);
    refresh();
    ElMessage.success(t("voxel.confirm.success"));
  } catch {
    ElMessage.info(t("voxel.confirm.info"));
    resetLoading();
  }
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
.voxel-index {
  padding: 20px;
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.col-size,
.col-date {
  width: 120px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.col-date {
  width: 140px;
}

.col-actions {
  width: 60px;
  text-align: center;
  flex-shrink: 0;
}

.item-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  color: var(--el-text-color-placeholder);

  .svg-inline--fa {
    font-size: 24px;
  }
}

.item-name {
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  font-size: 20px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-text-color-primary);
  }
}
</style>
