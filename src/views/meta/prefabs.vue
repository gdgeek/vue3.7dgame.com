<template>
  <TransitionWrapper>
    <div class="prefabs-index">
      <PageActionBar
        :title="t('meta.title')"
        :search-placeholder="t('ui.search')"
        :selection-count="selectedCount"
        :is-page-selected="isPageSelected"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
        @batch-delete="isRoot ? handleBatchDelete() : undefined"
        @cancel-selection="handleCancelSelection"
        @select-all-page="handleSelectAllPage"
        @cancel-select-all-page="handleCancelSelectAllPage"
      >
        <template #actions>
          <el-button v-if="isRoot" type="primary" @click="addPrefab">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ t("meta.list.createAction") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        @row-click="(item) => router.push(url(item.id))"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.title || t('ui.unnamed')"
            :selected="isSelected(item.id)"
            :selection-mode="hasSelection"
            :type-icon="['fas', 'cubes']"
            :placeholder-icon="['fas', 'cubes']"
            @view="router.push(url(item.id))"
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
                :src="toHttps(item.image.url)"
                :alt="item.title"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'cubes']"></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.title || "—" }}</span>
          </div>
          <div class="col-actions" @click.stop>
            <el-dropdown v-if="isRoot" trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="editor(item.id)">
                    {{ $t("meta.edit") }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="del(item.id)">
                    {{ $t("meta.delete") }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'cubes']"
            :text="t('meta.emptyText')"
            :action-text="t('meta.list.createAction')"
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
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { computed } from "vue";
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
import { getPrefabs, deletePrefab } from "@/api/v1/prefab";
import { useUserStore } from "@/store/modules/user";
import { usePageData } from "@/composables/usePageData";
import { useSelection } from "@/composables/useSelection";
import { toHttps } from "@/utils/helper";
import type { PrefabData } from "@/api/v1/types/prefab";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();

const isRoot = computed(() => userStore.getRole() === userStore.RoleEnum.Root);

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
} = usePageData<PrefabData>({
  fetchFn: async (params) => {
    return await getPrefabs(params.sort, params.search, params.page);
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

const isPageSelected = computed(() => {
  if (!items.value || items.value.length === 0) return false;
  return items.value.every((item) => isSelected(item.id));
});

const handleSelectAllPage = () => {
  if (items.value && items.value.length > 0) {
    selectItems(items.value);
  }
};

const handleCancelSelectAllPage = () => {
  if (items.value && items.value.length > 0) {
    deselectItems(items.value);
  }
};

const url = (id: number) => {
  return `/meta-verse/prefab?id=${id}`;
};

const addPrefab = () => {
  router.push("/meta-verse/prefab");
};

const editor = (id: number) => {
  router.push({ path: "/meta-verse/prefab", query: { id } });
};

const del = async (id: number) => {
  try {
    await MessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePrefab(id);
    refresh();
    Message.success(t("meta.confirm.success"));
  } catch {
    Message.info(t("meta.confirm.info"));
  }
};

const handleBatchDelete = async () => {
  const selected = getSelectedItems(items.value || []);
  try {
    await MessageBox.confirm(
      t("ui.batchDeleteConfirm", {
        count: selected.length,
        resource: t("meta.title"),
      }),
      t("ui.batchDeleteTitle"),
      {
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );

    for (const item of selected) {
      await deletePrefab(Number(item.id));
    }

    clearSelection();
    refresh();
    Message.success(
      t("ui.batchDeleteSuccess", {
        count: selected.length,
        resource: t("meta.title"),
      })
    );
  } catch {
    Message.info(t("ui.cancelDelete"));
  }
};

const handleCancelSelection = () => {
  clearSelection();
};
</script>

<style scoped lang="scss">
.prefabs-index {
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
