<template>
  <TransitionWrapper>
    <div class="school-list">
      <PageActionBar
        :title="$t('manager.schoolManagement')"
        :search-placeholder="$t('manager.form.namePlaceholder')"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #actions>
          <el-button type="primary" @click="addSchool">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("manager.createSchool") }}
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
            :title="item.name"
            :action-text="t('manager.ui.viewDetail')"
            :action-icon="['fas', 'eye']"
            :type-icon="['fas', 'building']"
            :placeholder-icon="['fas', 'building']"
            :show-checkbox="false"
            @view="openDetail(item)"
            @action="openDetail(item)"
          ></StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ t("manager.ui.schoolName") }}</div>
          <div class="col-principal">{{ t("manager.school.principal") }}</div>
          <div class="col-date">{{ t("manager.ui.createdDate") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'building']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.name || "—" }}</span>
          </div>
          <div class="col-principal">
            {{ item.principal?.nickname || item.principal?.username || "—" }}
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
                    t("manager.ui.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">{{
                    t("common.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'building']"
            :text="$t('manager.ui.noSchools')"
            :action-text="$t('manager.createSchool')"
            @action="addSchool"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Detail Panel (Read-only for now) -->
      <DetailPanel
        v-model="detailVisible"
        :title="t('manager.ui.schoolDetail')"
        :name="currentSchool?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'building']"
        :show-delete="true"
        :delete-text="t('common.delete')"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getSchools, deleteSchool } from "@/api/v1/edu-school";
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
    await getSchools(params.sort, params.search, params.page),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
interface School {
  id: number;
  name: string;
  address?: string;
  principal?: {
    nickname?: string;
    username?: string;
  };
  image?: {
    url: string;
  };
  created_at: string;
}

const currentSchool = ref<School | null>(null);

const detailProperties = computed(() => {
  if (!currentSchool.value) return [];
  return [
    { label: t("manager.ui.schoolName"), value: currentSchool.value.name },
    {
      label: t("manager.school.principal"),
      value:
        currentSchool.value.principal?.nickname ||
        currentSchool.value.principal?.username ||
        "—",
    },
    {
      label: t("manager.school.address"),
      value: currentSchool.value.address || "—",
    },
  ];
});

const openDetail = (item: School) => {
  currentSchool.value = item;
  detailVisible.value = true;
};

const handlePanelClose = () => {
  currentSchool.value = null;
};

const addSchool = () => {
  Message.info(t("manager.ui.createSchoolPending"));
};

const handleDelete = async () => {
  if (!currentSchool.value) return;
  try {
    await MessageBox.confirm(
      t("manager.confirm.deleteMessage"),
      t("manager.confirm.deleteTitle"),
      { type: "warning" }
    );
    await deleteSchool(currentSchool.value.id);
    detailVisible.value = false;
    refresh();
    Message.success(t("manager.messages.deleteSuccess"));
  } catch {}
};

const deletedWindow = async (item: School) => {
  try {
    await MessageBox.confirm(
      t("manager.confirm.deleteMessage"),
      t("manager.confirm.deleteTitle"),
      { type: "warning" }
    );
    await deleteSchool(item.id);
    refresh();
    Message.success(t("manager.messages.deleteSuccess"));
  } catch {}
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.school-list {
  padding: 20px;
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-principal {
  width: 150px;
  font-size: 14px;
  color: var(--text-secondary);
}

.col-date {
  width: 120px;
  text-align: right;
  font-size: 13px;
  color: var(--text-secondary);
}

.col-actions {
  width: 48px;
  text-align: center;
}

.item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.item-name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  font-size: 22px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;

  &:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }
}
</style>
