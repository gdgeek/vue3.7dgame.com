<template>

  <div class="student-container">
    <div v-loading="loading">
      <!-- Has Classes: Show Class Headers -->
      <div v-if="!loading && studentRecords.length > 0" class="class-list">
        <div v-for="record in studentRecords" :key="record.id" class="class-wrapper">
          <div class="class-header">
            <div class="class-header-left">
              <div class="class-image">
                <Id2Image :id="record.class?.id || record.id" :image="record.class?.image?.url || null" :lazy="false"
                  fit="cover" />
              </div>
              <div class="class-info">
                <h3 class="class-name">{{ record.class?.name || 'No Class Name' }}</h3>
                <p class="school-name">
                  <el-icon>
                    <OfficeBuilding />
                  </el-icon>
                  {{ record.school?.name || record.class?.school?.name || '-' }}
                </p>
              </div>
            </div>
            <div class="class-header-right">
              <el-button type="primary" link @click="goToGroupPage(record)">
                <el-icon class="mr-1">
                  <Connection />
                </el-icon>
                {{ $t('route.personalCenter.campus.groupList') }}
                <span v-if="record.groups && record.groups.length" class="group-count">({{ record.groups.length
                }})</span>
              </el-button>
              <el-divider direction="vertical" />
              <el-button type="danger" link :loading="leavingRecordId === record.id" @click="handleLeaveClass(record)">
                {{ $t('route.personalCenter.campus.leaveClass') }}
              </el-button>
            </div>
          </div>

          <!-- Removed Group Section from here -->

        </div>
      </div>

      <!-- No Classes: Show Apply Button -->
      <el-empty v-else-if="!loading" :description="$t('route.personalCenter.campus.noClasses')">
        <el-button type="primary" size="large" @click="showApplyDialog">
          <el-icon>
            <Plus />
          </el-icon>
          {{ $t('route.personalCenter.campus.applyClass') }}
        </el-button>
      </el-empty>

    </div>

    <!-- Apply Class Dialog -->
    <el-dialog v-model="applyDialogVisible" :title="$t('route.personalCenter.campus.selectClass')" width="700px"
      :close-on-click-modal="false">
      <div class="dialog-controls">
        <el-input v-model="searchKeyword" :placeholder="$t('route.personalCenter.campus.searchPlaceholder')"
          @keyup.enter="handleSearch" clearable class="search-input" @clear="handleSearch">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

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

      <template #footer>
        <el-button @click="applyDialogVisible = false">{{ $t('common.cancel') }}</el-button>
      </template>
    </el-dialog>
    <!-- Removed Create/Edit Group Dialog from here -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { OfficeBuilding, Plus, Search, Connection } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Id2Image from "@/components/Id2Image.vue";
import { getClasses, getClassGroups } from '@/api/v1/edu-class';
import { deleteStudent, getStudentMe, joinClass } from '@/api/v1/edu-student';
import type { EduClass } from '@/api/v1/types/edu-class';
import type { Group } from '@/api/v1/types/group';

const { t } = useI18n();
const router = useRouter();

interface ClassWithSchool extends EduClass {
  school?: { id: number; name: string };
}

interface StudentRecord {
  id: number;
  eduClass?: ClassWithSchool;
  class?: ClassWithSchool;
  school?: { id: number; name: string };
  groups?: Group[];
  [key: string]: any;
}

const loading = ref(false);
const studentRecords = ref<StudentRecord[]>([]);
const leavingRecordId = ref<number | null>(null);

// Apply dialog state
const applyDialogVisible = ref(false);
const searchKeyword = ref('');
const searchLoading = ref(false);
const searchResults = ref<ClassWithSchool[]>([]);
const applyingClassId = ref<number | null>(null);

// Get set of joined class IDs
const joinedClassIds = computed(() => new Set(studentRecords.value.map(r => r.eduClass?.id || r.class?.id).filter(Boolean)));
const isJoined = (classId: number) => joinedClassIds.value.has(classId);

const fetchStudentRecords = async () => {
  loading.value = true;
  try {
    const response = await getStudentMe('-created_at', '', 1, 'class,school');
    const data = response.data;
    const records = (Array.isArray(data) ? data : (data ? [data] : [])) as unknown as StudentRecord[];

    // Fetch groups for each class record (just to show count or summary if needed, optional now)
    // We can keep it to show "Joined Groups: 2" or something, but for now just fetching logic is preserved
    // to not break StudentRecord interface if used elsewhere, but we won't display full list.
    await Promise.all(records.map(async (record) => {
      const classId = record.class?.id || record.eduClass?.id;
      if (classId) {
        try {
          const myGroupRes = await getClassGroups(classId, '-created_at', '', 1, 'image,user');
          const groupData = myGroupRes.data;
          if (Array.isArray(groupData)) {
            record.groups = groupData;
          } else {
            record.groups = groupData ? [groupData] : [];
          }
        } catch (e) {
          console.error(`Failed to fetch groups for class ${classId}`, e);
          record.groups = [];
        }
      }
    }));

    studentRecords.value = records;
  } catch (error) {
    console.error('Failed to fetch student records:', error);
    studentRecords.value = [];
  } finally {
    loading.value = false;
  }
};

const goToGroupPage = (record: StudentRecord) => {
  const classId = record.class?.id || record.eduClass?.id;
  if (classId) {
    router.push({
      path: '/campus/group',
      query: { class_id: classId }
    });
  }
};

// ... Apply dialog logic ...
const showApplyDialog = async () => {
  applyDialogVisible.value = true;
  searchKeyword.value = '';
  await fetchAllClasses();
};

const fetchAllClasses = async () => {
  searchLoading.value = true;
  try {
    const response = await getClasses('-created_at', searchKeyword.value.trim(), 1, 'image,school');
    searchResults.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
};

const handleSearch = async () => {
  await fetchAllClasses();
};

const handleApply = async (classItem: ClassWithSchool) => {
  applyingClassId.value = classItem.id;
  try {
    await joinClass({ class_id: classItem.id });
    ElMessage.success(t('route.personalCenter.campus.applySuccess'));
    applyDialogVisible.value = false;
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

onMounted(() => {
  fetchStudentRecords();
});
</script>

<style scoped lang="scss">
.student-container {
  padding: 20px;
  min-height: 400px;
}

.class-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.class-wrapper {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.class-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
}

.class-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.class-image {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.class-info {
  flex: 1;
  min-width: 0;

  .class-name {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .school-name {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.class-header-right {
  flex-shrink: 0;
  margin-left: 20px;
}

.group-count {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 8px;
}

.my-group-tag {
  margin-right: auto;
}

.dialog-controls {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
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

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.class-list-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.class-list-info {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
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
</style>
