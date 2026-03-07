<template>
  <TransitionWrapper>
    <div class="teacher-list">
      <PageActionBar
        :title="$t('manager.teacherManagement')"
        :search-placeholder="$t('ui.search')"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #actions>
          <el-button type="primary" @click="addMember">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ $t("manager.createTeacher") }}
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
            :image="item.user?.avatar?.url"
            :title="item.user?.nickname || item.user?.username || '—'"
            :action-text="$t('manager.ui.viewDetail')"
            :action-icon="['fas', 'eye']"
            :type-icon="['fas', 'user']"
            :placeholder-icon="['fas', 'user']"
            :show-checkbox="false"
            @view="openDetail(item)"
            @action="openDetail(item)"
          >
          </StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ $t("common.name") }}</div>
          <div class="col-school">{{ $t("manager.ui.affiliatedSchool") }}</div>
          <div class="col-subject">{{ $t("manager.teacher.subject") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.user?.avatar?.url"
                :src="toHttps(item.user.avatar.url)"
                :alt="item.user.nickname"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'user-tie']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{
              item.user?.nickname || item.user?.username || "—"
            }}</span>
          </div>
          <div class="col-school">{{ item.school?.name || "—" }}</div>
          <div class="col-subject">{{ item.subject || "—" }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{
                    $t("manager.ui.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">{{
                    $t("manager.list.remove")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'user']"
            :text="$t('manager.ui.noTeachers')"
            :action-text="$t('manager.createTeacher')"
            @action="addMember"
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
        :title="$t('manager.ui.teacherDetail')"
        :name="currentMember?.user?.nickname || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'user']"
        :show-delete="true"
        :delete-text="$t('manager.ui.removeFromSchool')"
        @delete="handleDelete"
        @close="handlePanelClose"
      ></DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getTeachers, deleteTeacher } from "@/api/v1/edu-teacher";
import { useCampusMemberList } from "@/composables/useCampusMemberList";
import { toHttps } from "@/utils/helper";

interface Teacher {
  id: number;
  subject?: string;
  phone?: string;
  user?: {
    nickname?: string;
    username?: string;
    avatar?: { url: string };
  };
  school?: { name: string };
}

const {
  items,
  loading,
  pagination,
  viewMode,
  totalPages,
  detailVisible,
  detailLoading,
  currentMember,
  detailProperties,
  openDetail,
  handlePanelClose,
  addMember,
  handleDelete,
  deletedWindow,
  handleSearch,
  handleSortChange,
  handlePageChange,
  handleViewChange,
} = useCampusMemberList<Teacher>({
  fetchFn: async (params) =>
    await getTeachers(
      params.sort,
      params.search,
      params.page,
      "user,school,user.avatar"
    ),
  deleteFn: deleteTeacher,
  addPendingKey: "manager.ui.inviteTeacherPending",
  removeConfirmKey: "manager.ui.removeTeacherConfirm",
  detailPropertiesFn: (item, t) => [
    {
      label: t("manager.ui.teacherName"),
      value: item.user?.nickname || item.user?.username || "—",
    },
    {
      label: t("manager.ui.affiliatedSchool"),
      value: item.school?.name || "—",
    },
    {
      label: t("manager.teacher.subject"),
      value: item.subject || "—",
    },
    {
      label: t("manager.teacher.phone"),
      value: item.phone || "—",
    },
  ],
});
</script>

<style scoped lang="scss">
.teacher-list {
  padding: 20px;
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-school {
  width: 150px;
  font-size: 14px;
  color: var(--text-secondary);
}

.col-subject {
  width: 120px;
  font-size: 14px;
  color: var(--text-secondary);
}

.col-actions {
  width: 48px;
  text-align: center;
}

.item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
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
