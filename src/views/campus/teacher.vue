<template>
  <TransitionWrapper>
    <div class="teacher-list">
      <PageActionBar :title="$t('manager.teacherManagement')" :search-placeholder="$t('ui.search')"
        @search="handleSearch" @sort-change="handleSortChange" @view-change="handleViewChange">
        <template #actions>
          <el-button type="primary" @click="addTeacher">
            <font-awesome-icon :icon="['fas', 'plus']" style="font-size: 18px; margin-right: 4px" />
            {{ $t("manager.createTeacher") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.user?.avatar?.url" :title="item.user?.nickname || item.user?.username || '—'"
            :action-text="$t('manager.ui.viewDetail')" action-icon="visibility" type-icon="person_4"
            placeholder-icon="person" :show-checkbox="false" @view="openDetail(item)" @action="openDetail(item)">
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
              <img v-if="item.user?.avatar?.url" :src="item.user.avatar.url" :alt="item.user.nickname" />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'user-tie']" />
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
              <font-awesome-icon :icon="['fas', 'ellipsis']" class="actions-icon" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{ $t("manager.ui.viewDetail") }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">{{ $t("manager.list.remove") }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState icon="person_4" :text="$t('manager.ui.noTeachers')" :action-text="$t('manager.createTeacher')"
            @action="addTeacher"></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange">
      </PagePagination>

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" :title="$t('manager.ui.teacherDetail')"
        :name="currentTeacher?.user?.nickname || ''" :loading="detailLoading" :properties="detailProperties"
        placeholder-icon="person_4" :show-delete="true" :delete-text="$t('manager.ui.removeFromSchool')"
        @delete="handleDelete" @close="handlePanelClose"></DetailPanel>
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
import { getTeachers, deleteTeacher } from "@/api/v1/edu-teacher";
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
    await getTeachers(
      params.sort,
      params.search,
      params.page,
      "user,school,user.avatar"
    ),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
interface Teacher {
  id: number;
  subject?: string;
  phone?: string;
  user?: {
    nickname?: string;
    username?: string;
    avatar?: {
      url: string;
    };
  };
  school?: {
    name: string;
  };
}

const currentTeacher = ref<Teacher | null>(null);

const detailProperties = computed(() => {
  if (!currentTeacher.value) return [];
  return [
    {
      label: t("manager.ui.teacherName"),
      value:
        currentTeacher.value.user?.nickname ||
        currentTeacher.value.user?.username ||
        "—",
    },
    { label: t("manager.ui.affiliatedSchool"), value: currentTeacher.value.school?.name || "—" },
    { label: t("manager.teacher.subject"), value: currentTeacher.value.subject || "—" },
    { label: t("manager.teacher.phone"), value: currentTeacher.value.phone || "—" },
  ];
});

const openDetail = (item: Teacher) => {
  currentTeacher.value = item;
  detailVisible.value = true;
};

const handlePanelClose = () => {
  currentTeacher.value = null;
};

const addTeacher = () => {
  Message.info(t("manager.ui.inviteTeacherPending"));
};

const handleDelete = async () => {
  if (!currentTeacher.value) return;
  try {
    await MessageBox.confirm(t("manager.ui.removeTeacherConfirm"), t("manager.ui.removeConfirmTitle"), {
      type: "warning",
    });
    await deleteTeacher(currentTeacher.value.id);
    detailVisible.value = false;
    refresh();
    Message.success(t("manager.messages.removeSuccess"));
  } catch { }
};

const deletedWindow = async (item: Teacher) => {
  try {
    await MessageBox.confirm(t("manager.ui.removeTeacherConfirm"), t("manager.ui.removeConfirmTitle"), {
      type: "warning",
    });
    await deleteTeacher(item.id);
    refresh();
    Message.success(t("manager.messages.removeSuccess"));
  } catch { }
};
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
