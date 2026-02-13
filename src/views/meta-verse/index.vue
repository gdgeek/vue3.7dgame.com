<template>
  <TransitionWrapper>
    <div class="verse-index">
      <PageActionBar title="我的场景" search-placeholder="搜索场景..." :show-tags="true" @search="handleSearch"
        @sort-change="handleSortChange" @view-change="handleViewChange">
        <template #filters>
          <TagsSelect @tagsChange="handleTagsChange" />
        </template>
        <template #actions>
          <el-button type="primary" @click="createWindow">
            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
            {{ $t("verse.page.title") }}
          </el-button>
          <el-button @click="openImportDialog">
            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">upload</span>
            导入场景
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.image?.url" :title="item.name || '未命名'" :description="item.description"
            :meta="{ author: item.author?.nickname || item.author?.username, date: formatItemDate(item.created_at) }"
            action-text="进入编辑器" action-icon="edit" type-icon="layers" placeholder-icon="landscape"
            :show-checkbox="false" @view="openDetail(item)" @action="goToEditor(item)" />
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">场景名称</div>
          <div class="col-author">作者</div>
          <div class="col-date">修改日期</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img v-if="item.image?.url" :src="item.image.url" :alt="item.name" />
              <div v-else class="thumb-placeholder"><span class="material-symbols-outlined">layers</span></div>
            </div>
            <span class="item-name">{{ item.name || '—' }}</span>
            <el-button class="btn-hover-action" type="primary" @click.stop="goToEditor(item)">
              进入编辑器
            </el-button>
          </div>
          <div class="col-author">{{ item.author?.nickname || item.author?.username || '—' }}</div>
          <div class="col-date">{{ formatItemDate(item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <span class="material-symbols-outlined actions-icon">more_horiz</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">查看详情</el-dropdown-item>
                  <el-dropdown-item @click="goToEditor(item)">进入编辑器</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">重命名</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange" />

      <!-- Create Dialog -->
      <create ref="createdDialog" :dialog-title="$t('verse.page.dialogTitle')"
        :dialog-submit="$t('verse.page.dialogSubmit')" @submit="submitCreate"></create>

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" title="场景详情" :name="currentVerse?.name || ''" :loading="detailLoading"
        :properties="detailProperties" placeholder-icon="landscape" width="560px" :show-delete="true"
        action-layout="grid" :secondary-action="true" secondary-action-text="进入编辑器" download-text="导出场景"
        download-icon="download" delete-text="删除场景" @download="handleExport" @rename="handleRename"
        @delete="handleDelete" @secondary="handleGoToEditor" @close="handlePanelClose">
        <template #preview>
          <div class="verse-preview" @click="triggerFileSelect">
            <img v-if="currentVerse?.image?.url" :src="currentVerse.image.url" :alt="currentVerse.name" />
            <div v-else class="preview-placeholder">
              <span class="material-symbols-outlined">landscape</span>
            </div>

            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/jpg" class="hidden-input"
              @change="handleCoverUpload" />
          </div>
        </template>
        <template #info>
          <div class="verse-detail-info">
            <!-- DescriptionSection -->
            <div class="info-section">
              <div class="section-header">场景简介</div>
              <el-input v-model="editingDescription" type="textarea" :rows="4" placeholder="请输入场景简介（可选）"
                @blur="handleDescriptionBlur" />
            </div>

            <!-- Tags Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">场景标签</div>
              <div v-if="currentVerse?.verseTags?.length" class="tag-list">
                <el-tag v-for="tag in currentVerse.verseTags" :key="tag.id" closable class="mr-2 mb-2"
                  @close="handleRemoveTag(tag.id)">
                  {{ tag.name }}
                </el-tag>
              </div>
              <div v-else class="empty-tags">暂无标签</div>
              <el-select v-model="selectedTag" placeholder="添加标签..." filterable class="tag-select"
                @change="handleAddTag">
                <el-option v-for="tag in allTags" :key="tag.value" :label="tag.label" :value="tag.value"
                  :disabled="isTagSelected(tag.value)" />
              </el-select>
            </div>

            <!-- Visibility Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">可见性</div>
              <div class="visibility-group">
                <button class="vis-btn" :class="{ active: !currentVerse?.public }"
                  @click="handleVisibilityChange(false)">
                  <span class="material-symbols-outlined">lock</span>
                  私有
                </button>
                <button class="vis-btn" :class="{ active: currentVerse?.public }" @click="handleVisibilityChange(true)">
                  <span class="material-symbols-outlined">public</span>
                  公开
                </button>
              </div>
            </div>
          </div>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>

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

  <!-- Import Dialog -->
  <ImportDialog v-model="importDialogVisible" @success="handleImportSuccess" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { v4 as uuidv4 } from "uuid";
import { PageActionBar, ViewContainer, PagePagination, StandardCard, DetailPanel } from "@/components/StandardPage";
import TagsSelect from "@/components/TagsSelect.vue";
import Create from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import ImportDialog from "@/components/ScenePackage/ImportDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { getVerses, getVerse, postVerse, putVerse, deleteVerse, addPublic, removePublic, addTag, removeTag } from "@/api/v1/verse";
import { exportScene } from "@/services/scene-package/export-service";
import { getPicture } from "@/api/v1/resources/index";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import type { UploadFileType } from "@/api/user/model";
import { getTags } from "@/api/v1/tags";
import type { PostVerseData, VerseData } from "@/api/v1/verse";
import { usePageData } from "@/composables/usePageData";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import { useAbility } from "@casl/vue";

const { t } = useI18n();
const router = useRouter();
const createdDialog = ref<InstanceType<typeof Create> | null>(null);

const {
  items, loading, pagination, viewMode, totalPages,
  refresh, handleSearch, handleSortChange, handlePageChange, handleViewChange, handleTagsChange,
} = usePageData({
  fetchFn: async (params) => await getVerses({
    sort: params.sort,
    search: params.search,
    page: params.page,
    tags: params.tags,
    expand: "image,author",
  }),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentVerse = ref<any | null>(null);
const ability = useAbility();

const canManage = computed(() => {
  return ability.can("manager", "all") || ability.can("admin", "all") || ability.can("root", "all");
});

const editingDescription = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const fileStore = useFileStore();
const allTags = ref<{ label: string; value: number }[]>([]);
const selectedTag = ref<number | undefined>(undefined);

// Image selection state
const imageSelectDialogVisible = ref(false);
const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(null);
// Import dialog state
const importDialogVisible = ref(false);

const openImportDialog = () => {
  importDialogVisible.value = true;
};

const handleImportSuccess = (verseId: number) => {
  importDialogVisible.value = false;
  refresh();
  Message.success("场景导入成功");
};
const detailProperties = computed(() => {
  if (!currentVerse.value) return [];
  return [
    { label: '类型', value: '场景' },
    { label: '作者', value: currentVerse.value.author?.nickname || currentVerse.value.author?.username || '—' },
    { label: '创建时间', value: currentVerse.value.created_at ? convertToLocalTime(currentVerse.value.created_at) : '—' },
  ];
});

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
  // data is CardInfo, but to be sure
  const imageId = data.context?.image_id || data.image?.id || data.id;
  if (imageId && currentVerse.value) {
    detailLoading.value = true;
    try {
      // If the selected resource is a picture resource, we might need to get its file ID or image ID check
      // But usually image_id refers to the File ID of the image or Image ID.
      // Let's assume imageId is correct for now or verify with getPicture like ImageSelector did.
      // ImageSelector logic:
      // const response = await getPicture(pictureResourceId);
      // const finalImageId = response.data.image_id || response.data.file?.id;

      // Ensure we have the correct ID. 'data.id' is likely the Resource ID.
      let finalImageId = imageId;
      if (data.type === 'picture') {
        const response = await getPicture(data.id);
        finalImageId = response.data.image_id || response.data.file?.id;
      }

      await putVerse(currentVerse.value.id, { image_id: finalImageId });
      Message.success("封面更新成功");
      await openDetail(currentVerse.value);
    } catch (error) {
      console.error("Failed to update verse image:", error);
      Message.error("封面更新失败");
    } finally {
      detailLoading.value = false;
    }
  }
};

const handleCoverUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Simple validation
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
    // 1. MD5
    const md5 = await fileStore.store.fileMD5(file);
    const extension = file.name.substring(file.name.lastIndexOf("."));
    const handler = await fileStore.store.publicHandler();
    const dir = "picture";

    // 2. Check existence
    const has = await fileStore.store.fileHas(md5, extension, handler, dir);

    // 3. Upload if needed
    if (!has) {
      await new Promise<void>((resolve, reject) => {
        fileStore.store.fileUpload(
          md5,
          extension,
          file,
          (p: number) => { }, // progress
          handler,
          dir
        ).then(() => resolve()).catch(reject);
      });
    }

    // 4. Register File
    const fileData: UploadFileType = {
      filename: file.name,
      md5,
      key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, dir),
    };
    const response = await postFile(fileData);
    const imageId = response.data.id;

    // 5. Update Verse
    if (currentVerse.value) {
      await putVerse(currentVerse.value.id, { image_id: imageId });
      Message.success("封面更新成功");
      // Refresh details
      await openDetail(currentVerse.value);
    }
  } catch (error) {
    console.error("Upload failed", error);
    Message.error("封面更新失败");
  } finally {
    detailLoading.value = false;
    // Reset input
    target.value = "";
  }
};

const openDetail = async (item: VerseData) => {
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getVerse(item.id, "image,author,verseTags");
    currentVerse.value = response.data;
    editingDescription.value = response.data.description || "";

    if (canManage.value) {
      const tagsRes = await getTags();
      allTags.value = tagsRes.data.map((tag: any) => ({
        label: tag.name,
        value: tag.id,
      }));
    }
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handleDescriptionBlur = async () => {
  if (!currentVerse.value || editingDescription.value === (currentVerse.value.description || '')) return;

  try {
    await putVerse(currentVerse.value.id, { description: editingDescription.value });
    currentVerse.value.description = editingDescription.value;
    Message.success("简介已更新");
    refresh();
  } catch (err) {
    Message.error("更新简介失败");
    editingDescription.value = currentVerse.value.description || "";
  }
};

const isTagSelected = (tagId: number) => {
  return currentVerse.value?.verseTags?.some((t: any) => t.id === tagId);
};

const handleAddTag = async (tagId: number | undefined) => {
  if (tagId === undefined || !currentVerse.value) return;
  try {
    await addTag(currentVerse.value.id, tagId);
    const tag = allTags.value.find(t => t.value === tagId);
    if (tag) {
      if (!currentVerse.value.verseTags) currentVerse.value.verseTags = [];
      currentVerse.value.verseTags.push({ id: tag.value, name: tag.label });
    }
    selectedTag.value = undefined;
    Message.success("标签已添加");
    refresh();
  } catch (err) {
    Message.error("添加标签失败");
  }
};

const handleRemoveTag = async (tagId: number) => {
  if (!currentVerse.value) return;
  try {
    await removeTag(currentVerse.value.id, tagId);
    currentVerse.value.verseTags = currentVerse.value.verseTags.filter((t: any) => t.id !== tagId);
    Message.success("标签已移除");
    refresh();
  } catch (err) {
    Message.error("移除标签失败");
  }
};

const handleVisibilityChange = async (isPublic: boolean) => {
  if (!currentVerse.value || currentVerse.value.public === isPublic) return;

  try {
    if (isPublic) {
      await addPublic(currentVerse.value.id);
    } else {
      await removePublic(currentVerse.value.id);
    }
    currentVerse.value.public = isPublic;
    Message.success(`场景已设为${isPublic ? '公开' : '私有'}`);
    refresh();
  } catch (err) {
    Message.error("更新可见性失败");
  }
};

const handlePanelClose = () => {
  currentVerse.value = null;
};

const goToEditor = (item: VerseData) => {
  const title = encodeURIComponent(`场景【${item.name || '未命名'}】`);
  router.push({ path: "/verse/scene", query: { id: item.id, title } });
};

const handleGoToEditor = () => {
  if (currentVerse.value) {
    goToEditor(currentVerse.value);
  }
};

const handleCopy = async () => {
  if (!currentVerse.value) return;
  try {
    const { value } = (await MessageBox.prompt(
      "请输入新场景名称", "复制场景",
      { confirmButtonText: "确定", cancelButtonText: "取消", defaultValue: currentVerse.value.name + " - Copy" }
    )) as { value: string };

    const data: PostVerseData = {
      name: value,
      description: currentVerse.value.description || "",
      uuid: uuidv4(),
      image_id: currentVerse.value.image?.id,
    };
    await postVerse(data);
    refresh();
    Message.success("复制成功：" + value);
  } catch { Message.info("已取消"); }
};

const handleExport = async () => {
  if (!currentVerse.value) return;
  try {
    await exportScene(currentVerse.value.id);
    Message.success("导出成功");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    Message.error(`导出失败：${message}`);
  }
};

const handleRename = async (newName: string) => {
  if (!currentVerse.value) return;
  try {
    await putVerse(currentVerse.value.id, { name: newName });
    currentVerse.value.name = newName;
    refresh();
    Message.success("重命名成功：" + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentVerse.value) return;
  try {
    await MessageBox.confirm("确定要删除此场景吗？", "删除场景",
      { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" });
    await deleteVerse(currentVerse.value.id);
    detailVisible.value = false;
    refresh();
    Message.success("删除成功");
  } catch { Message.info("已取消"); }
};

const createWindow = () => {
  createdDialog.value?.show();
};

const submitCreate = async (form: Record<string, string>, imageId: number | null) => {
  const data: PostVerseData = { name: form.name, description: form.description, uuid: uuidv4() };
  if (imageId !== null) data.image_id = imageId;
  try {
    const response = await postVerse(data);
    const title = encodeURIComponent(`场景【${form.name}】`);
    router.push({ path: "/verse/scene", query: { id: response.data.id, title } });
  } catch (error) {
    console.error(error);
  }
};

const namedWindow = async (item: VerseData) => {
  try {
    const { value } = (await MessageBox.prompt(
      "请输入新名称", "重命名",
      { confirmButtonText: "确定", cancelButtonText: "取消", defaultValue: item.name }
    )) as { value: string };
    await putVerse(item.id, { name: value });
    refresh();
    Message.success("重命名成功：" + value);
  } catch { Message.info("已取消"); }
};

const deletedWindow = async (item: VerseData) => {
  try {
    await MessageBox.confirm("确定要删除此场景吗？", "删除场景",
      { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" });
    await deleteVerse(item.id);
    refresh();
    Message.success("删除成功");
  } catch { Message.info("已取消"); }
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<style scoped lang="scss">
.verse-index {
  padding: 20px;
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-author {
  width: 120px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-date {
  width: 120px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
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

.verse-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;

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
}

.hidden-input {
  display: none;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #94a3b8);
  width: 100%;
  height: 100%;
  background: #f1f5f9;
  border-radius: var(--radius-lg, 16px);

  .material-symbols-outlined {
    font-size: 64px;
  }
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
    box-shadow: 0 8px 16px rgba(14, 165, 233, 0.2);
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

.verse-detail-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 12px 0;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-tags {
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}

.tag-select {
  width: 100%;
}

.visibility-group {
  display: flex;
  gap: 12px;
}

.vis-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 22px;
  border: 1.5px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #64748b);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  .material-symbols-outlined {
    font-size: 20px;
  }

  &:hover {
    border-color: var(--primary-color, #03a9f4);
    color: var(--primary-color, #03a9f4);
  }

  &.active {
    background: var(--primary-light, rgba(3, 169, 244, 0.1));
    border-color: var(--primary-color, #03a9f4);
    color: var(--primary-color, #03a9f4);
    font-weight: 600;
  }
}

:deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  transition: all 0.2s ease;

  &:focus {
    background: var(--bg-card, #fff);
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 3px var(--primary-light, rgba(3, 169, 244, 0.1));
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
