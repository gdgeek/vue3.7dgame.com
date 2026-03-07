<template>
  <TransitionWrapper>
    <div class="verse-index">
      <PageActionBar
        :title="t('verse.listPage.myScenes')"
        :search-placeholder="t('verse.listPage.searchScenes')"
        :show-tags="true"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #filters>
          <TagsSelect
            v-if="canViewSceneFilter"
            @tags-change="handleTagsChange"
          ></TagsSelect>
        </template>
        <template #actions>
          <el-button type="primary" @click="createWindow">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ $t("verse.page.title") }}
          </el-button>
          <el-button @click="openImportDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ t("ui.importScene") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        class="list-view"
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        @row-click="openDetail"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.name || t('verse.listPage.unnamed')"
            :description="item.description"
            :meta="{
              author: item.author?.nickname || item.author?.username,
              date: formatItemDate(item.created_at),
            }"
            :action-text="t('verse.listPage.enterEditor')"
            :action-icon="['fas', 'pen-to-square']"
            :type-icon="['fas', 'layer-group']"
            :placeholder-icon="['fas', 'layer-group']"
            :show-checkbox="false"
            @view="openDetail(item)"
            @action="goToEditor(item)"
          >
          </StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ t("verse.listPage.sceneName") }}</div>
          <div class="col-author">{{ t("verse.listPage.author") }}</div>
          <div class="col-date">{{ t("verse.listPage.modifiedDate") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="toHttps(item.image.url)"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'layer-group']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.name || "—" }}</span>
            <el-button
              class="btn-hover-action"
              type="primary"
              @click.stop="goToEditor(item)"
            >
              {{ t("verse.listPage.enterEditor") }}
            </el-button>
          </div>
          <div class="col-author">
            {{ item.author?.nickname || item.author?.username || "—" }}
          </div>
          <div class="col-date">{{ formatItemDate(item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{
                    t("verse.listPage.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="goToEditor(item)">{{
                    t("verse.listPage.enterEditor")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("verse.listPage.rename")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">{{
                    t("verse.listPage.delete")
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

      <!-- Create Dialog -->
      <create
        ref="createdDialog"
        :dialog-title="$t('verse.page.dialogTitle')"
        :dialog-submit="$t('verse.page.dialogSubmit')"
        @submit="submitCreate"
      ></create>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="detailVisible"
        :title="t('verse.listPage.detailTitle')"
        :name="currentVerse?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'image']"
        width="560px"
        :show-delete="true"
        action-layout="grid"
        :secondary-action="true"
        :secondary-action-text="t('verse.listPage.enterEditor')"
        :download-text="t('ui.exportScene')"
        :download-icon="['fas', 'download']"
        :delete-text="t('verse.listPage.deleteScene')"
        @download="handleExport"
        @rename="handleRename"
        @delete="handleDelete"
        @secondary="handleGoToEditor"
        @close="handlePanelClose"
      >
        <template #preview>
          <div class="verse-preview" @click="triggerFileSelect">
            <img
              v-if="currentVerse?.image?.url"
              :src="toHttps(currentVerse.image.url)"
              :alt="currentVerse.name"
            />
            <div v-else class="preview-placeholder">
              <font-awesome-icon :icon="['fas', 'image']"></font-awesome-icon>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              class="hidden-input"
              @change="handleCoverUpload"
            />
          </div>
        </template>
        <template #info>
          <div class="verse-detail-info">
            <!-- DescriptionSection -->
            <div class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneIntro") }}
              </div>
              <el-input
                v-model="editingDescription"
                type="textarea"
                :rows="4"
                :placeholder="t('verse.listPage.sceneIntroPlaceholder')"
                @blur="handleDescriptionBlur"
              ></el-input>
            </div>

            <!-- Tags Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneTags") }}
              </div>
              <div v-if="currentVerse?.verseTags?.length" class="tag-list">
                <el-tag
                  v-for="tag in currentVerse.verseTags"
                  :key="tag.id"
                  closable
                  class="mr-2 mb-2"
                  @close="handleRemoveTag(tag.id)"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
              <div v-else class="empty-tags">
                {{ t("verse.listPage.noTags") }}
              </div>
              <el-select
                v-model="selectedTag"
                :placeholder="t('verse.listPage.addTag')"
                filterable
                class="tag-select"
                @change="handleAddTag"
              >
                <el-option
                  v-for="tag in allTags"
                  :key="tag.value"
                  :label="tag.label"
                  :value="tag.value"
                  :disabled="isTagSelected(tag.value)"
                ></el-option>
              </el-select>
            </div>

            <!-- Visibility Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.visibility") }}
              </div>
              <div class="visibility-group">
                <button
                  class="vis-btn"
                  :class="{ active: !currentVerse?.public }"
                  @click="handleVisibilityChange(false)"
                >
                  <font-awesome-icon
                    :icon="['fas', 'lock']"
                  ></font-awesome-icon>
                  {{ t("verse.listPage.private") }}
                </button>
                <button
                  class="vis-btn"
                  :class="{ active: currentVerse?.public }"
                  @click="handleVisibilityChange(true)"
                >
                  <font-awesome-icon
                    :icon="['fas', 'globe']"
                  ></font-awesome-icon>
                  {{ t("verse.listPage.public") }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>

  <!-- Selection Method Dialog -->
  <el-dialog
    v-model="imageSelectDialogVisible"
    :title="$t('meta.metaEdit.selectImageMethod')"
    width="500px"
    align-center
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="selection-container">
      <div class="selection-card" @click="openResourceDialog">
        <div class="card-icon">
          <el-icon :size="32">
            <FolderOpened></FolderOpened>
          </el-icon>
        </div>
        <div class="card-title">
          {{ $t("meta.metaEdit.selectFromResource") }}
        </div>
        <div class="card-description">
          {{ $t("imageSelector.selectFromResourceDesc") }}
        </div>
      </div>

      <div class="selection-card" @click="openLocalUpload">
        <div class="card-icon">
          <el-icon :size="32">
            <Upload></Upload>
          </el-icon>
        </div>
        <div class="card-title">{{ $t("meta.metaEdit.uploadLocal") }}</div>
        <div class="card-description">
          {{ $t("imageSelector.uploadLocalDesc") }}
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- Resource Dialog -->
  <ResourceDialog
    :multiple="false"
    @selected="onResourceSelected"
    ref="resourceDialogRef"
  ></ResourceDialog>

  <!-- Import Dialog -->
  <ImportDialog
    v-model="importDialogVisible"
    @success="handleImportSuccess"
  ></ImportDialog>
</template>

<script setup lang="ts">
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TagsSelect from "@/components/TagsSelect.vue";
import Create from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import ImportDialog from "@/components/ScenePackage/ImportDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { getVerses } from "@/api/v1/verse";
import { usePageData } from "@/composables/usePageData";
import { useVersePermissions } from "./composables/useVersePermissions";
import { useVerseDetail } from "./composables/useVerseDetail";
import { useVerseCoverUpload } from "./composables/useVerseCoverUpload";
import { useVerseCrud } from "./composables/useVerseCrud";
import { toHttps } from "@/utils/helper";

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
  handleTagsChange,
} = usePageData({
  fetchFn: async (params) =>
    await getVerses({
      sort: params.sort,
      search: params.search,
      page: params.page,
      tags: params.tags,
      expand: "image,author",
    }),
});

const { canManage, canViewSceneFilter } = useVersePermissions();

const {
  detailVisible,
  detailLoading,
  currentVerse,
  editingDescription,
  allTags,
  selectedTag,
  detailProperties,
  openDetail,
  handleDescriptionBlur,
  handlePanelClose,
  isTagSelected,
  handleAddTag,
  handleRemoveTag,
  handleVisibilityChange,
} = useVerseDetail({ refresh, canManage });

const {
  imageSelectDialogVisible,
  resourceDialogRef,
  fileInput,
  triggerFileSelect,
  openLocalUpload,
  openResourceDialog,
  onResourceSelected,
  handleCoverUpload,
} = useVerseCoverUpload({ currentVerse, detailLoading, openDetail });

const {
  createdDialog,
  importDialogVisible,
  formatItemDate,
  goToEditor,
  handleGoToEditor,
  createWindow,
  submitCreate,
  namedWindow,
  deletedWindow,
  handleExport,
  handleRename,
  handleDelete,
  openImportDialog,
  handleImportSuccess,
} = useVerseCrud({ refresh, currentVerse, detailVisible });
</script>

<style scoped lang="scss">
@import "./index";
</style>
