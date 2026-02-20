<template>
  <TransitionWrapper>
    <div class="student-list">
      <PageActionBar :title="$t('manager.studentManagement')" :search-placeholder="$t('ui.search')"
        @search="handleSearch" @sort-change="handleSortChange" @view-change="handleViewChange">
        <template #actions>
          <el-button type="primary" @click="addStudent">
            <font-awesome-icon :icon="['fas', 'plus']" style="font-size: 18px; margin-right: 4px" />
            {{ $t("manager.createStudent") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.user?.avatar?.url" :title="item.user?.nickname || item.user?.username || '—'"
            :action-text="$t('manager.ui.viewDetail')" action-icon="visibility" type-icon="person"
            placeholder-icon="person" :show-checkbox="false" @view="openDetail(item)" @action="openDetail(item)">
          </StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ $t("common.name") }}</div>
          <div class="col-school">{{ $t("manager.ui.affiliatedSchool") }}</div>
          <div class="col-class">{{ $t("manager.ui.currentClass") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img v-if="item.user?.avatar?.url" :src="item.user.avatar.url" :alt="item.user.nickname" />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon :icon="['fas', 'user']" />
              </div>
            </div>
            <span class="item-name">{{
              item.user?.nickname || item.user?.username || "—"
            }}</span>
          </div>
          <div class="col-school">{{ item.school?.name || "—" }}</div>
          <div class="col-class">{{ item.eduClass?.name || "—" }}</div>
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
          <EmptyState icon="person" :text="$t('manager.ui.noStudents')" :action-text="$t('manager.createStudent')"
            @action="addStudent"></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange">
      </PagePagination>

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" :title="$t('manager.ui.studentDetail')"
        :name="currentStudent?.user?.nickname || ''" :loading="detailLoading" :properties="detailProperties"
        placeholder-icon="person" :show-delete="true" :delete-text="$t('manager.ui.removeFromSchool')"
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
import { getStudents, deleteStudent } from "@/api/v1/edu-student";
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
    await getStudents(
      params.sort,
      params.search,
      params.page,
      "user,school,eduClass,user.avatar"
    ),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
interface Student {
  id: number;
  student_id?: string;
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
  eduClass?: {
    name: string;
  };
}

const currentStudent = ref<Student | null>(null);

const detailProperties = computed(() => {
  if (!currentStudent.value) return [];
  return [
    {
      label: t("manager.ui.studentName"),
      value:
        currentStudent.value.user?.nickname ||
        currentStudent.value.user?.username ||
        "—",
    },
    { label: t("manager.ui.affiliatedSchool"), value: currentStudent.value.school?.name || "—" },
    { label: t("manager.ui.currentClass"), value: currentStudent.value.eduClass?.name || "—" },
    { label: t("common.username"), value: currentStudent.value.student_id || "—" },
  ];
});

const openDetail = (item: Student) => {
  currentStudent.value = item;
  detailVisible.value = true;
};

const handlePanelClose = () => {
  currentStudent.value = null;
};

const addStudent = () => {
  Message.info(t("manager.ui.addStudentPending"));
};

const handleDelete = async () => {
  if (!currentStudent.value) return;
  try {
    await MessageBox.confirm(t("manager.ui.removeStudentConfirm"), t("manager.ui.removeConfirmTitle"), {
      type: "warning",
    });
    await deleteStudent(currentStudent.value.id);
    detailVisible.value = false;
    refresh();
    Message.success(t("manager.messages.removeSuccess"));
  } catch { }
};

const deletedWindow = async (item: Student) => {
  try {
    await MessageBox.confirm(t("manager.ui.removeStudentConfirm"), t("manager.ui.removeConfirmTitle"), {
      type: "warning",
    });
    await deleteStudent(item.id);
    refresh();
    Message.success(t("manager.messages.removeSuccess"));
  } catch { }
};
</script>

<style scoped lang="scss">
.student-list {
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

.col-class {
  width: 150px;
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
