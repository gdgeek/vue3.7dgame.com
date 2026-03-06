<template>
  <TransitionWrapper>
    <div class="meta-list">
      <PageActionBar
        :title="t('meta.list.pageTitle')"
        :search-placeholder="t('meta.list.searchPlaceholder')"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #actions>
          <el-button type="primary" @click="addMeta">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("meta.title") }}
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
            :title="item.title || item.name || t('meta.list.unnamed')"
            :action-text="t('meta.list.enterEditor')"
            :action-icon="['fas', 'pen-to-square']"
            :type-icon="['fas', 'puzzle-piece']"
            :placeholder-icon="['fas', 'puzzle-piece']"
            :show-checkbox="false"
            @view="openDetail(item)"
            @action="goToEditor(item)"
          ></StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ t("meta.list.columns.name") }}</div>
          <div class="col-author">{{ t("meta.list.columns.author") }}</div>
          <div class="col-resources">{{ t("meta.list.columns.resources") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.title"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'puzzle-piece']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.title || item.name || "—" }}</span>
            <el-button
              class="btn-hover-action"
              type="primary"
              @click.stop="goToEditor(item)"
            >
              {{ t("meta.list.enterEditor") }}
            </el-button>
          </div>
          <div class="col-author">
            {{ item.author?.nickname || item.author?.username || "—" }}
          </div>
          <div class="col-resources">{{ getResourceCount(item) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{
                    t("meta.list.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="goToEditor(item)">{{
                    t("meta.list.enterEditor")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="copyWindow(item)">{{
                    t("meta.copy")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("meta.list.rename")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => {})">{{
                    t("meta.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'folder-open']"
            :text="t('meta.list.emptyText')"
            :action-text="t('meta.list.createAction')"
            @action="addMeta"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="detailVisible"
        :title="t('meta.list.detailTitle')"
        :name="currentMeta?.title || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'folder-open']"
        :show-delete="true"
        :secondary-action="true"
        :secondary-action-text="t('meta.list.enterEditor')"
        :download-text="t('meta.list.copyEntity')"
        :delete-text="t('meta.list.deleteEntity')"
        action-layout="grid"
        width="560px"
        @download="handleCopy"
        @rename="handleRename"
        @delete="handleDelete"
        @secondary="handleGoToEditor"
        @close="handlePanelClose"
      >
        <template #preview>
          <div class="meta-preview" @click="triggerFileSelect">
            <img
              v-if="currentMeta?.image?.url"
              :src="currentMeta.image.url"
              :alt="currentMeta.title"
            />
            <div v-else class="preview-placeholder">
              <font-awesome-icon
                :icon="['fas', 'th-large']"
              ></font-awesome-icon>
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
          <div class="events-section">
            <div class="events-title">{{ t("meta.list.events.title") }}</div>

            <div class="events-grid">
              <div class="events-card">
                <div class="events-card-title">
                  {{ t("meta.list.events.inputs") }}
                  <span class="events-count">{{ eventInputs.length }}</span>
                </div>
                <div v-if="eventInputs.length > 0" class="events-list">
                  <div
                    v-for="(eventItem, index) in eventInputs"
                    :key="'in-' + index"
                    class="events-item"
                  >
                    <span class="events-index">{{ index + 1 }}</span>
                    <div class="events-main">
                      <span class="events-title-text">{{ eventItem.title }}</span>
                      <span
                        v-if="eventItem.name && eventItem.name !== eventItem.title"
                        class="events-name-sub"
                      >
                        {{ eventItem.name }}
                      </span>
                    </div>
                    <span v-if="eventItem.type" class="events-type">{{
                      eventItem.type
                    }}</span>
                  </div>
                </div>
                <div v-else class="events-empty">
                  {{ t("meta.list.events.empty") }}
                </div>
              </div>

              <div class="events-card">
                <div class="events-card-title">
                  {{ t("meta.list.events.outputs") }}
                  <span class="events-count">{{ eventOutputs.length }}</span>
                </div>
                <div v-if="eventOutputs.length > 0" class="events-list">
                  <div
                    v-for="(eventItem, index) in eventOutputs"
                    :key="'out-' + index"
                    class="events-item"
                  >
                    <span class="events-index">{{ index + 1 }}</span>
                    <div class="events-main">
                      <span class="events-title-text">{{ eventItem.title }}</span>
                      <span
                        v-if="eventItem.name && eventItem.name !== eventItem.title"
                        class="events-name-sub"
                      >
                        {{ eventItem.name }}
                      </span>
                    </div>
                    <span v-if="eventItem.type" class="events-type">{{
                      eventItem.type
                    }}</span>
                  </div>
                </div>
                <div v-else class="events-empty">
                  {{ t("meta.list.events.empty") }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </DetailPanel>
    </div>

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
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { useMetaList, logMetaStructure } from "./list/composables/useMetaList";
import { useMetaDetail } from "./list/composables/useMetaDetail";
import { useMetaCoverUpload } from "./list/composables/useMetaCoverUpload";
import { useMetaActions } from "./list/composables/useMetaActions";

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
  getResourceCount,
} = useMetaList();

const {
  detailVisible,
  detailLoading,
  currentMeta,
  detailProperties,
  eventInputs,
  eventOutputs,
  openDetail,
  handlePanelClose,
  goToEditor,
  handleGoToEditor,
  handleCopy,
  handleRename,
  handleDelete,
} = useMetaDetail({ refresh, logMetaStructure });

const {
  imageSelectDialogVisible,
  resourceDialogRef,
  fileInput,
  triggerFileSelect,
  openLocalUpload,
  openResourceDialog,
  onResourceSelected,
  handleCoverUpload,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} = useMetaCoverUpload({ currentMeta: currentMeta as any, detailLoading, refresh });

const { addMeta, copyWindow, namedWindow, deletedWindow } = useMetaActions({
  refresh,
});
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
.col-author {
  width: 100px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-resources {
  width: 90px;
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
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);
}

.thumb-placeholder .svg-inline--fa {
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

    .svg-inline--fa {
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

.events-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.events-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.events-card {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: 10px;
  background: var(--bg-hover, #f8fafc);
  min-height: 88px;
}

.events-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  margin-bottom: 8px;
}

.events-count {
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--primary-color, #03a9f4);
  background: var(--primary-light, rgba(3, 169, 244, 0.12));
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.events-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
}

.events-index {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
}

.events-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.events-title-text {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-name-sub {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-type {
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.events-empty {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
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

  .svg-inline--fa {
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
