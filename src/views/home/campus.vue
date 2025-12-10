<template>
  <TransitionWrapper>
    <div class="campus-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ $t('route.personalCenter.campus.title') }}</span>
          </div>
        </template>
        <el-tabs v-model="activeTab" class="campus-tabs">
          <!-- Teacher Tab -->
          <el-tab-pane :label="$t('route.personalCenter.campus.teacherTab')" name="teacher">
            <div v-loading="loadingTeacher" class="tab-content">
              <el-empty v-if="!loadingTeacher && teacherClasses.length === 0"
                :description="$t('route.personalCenter.campus.noClasses')" />
              <div v-else class="class-grid">
                <el-card v-for="item in teacherClasses" :key="item.id" class="class-card" shadow="hover">
                  <div class="class-image">
                    <Id2Image :id="item.id" :image="item.image?.url || null" :lazy="false" fit="cover" />
                  </div>
                  <div class="class-info">
                    <h4>{{ item.name || '-' }}</h4>
                    <p class="school-name">
                      <el-icon>
                        <OfficeBuilding />
                      </el-icon>
                      {{ item.school?.name || '-' }}
                    </p>
                  </div>
                </el-card>
              </div>
            </div>
          </el-tab-pane>

          <!-- Student Tab -->
          <el-tab-pane :label="$t('route.personalCenter.campus.studentTab')" name="student">
            <div v-loading="loadingStudent" class="tab-content">
              <!-- No classes - show apply button -->
              <div v-if="!loadingStudent && studentRecords.length === 0" class="empty-state">
                <el-empty :description="$t('route.personalCenter.campus.noClasses')">
                  <el-button type="primary" @click="showApplyDialog">
                    <el-icon>
                      <Plus />
                    </el-icon>
                    {{ $t('route.personalCenter.campus.applyClass') }}
                  </el-button>
                </el-empty>
              </div>
              <!-- Has classes - show class cards with leave button -->
              <div v-else class="class-grid">
                <el-card v-for="item in studentRecords" :key="item.id" class="class-card" shadow="hover">
                  <div class="class-image">
                    <Id2Image :id="item.eduClass?.id || item.id" :image="item.eduClass?.image?.url || null"
                      :lazy="false" fit="cover" />
                  </div>
                  <div class="class-info">
                    <h4>{{ item.eduClass?.name || '-' }}</h4>
                    <p class="school-name">
                      <el-icon>
                        <OfficeBuilding />
                      </el-icon>
                      {{ item.eduClass?.school?.name || '-' }}
                    </p>
                  </div>
                  <div class="class-actions">
                    <el-button type="danger" size="small" :loading="leavingRecordId === item.id"
                      @click="handleLeaveClass(item)">
                      {{ $t('route.personalCenter.campus.leaveClass') }}
                    </el-button>
                  </div>
                </el-card>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- Apply Class Dialog -->
      <el-dialog v-model="applyDialogVisible" :title="$t('route.personalCenter.campus.selectClass')" width="700px"
        :close-on-click-modal="false">
        <!-- Search and Sort Controls -->
        <div class="dialog-controls">
          <el-input v-model="searchKeyword" :placeholder="$t('route.personalCenter.campus.searchPlaceholder')"
            @keyup.enter="handleSearch" clearable class="search-input" @clear="handleSearch">
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
          <el-select v-model="sortOrder" class="sort-select" @change="handleSortChange">
            <el-option :label="$t('common.newest')" value="-created_at" />
            <el-option :label="$t('common.oldest')" value="created_at" />
            <el-option :label="$t('common.name')" value="name" />
          </el-select>
        </div>

        <!-- Class List -->
        <div v-loading="searchLoading" class="class-list">
          <el-empty v-if="!searchLoading && searchResults.length === 0"
            :description="$t('route.personalCenter.campus.noClasses')" />
          <div v-else class="class-list-items">
            <div v-for="item in searchResults" :key="item.id" class="class-list-item">
              <div class="class-list-image">
                <Id2Image :id="item.id" :image="item.image?.url || null" :lazy="false" fit="cover" />
              </div>
              <div class="class-list-info">
                <h4>{{ item.name }}</h4>
                <p>{{ item.school?.name || '-' }}</p>
              </div>
              <el-button v-if="isJoined(item.id)" type="info" size="small" disabled>
                {{ $t('route.personalCenter.campus.alreadyJoined') }}
              </el-button>
              <el-button v-else type="primary" size="small" :loading="applyingClassId === item.id"
                @click="handleApply(item)">
                {{ $t('route.personalCenter.campus.apply') }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalClasses > pageSize" class="pagination-container">
          <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="totalClasses"
            layout="prev, pager, next" @current-change="handlePageChange" />
        </div>

        <template #footer>
          <el-button @click="applyDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { OfficeBuilding, Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import Id2Image from "@/components/Id2Image.vue";
import { getMyTeacherClasses, getClasses } from '@/api/v1/edu-class';
import { createStudent, deleteStudent, getMyStudentRecords } from '@/api/v1/edu-student';
import type { EduClass } from '@/api/v1/types/edu-class';

const { t } = useI18n();

interface ClassWithSchool extends EduClass {
  school?: { id: number; name: string };
}

interface StudentRecord {
  id: number;
  eduClass?: ClassWithSchool;
}

const activeTab = ref('teacher');
const loadingTeacher = ref(false);
const loadingStudent = ref(false);
const teacherClasses = ref<ClassWithSchool[]>([]);
const studentRecords = ref<StudentRecord[]>([]);

// Apply dialog state
const applyDialogVisible = ref(false);
const searchKeyword = ref('');
const sortOrder = ref('-created_at');
const searchLoading = ref(false);
const searchResults = ref<ClassWithSchool[]>([]);
const applyingClassId = ref<number | null>(null);
const leavingRecordId = ref<number | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const totalClasses = ref(0);

// Get set of joined class IDs for quick lookup
const joinedClassIds = computed(() => new Set(studentRecords.value.map(r => r.eduClass?.id).filter(Boolean)));

const isJoined = (classId: number) => joinedClassIds.value.has(classId);

const fetchTeacherClasses = async () => {
  loadingTeacher.value = true;
  try {
    const response = await getMyTeacherClasses();
    teacherClasses.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch teacher classes:', error);
    teacherClasses.value = [];
  } finally {
    loadingTeacher.value = false;
  }
};

const fetchStudentRecords = async () => {
  loadingStudent.value = true;
  try {
    const response = await getMyStudentRecords();
    studentRecords.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch student records:', error);
    studentRecords.value = [];
  } finally {
    loadingStudent.value = false;
  }
};

const showApplyDialog = async () => {
  applyDialogVisible.value = true;
  searchKeyword.value = '';
  sortOrder.value = '-created_at';
  currentPage.value = 1;
  await fetchAllClasses();
};

const fetchAllClasses = async () => {
  searchLoading.value = true;
  try {
    const response = await getClasses(
      sortOrder.value,
      searchKeyword.value.trim(),
      currentPage.value,
      'image,school'
    );
    searchResults.value = response.data || [];
    // Get total count from response headers if available
    const total = response.headers?.['x-pagination-total-count'];
    totalClasses.value = total ? parseInt(total) : searchResults.value.length;
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    searchResults.value = [];
    totalClasses.value = 0;
  } finally {
    searchLoading.value = false;
  }
};

const handleSearch = async () => {
  currentPage.value = 1;
  await fetchAllClasses();
};

const handleSortChange = async () => {
  currentPage.value = 1;
  await fetchAllClasses();
};

const handlePageChange = async () => {
  await fetchAllClasses();
};

const handleApply = async (classItem: ClassWithSchool) => {
  applyingClassId.value = classItem.id;
  try {
    await createStudent({ class_id: classItem.id });
    ElMessage.success(t('route.personalCenter.campus.applySuccess'));
    // Refresh student records list
    await fetchStudentRecords();
  } catch (error: any) {
    console.error('Failed to apply to class:', error);
    const errorMsg = error.response?.data?.message || t('route.personalCenter.campus.applyFailed');
    ElMessage.error(errorMsg);
  } finally {
    applyingClassId.value = null;
  }
};

const handleLeaveClass = async (record: StudentRecord) => {
  try {
    await ElMessageBox.confirm(
      t('route.personalCenter.campus.confirmLeave'),
      t('route.personalCenter.campus.leaveClass'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    leavingRecordId.value = record.id;
    await deleteStudent(record.id);
    ElMessage.success(t('route.personalCenter.campus.leaveSuccess'));
    // Refresh student records list
    await fetchStudentRecords();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to leave class:', error);
      const errorMsg = error.response?.data?.message || t('route.personalCenter.campus.leaveFailed');
      ElMessage.error(errorMsg);
    }
  } finally {
    leavingRecordId.value = null;
  }
};

// Fetch data when tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'teacher' && teacherClasses.value.length === 0) {
    fetchTeacherClasses();
  } else if (newTab === 'student' && studentRecords.value.length === 0) {
    fetchStudentRecords();
  }
});

onMounted(() => {
  fetchTeacherClasses();
});
</script>

<style scoped lang="scss">
.campus-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.campus-tabs {
  min-height: 400px;
}

.tab-content {
  min-height: 300px;
  padding: 10px 0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.class-card {
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-4px);
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

.class-image {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;

  :deep(.image-wrapper) {
    width: 100%;
    height: 100%;
  }
}

.class-info {
  padding: 16px;

  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .school-name {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;

    .el-icon {
      font-size: 14px;
    }
  }
}

.class-actions {
  padding: 0 16px 16px;
  display: flex;
  justify-content: flex-end;
}

// Apply Dialog Styles
.dialog-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
}

.sort-select {
  width: 140px;
}

.class-list {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.class-list-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.class-list-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;

  :deep(.image-wrapper) {
    width: 100%;
    height: 100%;
  }
}

.class-list-info {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color);
}
</style>
