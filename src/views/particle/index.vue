<template>
  <TransitionWrapper>
    <div class="particle-index">
      <PageActionBar
        title="所有粒子素材"
        search-placeholder="搜索粒子..."
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #actions>
          <el-button type="primary" @click="openUploadDialog">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >upload</span
            >
            {{ $t("particle.uploadParticle") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer :items="items" :view-mode="viewMode" :loading="loading">
        <template #grid-card="{ item }">
          <mr-p-p-card
            :item="item"
            type="粒子"
            color="#e67e22"
            @named="namedWindow"
            @deleted="deletedWindow"
          >
            <template #enter>
              <router-link :to="`/resource/particle/view?id=${item.id}`">
                <el-button
                  v-if="item.info === null || item.image === null"
                  type="warning"
                  size="small"
                >
                  {{ $t("particle.initializeParticleData") }}
                </el-button>
                <el-button v-else type="primary" size="small">
                  {{ $t("particle.viewParticle") }}
                </el-button>
              </router-link>
            </template>
          </mr-p-p-card>
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
                <span class="material-symbols-outlined">blur_on</span>
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
              <span class="material-symbols-outlined actions-icon"
                >more_horiz</span
              >
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    ><router-link
                      :to="`/resource/particle/view?id=${item.id}`"
                      >{{ $t("particle.viewParticle") }}</router-link
                    ></el-dropdown-item
                  >
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

      <mr-p-p-upload-dialog
        v-model="uploadDialogVisible"
        dir="particle"
        :file-type="fileType"
        :show-effect-type-select="true"
        @save-resource="saveParticle"
        @success="handleUploadSuccess"
      >
        {{ $t("particle.uploadFile") }}
      </mr-p-p-upload-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
} from "@/components/StandardPage";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getParticles,
  putParticle,
  deleteParticle,
  postParticle,
} from "@/api/v1/resources/index";
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
} = usePageData({
  fetchFn: async (params) =>
    await getParticles(params.sort, params.search, params.page),
});

const uploadDialogVisible = ref(false);
const fileType = ref(".json");

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};
const handleUploadSuccess = async () => {
  uploadDialogVisible.value = false;
  refresh();
};

const saveParticle = async (
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
    if (effectType) data.effect_type = effectType;
    if (info) data.info = info;
    if (image_id) data.image_id = image_id;
    const response = await postParticle(data);
    if (response.data.id) callback(response.data.id);
  } catch (err) {
    console.error("Failed to save particle:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("particle.prompt.message1"),
      t("particle.prompt.message2"),
      {
        confirmButtonText: t("particle.prompt.confirm"),
        cancelButtonText: t("particle.prompt.cancel"),
        defaultValue: item.name,
      }
    )) as { value: string };
    await putParticle(item.id, { name: value });
    refresh();
    Message.success(t("particle.prompt.success") + value);
  } catch {
    Message.info(t("particle.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("particle.confirm.message1"),
      t("particle.confirm.message2"),
      {
        confirmButtonText: t("particle.confirm.confirm"),
        cancelButtonText: t("particle.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteParticle(item.id);
    refresh();
    Message.success(t("particle.confirm.success"));
  } catch {
    Message.info(t("particle.confirm.info"));
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
.particle-index {
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

  .material-symbols-outlined {
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
