<template>
  <TransitionWrapper>
    <div class="phototype-index">
      <PageActionBar
        :title="t('phototype.listPageTitle')"
        :search-placeholder="t('ui.search')"
        :selection-count="selectedCount"
        :is-page-selected="isPageSelected"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
        @batch-delete="handleBatchDelete"
        @cancel-selection="handleCancelSelection"
        @select-all-page="handleSelectAllPage"
        @cancel-select-all-page="handleCancelSelectAllPage"
      >
        <template #actions>
          <el-button type="primary" @click="addPrefab">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ $t("phototype.create") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        @row-click="(item) => edit(item.id)"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.title || t('ui.unnamed')"
            :meta="{ date: formatItemDate(item.updated_at || item.created_at) }"
            :selected="isSelected(item.id!)"
            :selection-mode="hasSelection"
            :type-icon="['fas', 'cubes']"
            :placeholder-icon="['fas', 'cubes']"
            @view="edit(item.id)"
            @select="() => toggleSelection(item.id!)"
          ></StandardCard>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox" @click.stop>
            <el-checkbox
              :model-value="isSelected(item.id!)"
              @change="() => toggleSelection(item.id!)"
            ></el-checkbox>
          </div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="toHttps(item.image.url)"
                :alt="item.title"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'cubes']"></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.title || "—" }}</span>
          </div>
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
                  <el-dropdown-item @click="edit(item.id)">
                    {{ $t("meta.enter") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">
                    {{ t("common.edit") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => {})">
                    {{ t("common.delete") }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'cubes']"
            :text="t('phototype.emptyText')"
            :action-text="t('phototype.create')"
            @action="addPrefab"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Edit Dialog -->
      <el-dialog
        v-model="editDialogVisible"
        :title="$t('common.edit') || 'Edit'"
        width="500px"
        append-to-body
        destroy-on-close
      >
        <el-form :model="editForm" label-width="80px">
          <el-form-item :label="$t('phototype.prompt.message2') || 'Name'">
            <el-input
              v-model="editForm.title"
              :placeholder="$t('phototype.prompt.message1')"
            ></el-input>
          </el-form-item>
          <el-form-item :label="$t('resource.type.picture')">
            <ImageSelector
              :item-id="Number(editForm.id) || null"
              :image-url="editForm.image_url"
              @image-selected="handleEditImageSelected"
              @image-upload-success="handleEditImageSelected"
            ></ImageSelector>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="editDialogVisible = false">{{
              $t("common.cancel") || "Cancel"
            }}</el-button>
            <el-button type="primary" @click="saveEdit">{{
              $t("common.confirm") || "Confirm"
            }}</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import {
  getPhototypes,
  deletePhototype,
  putPhototype,
} from "@/api/v1/phototype";
import type { PhototypeType } from "@/api/v1/phototype";
import type { UpdatePhototypeRequest } from "@/api/v1/types/phototype";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import type { SelectableItem } from "@/composables/useSelection";
import { toHttps } from "@/utils/helper";

const { t } = useI18n();
const router = useRouter();

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
} = usePageData<PhototypeType>({
  fetchFn: async (params) => {
    return await getPhototypes(params.sort, params.search, params.page);
  },
});

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

// Helper: filter items with valid id for selection operations
const selectableItems = computed((): SelectableItem[] => {
  const list = items.value as PhototypeType[] | null;
  const result: SelectableItem[] = [];
  for (const item of list || []) {
    if (item.id !== undefined) {
      result.push({ id: item.id });
    }
  }
  return result;
});

const isPageSelected = computed(() => {
  const valid = selectableItems.value;
  if (valid.length === 0) return false;
  return valid.every((item) => isSelected(item.id));
});

const handleSelectAllPage = () => {
  if (selectableItems.value.length > 0) {
    selectItems(selectableItems.value);
  }
};

const handleCancelSelectAllPage = () => {
  if (selectableItems.value.length > 0) {
    deselectItems(selectableItems.value);
  }
};

// Navigation
const edit = (id: number | undefined) => {
  if (id === undefined) return;
  router.push({ path: "/phototype/edit", query: { id } });
};

const addPrefab = () => {
  router.push("/phototype/edit");
};

// Edit dialog
const editDialogVisible = ref(false);
const editForm = ref({
  id: undefined as number | undefined,
  title: "",
  image_id: 0,
  image_url: "",
});

const namedWindow = (item: PhototypeType) => {
  editForm.value = {
    id: item.id,
    title: item.title || "",
    image_id: item.image?.id || 0,
    image_url: item.image?.url || "",
  };
  editDialogVisible.value = true;
};

const handleEditImageSelected = (data: {
  imageId: number;
  imageUrl?: string;
}) => {
  editForm.value.image_id = data.imageId;
  if (data.imageUrl) {
    editForm.value.image_url = data.imageUrl;
  }
};

const saveEdit = async () => {
  try {
    if (!editForm.value.title) {
      Message.warning(t("phototype.prompt.error1"));
      return;
    }

    const updateData: UpdatePhototypeRequest = {
      title: editForm.value.title,
    };

    if (editForm.value.image_id) {
      updateData.image_id = editForm.value.image_id;
    }

    if (editForm.value.id === undefined) {
      Message.warning(t("common.invalidData") || "Invalid Data");
      return;
    }

    await putPhototype(editForm.value.id, updateData);

    Message.success(t("common.updateSuccess") || "Update Successful");
    editDialogVisible.value = false;
    refresh();
  } catch (error) {
    logger.error("Failed to update:", error);
    Message.error(t("common.updateFailed") || "Update Failed");
  }
};

// Delete
const deletedWindow = async (item: PhototypeType, resetLoading: () => void) => {
  if (item.id === undefined) return;
  try {
    await MessageBox.confirm(
      t("phototype.confirm.message1"),
      t("phototype.confirm.message2"),
      {
        confirmButtonText: t("phototype.confirm.confirm"),
        cancelButtonText: t("phototype.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePhototype(item.id);
    refresh();
    Message.success(t("phototype.confirm.success"));
  } catch {
    Message.info(t("phototype.confirm.info"));
    resetLoading();
  }
};

// Batch operations
const handleBatchDelete = async () => {
  const selected = getSelectedItems(selectableItems.value);
  try {
    await MessageBox.confirm(
      t("ui.batchDeleteConfirm", {
        count: selected.length,
        resource: t("phototype.typeName"),
      }),
      t("ui.batchDeleteTitle"),
      {
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );

    for (const item of selected) {
      await deletePhototype(String(item.id));
    }

    clearSelection();
    refresh();
    Message.success(
      t("ui.batchDeleteSuccess", {
        count: selected.length,
        resource: t("phototype.typeName"),
      })
    );
  } catch {
    Message.info(t("ui.cancelDelete"));
  }
};

const handleCancelSelection = () => {
  clearSelection();
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.phototype-index {
  padding: 20px;
}

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

.col-date {
  flex-shrink: 0;
  width: 120px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
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
</style>
