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
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >add</span
            >
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
            action-text="查看详情"
            action-icon="visibility"
            type-icon="corporate_fare"
            placeholder-icon="school"
            :show-checkbox="false"
            @view="openDetail(item)"
            @action="openDetail(item)"
          ></StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">学校名称</div>
          <div class="col-principal">校长</div>
          <div class="col-date">创建日期</div>
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
                <span class="material-symbols-outlined">corporate_fare</span>
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
              <span class="material-symbols-outlined actions-icon"
                >more_horiz</span
              >
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)"
                    >查看详情</el-dropdown-item
                  >
                  <el-dropdown-item @click="deletedWindow(item)"
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            icon="school"
            :text="$t('manager.messages.noSchools') || '暂无学校'"
            :action-text="$t('manager.createSchool')"
            @action="addSchool"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      ></PagePagination>

      <!-- Detail Panel (Read-only for now) -->
      <DetailPanel
        v-model="detailVisible"
        title="学校详情"
        :name="currentSchool?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        placeholder-icon="corporate_fare"
        :show-delete="true"
        delete-text="删除学校"
        @delete="handleDelete"
        @close="handlePanelClose"
      ></DetailPanel>
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
    { label: "学校名称", value: currentSchool.value.name },
    {
      label: "校长",
      value:
        currentSchool.value.principal?.nickname ||
        currentSchool.value.principal?.username ||
        "—",
    },
    { label: "地址", value: currentSchool.value.address || "—" },
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
  Message.info("创建学校功能暂未开放（请使用原管理后台）");
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
