<template>
  <TransitionWrapper>
    <div class="meta-list">
      <PageActionBar title="所有实体" search-placeholder="搜索实体..." @search="handleSearch" @sort-change="handleSortChange"
        @view-change="handleViewChange">
        <template #actions>
          <el-button type="primary" @click="addMeta">
            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
            {{ $t("meta.title") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.image?.url" :title="item.title || item.name || '未命名'" action-text="进入编辑器"
            action-icon="edit" type-icon="token" placeholder-icon="extension" :show-checkbox="false"
            @view="openDetail(item)" @action="goToEditor(item)" />
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">实体名称</div>
          <div class="col-author">作者</div>
          <div class="col-date">修改日期</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img v-if="item.image?.url" :src="item.image.url" :alt="item.title" />
              <div v-else class="thumb-placeholder"><span class="material-symbols-outlined">token</span></div>
            </div>
            <span class="item-name">{{ item.title || item.name || '—' }}</span>
            <el-button class="btn-hover-action" type="primary" @click.stop="goToEditor(item)">
              进入编辑器
            </el-button>
          </div>
          <div class="col-author">{{ item.author?.nickname || item.author?.username || '—' }}</div>
          <div class="col-date">{{ formatItemDate(item.updated_at || item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <span class="material-symbols-outlined actions-icon">more_horiz</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">查看详情</el-dropdown-item>
                  <el-dropdown-item @click="goToEditor(item)">进入编辑器</el-dropdown-item>
                  <el-dropdown-item @click="copyWindow(item)">复制</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">重命名</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => { })">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState icon="category" text="暂无实体" action-text="新建实体" @action="addMeta" />
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange" />

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" title="实体详情" :name="currentMeta?.title || ''" :loading="detailLoading"
        :properties="detailProperties" placeholder-icon="category" :show-delete="true" :secondary-action="true"
        secondary-action-text="进入编辑器" download-text="复制实体" delete-text="删除实体" action-layout="grid" width="560px"
        @download="handleCopy" @rename="handleRename" @delete="handleDelete" @secondary="handleGoToEditor"
        @close="handlePanelClose">
        <template #preview>
          <div class="meta-preview" @click="triggerFileSelect">
            <img v-if="currentMeta?.image?.url" :src="currentMeta.image.url" :alt="currentMeta.title" />
            <div v-else class="preview-placeholder">
              <span class="material-symbols-outlined">category</span>
            </div>

            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/jpg" class="hidden-input"
              @change="handleCoverUpload" />
          </div>
        </template>
      </DetailPanel>
    </div>

    <!-- Selection Method Dialog -->
    <el-dialog v-model="imageSelectDialogVisible" :title="$t('meta.metaEdit.selectImageMethod')" width="500px"
      align-center :close-on-click-modal="false" append-to-body>
      <div class="selection-container">
        <div class="selection-card" @click="openResourceDialog">
          <div class="card-icon">
            <el-icon :size="32">
              <FolderOpened />
            </el-icon>
          </div>
          <div class="card-title">
            {{ $t("meta.metaEdit.selectFromResource") }}
          </div>
          <div class="card-description">
            {{ $t("imageSelector.selectFromResourceDesc") || '从我的资源库中选择' }}
          </div>
        </div>

        <div class="selection-card" @click="openLocalUpload">
          <div class="card-icon">
            <el-icon :size="32">
              <Upload />
            </el-icon>
          </div>
          <div class="card-title">{{ $t("meta.metaEdit.uploadLocal") }}</div>
          <div class="card-description">
            {{ $t("imageSelector.uploadLocalDesc") || '上传本地图片文件' }}
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Resource Dialog -->
    <ResourceDialog :multiple="false" @selected="onResourceSelected" ref="resourceDialogRef" />
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
// import { ElMessage, ElMessageBox } from "element-plus";
import { Message, MessageBox } from "@/components/Dialog";
import { v4 as uuidv4 } from "uuid";
import { PageActionBar, ViewContainer, PagePagination, EmptyState, StandardCard, DetailPanel } from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getMetas, postMeta, deleteMeta, putMeta, getMeta, putMetaCode } from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";
import { usePageData } from "@/composables/usePageData";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { getPicture } from "@/api/v1/resources/index";
import type { UploadFileType } from "@/api/user/model";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const { t } = useI18n();
const router = useRouter();

const {
  items, loading, pagination, viewMode, totalPages,
  refresh, handleSearch, handleSortChange, handlePageChange, handleViewChange,
} = usePageData({
  fetchFn: async (params) => await getMetas(params.sort, params.search, params.page),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentMeta = ref<metaInfo | null>(null);

// Image selection state
const imageSelectDialogVisible = ref(false);
const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const fileStore = useFileStore();

const triggerFileSelect = () => {
  imageSelectDialogVisible.value = true;
};

const openLocalUpload = () => {
  imageSelectDialogVisible.value = false;
  fileInput.value?.click();
};

const openResourceDialog = () => {
  imageSelectDialogVisible.value = false;
  resourceDialogRef.value?.openIt({ type: "picture" });
};

const onResourceSelected = async (data: any) => {
  const imageId = data.context?.image_id || data.image?.id || data.id;
  if (imageId && currentMeta.value) {
    detailLoading.value = true;
    try {
      let finalImageId = imageId;
      if (data.type === 'picture') {
        const response = await getPicture(data.id);
        finalImageId = response.data.image_id || response.data.file?.id;
      }
      await putMeta(String(currentMeta.value.id), { image_id: finalImageId });
      Message.success("封面更新成功");
      // Refresh details
      const response = await getMeta(currentMeta.value.id, { expand: "image,author" });
      currentMeta.value = response.data;
      refresh();
    } catch (error) {
      console.error("Failed to update meta image:", error);
      Message.error("封面更新失败");
    } finally {
      detailLoading.value = false;
    }
  };
};

const handleCoverUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    Message.error("请选择图片文件");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    Message.error("图片大小不能超过 5MB");
    return;
  }

  detailLoading.value = true;
  try {
    const md5 = await fileStore.store.fileMD5(file);
    const extension = file.name.substring(file.name.lastIndexOf("."));
    const handler = await fileStore.store.publicHandler();
    const dir = "picture";
    const has = await fileStore.store.fileHas(md5, extension, handler, dir);

    if (!has) {
      await new Promise<void>((resolve, reject) => {
        fileStore.store.fileUpload(
          md5, extension, file,
          (p: number) => { }, handler, dir
        ).then(() => resolve()).catch(reject);
      });
    }

    const fileData: UploadFileType = {
      filename: file.name, md5, key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, dir),
    };
    const response = await postFile(fileData);
    const imageId = response.data.id;

    if (currentMeta.value) {
      await putMeta(String(currentMeta.value.id), { image_id: imageId });
      Message.success("封面更新成功");
      const res = await getMeta(currentMeta.value.id, { expand: "image,author" });
      currentMeta.value = res.data;
      refresh();
    }
  } catch (error) {
    console.error("Upload failed", error);
    Message.error("封面更新失败");
  } finally {
    detailLoading.value = false;
    target.value = "";
  }
};

const detailProperties = computed(() => {
  if (!currentMeta.value) return [];
  return [
    { label: '类型', value: '实体' },
    { label: '作者', value: currentMeta.value.author?.nickname || currentMeta.value.author?.username || '—' },
  ];
});

const openDetail = async (item: metaInfo) => {
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getMeta(item.id, { expand: "image,author" });
    currentMeta.value = response.data;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentMeta.value = null;
};

const goToEditor = (item: metaInfo) => {
  const title = encodeURIComponent(`实体编辑【${item.title || '未命名'}】`);
  router.push({ path: "/meta/scene", query: { id: item.id, title } });
};

const handleGoToEditor = () => {
  if (currentMeta.value) {
    goToEditor(currentMeta.value);
  }
};

const handleCopy = async () => {
  if (!currentMeta.value) return;
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"), t("meta.prompt.message2"),
      { confirmButtonText: t("meta.prompt.confirm"), cancelButtonText: t("meta.prompt.cancel"), defaultValue: currentMeta.value.title + " - Copy" }
    )) as { value: string };
    await copy(currentMeta.value.id, value);
    Message.success(t("meta.prompt.success") + value);
  } catch { Message.info(t("meta.prompt.info")); }
};

