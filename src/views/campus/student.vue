<template>
  <TransitionWrapper>
    <div class="student-list">
      <PageActionBar :title="$t('manager.studentManagement')" search-placeholder="搜索学生姓名..." @search="handleSearch"
        @sort-change="handleSortChange" @view-change="handleViewChange">
        <template #actions>
          <el-button type="primary" @click="addStudent">
            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
            添加学生
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.user?.avatar?.url" :title="item.user?.nickname || item.user?.username || '学生'"
            action-text="查看详情" action-icon="visibility" type-icon="person" placeholder-icon="person"
            :show-checkbox="false" @view="openDetail(item)" @action="openDetail(item)" />
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">姓名</div>
          <div class="col-school">所属学校</div>
          <div class="col-class">当前班级</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img v-if="item.user?.avatar?.url" :src="item.user.avatar.url" :alt="item.user.nickname" />
              <div v-else class="thumb-placeholder"><span class="material-symbols-outlined">person</span></div>
            </div>
            <span class="item-name">{{ item.user?.nickname || item.user?.username || '—' }}</span>
          </div>
          <div class="col-school">{{ item.school?.name || '—' }}</div>
          <div class="col-class">{{ item.eduClass?.name || '—' }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <span class="material-symbols-outlined actions-icon">more_horiz</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">查看详情</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">移除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState icon="person" text="暂无学生" action-text="添加学生" @action="addStudent" />
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange" />

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" title="学生详情" :name="currentStudent?.user?.nickname || ''"
        :loading="detailLoading" :properties="detailProperties" placeholder-icon="person" :show-delete="true"
        delete-text="从学校移除" @delete="handleDelete" @close="handlePanelClose" />
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { PageActionBar, ViewContainer, PagePagination, EmptyState, StandardCard, DetailPanel } from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getStudents, deleteStudent } from "@/api/v1/edu-student";
import { usePageData } from "@/composables/usePageData";

const { t } = useI18n();

const {
  items, loading, pagination, viewMode, totalPages,
  refresh, handleSearch, handleSortChange, handlePageChange, handleViewChange,
} = usePageData({
  fetchFn: async (params) => await getStudents(params.sort, params.search, params.page, "user,school,eduClass,user.avatar"),
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentStudent = ref<any>(null);

const detailProperties = computed(() => {
  if (!currentStudent.value) return [];
  return [
    { label: '学生姓名', value: currentStudent.value.user?.nickname || currentStudent.value.user?.username || '—' },
    { label: '所属学校', value: currentStudent.value.school?.name || '—' },
    { label: '当前班级', value: currentStudent.value.eduClass?.name || '—' },
    { label: '学号', value: currentStudent.value.student_id || '—' },
  ];
});

const openDetail = (item: any) => {
  currentStudent.value = item;
  detailVisible.value = true;
};

const handlePanelClose = () => {
  currentStudent.value = null;
};

const addStudent = () => {
  Message.info("添加学生功能暂未开放");
};

const handleDelete = async () => {
  if (!currentStudent.value) return;
  try {
    await MessageBox.confirm("确定要移除该学生吗？", "移除确认", { type: "warning" });
    await deleteStudent(currentStudent.value.id);
    detailVisible.value = false;
    refresh();
    Message.success("移除成功");
  } catch { }
};

const deletedWindow = async (item: any) => {
  try {
    await MessageBox.confirm("确定要移除该学生吗？", "移除确认", { type: "warning" });
    await deleteStudent(item.id);
    refresh();
    Message.success("移除成功");
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