const copy = async (id: number, newTitle: string) => {
  try {
    const response = await getMeta(id, { expand: "image,author,metaCode" });
    const meta = response.data;
    const newMeta = {
      title: newTitle, uuid: uuidv4(), image_id: meta.image_id,
      data: meta.data, info: meta.info, events: meta.events, prefab: meta.prefab,
    };
    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;
    if (meta.metaCode) await putMetaCode(newMetaId, meta.metaCode);
    refresh();
  } catch (error) {
    console.error("Copy error:", error);
    Message.error(t("meta.copy.error"));
  }
};

const handleRename = async (newName: string) => {
  if (!currentMeta.value) return;
  try {
    await putMeta(String(currentMeta.value.id), { title: newName });
    currentMeta.value.title = newName;
    refresh();
    Message.success(t("meta.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentMeta.value) return;
  try {
    await MessageBox.confirm(t("meta.confirm.message1"), t("meta.confirm.message2"),
      { confirmButtonText: t("meta.confirm.confirm"), cancelButtonText: t("meta.confirm.cancel"), type: "warning" });
    await deleteMeta(String(currentMeta.value.id));
    detailVisible.value = false;
    refresh();
    Message.success(t("meta.confirm.success"));
  } catch { Message.info(t("meta.confirm.info")); }
};

const generateDefaultName = (prefix: string) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${prefix}_${dateStr}_${timeStr}`;
};

const addMeta = async () => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.create.namePlaceholder"), t("meta.create.title"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        defaultValue: generateDefaultName(t("meta.create.defaultName")),
        inputValidator: (val) => (!val || !val.trim()) ? t("meta.create.nameRequired") : true,
      }
    )) as { value: string };
    await postMeta({ title: value.trim(), uuid: uuidv4() });
    refresh();
    Message.success(t("meta.create.success"));
  } catch { /* User cancelled */ }
};

const copyWindow = async (item: metaInfo) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"), t("meta.prompt.message2"),
      { confirmButtonText: t("meta.prompt.confirm"), cancelButtonText: t("meta.prompt.cancel"), defaultValue: item.title + " - Copy" }
    )) as { value: string };
    await copy(item.id, value);
    Message.success(t("meta.prompt.success") + value);
  } catch { Message.info(t("meta.prompt.info")); }
};

const namedWindow = async (item: metaInfo) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"), t("meta.prompt.message2"),
      { confirmButtonText: t("meta.prompt.confirm"), cancelButtonText: t("meta.prompt.cancel"), defaultValue: item.title }
    )) as { value: string };
    await putMeta(String(item.id), { title: value });
    refresh();
    Message.success(t("meta.prompt.success") + value);
  } catch { Message.info(t("meta.prompt.info")); }
};

const deletedWindow = async (item: metaInfo, resetLoading: () => void) => {
  try {
    await MessageBox.confirm(t("meta.confirm.message1"), t("meta.confirm.message2"),
      { confirmButtonText: t("meta.confirm.confirm"), cancelButtonText: t("meta.confirm.cancel"), type: "warning" });
    await deleteMeta(String(item.id));
    refresh();
    Message.success(t("meta.confirm.success"));
  } catch { Message.info(t("meta.confirm.info")); resetLoading(); }
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<style scoped lang="scss">
.meta-list {
  padding: 20px;
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
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);
}

.thumb-placeholder .material-symbols-outlined {
  font-size: 24px;
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
}

.actions-icon:hover {
  background: var(--bg-active, #e2e8f0);
  color: var(--text-primary, #1e293b);
  opacity: 1;
}

.meta-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;


  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-lg, 16px);
    transition: filter 0.3s;
  }

  .upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
    border-radius: var(--radius-lg, 16px);
    color: white;

    .material-symbols-outlined {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .overlay-text {
      font-size: 14px;
      font-weight: 500;
    }
  }

  &:hover {
    .upload-overlay {
      opacity: 1;
    }

    img {
      filter: blur(2px);
    }
  }

  cursor: pointer;
}

.hidden-input {
  display: none;
}

.selection-container {
  display: flex;
  gap: 15px;
  padding: 5px;
}

.selection-card {
  flex: 1;
  padding: 20px 15px;
  border: 2px solid var(--border-color, #e4e7ed);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-card, #ffffff);

  &:hover {
    border-color: var(--primary-color, #0ea5e9);
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(14, 165, 233, 0.2); // Keep specific shadow color or use var if available
    background: var(--bg-hover, #f8fafc);

    .card-icon {
      transform: scale(1.1);
      color: var(--primary-color, #0ea5e9);
    }
  }
}

.card-icon {
  color: var(--primary-color, #409eff);
  margin-bottom: 15px;
  transition: transform 0.3s ease;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  margin-bottom: 8px;
}

.card-description {
  font-size: 13px;
  color: var(--text-secondary, #909399);
  line-height: 1.5;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #94a3b8);

  .material-symbols-outlined {
    font-size: 64px;
  }
}

.list-view {
  :deep(.col-checkbox) {
    width: 40px;
  }

  .col-name {
    gap: 12px;
  }

  .col-author {
    width: 120px;
    text-align: right;
    font-size: var(--font-size-sm, 13px);
    color: var(--text-secondary, #64748b);
    flex-shrink: 0;
    padding-right: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-hover-action {
    opacity: 0;
    visibility: hidden;
    height: 28px;
    width: 84px;
    padding: 0;
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--primary-color, #03a9f4);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(3, 169, 244, 0.3);

    &:hover {
      background: var(--primary-hover, #039be5);
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(3, 169, 244, 0.4);
    }
  }

  :deep(.list-row:hover) {
    .btn-hover-action {
      opacity: 1;
      visibility: visible;
    }
  }
}
</style>
