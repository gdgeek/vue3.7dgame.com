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
              <el-button type="danger" link :loading="leavingRecordId === record.id" @click="handleLeaveClass(record)">
                {{ $t('route.personalCenter.campus.leaveClass') }}
              </el-button>
            </div>
          </div>

          <!-- Group List Section - Embedded under class header -->
          <div class="group-section">
            <ClassGroupList :ref="el => setGroupListRef(record.class?.id || record.eduClass?.id, el)"
              :class-id="record.class?.id || record.eduClass?.id || 0" :my-groups="record.groups || []"
              :joining-group-id="joiningGroupId" @join-group="(group) => handleJoinGroup(group, record)"
              @create-group="() => openGroupDialog(record)" @edit-group="(group) => openGroupDialog(record, group)"
              @delete-group="(group) => handleDeleteGroup(group, record)"
              @enter-group="(group) => handleEnterGroup(group)" />
          </div>
          <br />
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

    <!-- Create/Edit Group Dialog -->
    <el-dialog v-model="groupDialogVisible"
      :title="groupForm.id ? $t('common.edit') : $t('route.personalCenter.campus.createGroup')" width="500px">
      <el-form :model="groupForm" label-width="100px">
        <el-form-item :label="$t('common.name')" required>
          <el-input v-model="groupForm.name" :placeholder="$t('route.personalCenter.campus.groupNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="groupForm.description" type="textarea"
            :placeholder="$t('route.personalCenter.campus.groupDescPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('route.personalCenter.campus.groupImage')">
          <ImageSelector :item-id="groupForm.id || undefined" :image-url="groupForm.imageUrl"
            @image-selected="handleGroupImageSelected" @image-upload-success="handleGroupImageSelected" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="savingGroup" @click="handleSaveGroup">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { OfficeBuilding, Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useUserStoreHook } from "@/store/modules/user";
import Id2Image from "@/components/Id2Image.vue";
import ClassGroupList from './components/ClassGroupList.vue';
import ImageSelector from '@/components/MrPP/ImageSelector.vue';
import { getClasses, getClassGroups, createClassGroup } from '@/api/v1/edu-class';
import { deleteStudent, getStudentMe, joinClass } from '@/api/v1/edu-student';
import { deleteGroup, joinGroup, updateGroup } from '@/api/v1/group';
import type { EduClass } from '@/api/v1/types/edu-class';
import type { Group } from '@/api/v1/types/group';

const { t } = useI18n();

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

// Group dialog state
const groupDialogVisible = ref(false);
const savingGroup = ref(false);
const joiningGroupId = ref<number | null>(null);
const currentEditingRecord = ref<StudentRecord | null>(null);
const groupForm = ref({
  id: null as number | null,
  name: '',
  description: '',
  image_id: null as number | null,
  imageUrl: ''
});

// Store refs for each ClassGroupList by classId
const groupListRefs = ref<Map<number, InstanceType<typeof ClassGroupList> | null>>(new Map());

const setGroupListRef = (classId: number | undefined, el: any) => {
  if (classId) {
    groupListRefs.value.set(classId, el);
  }
};

// Get set of joined class IDs
const joinedClassIds = computed(() => new Set(studentRecords.value.map(r => r.eduClass?.id || r.class?.id).filter(Boolean)));
const isJoined = (classId: number) => joinedClassIds.value.has(classId);

const fetchStudentRecords = async () => {
  loading.value = true;
  try {
    const response = await getStudentMe('-created_at', '', 1, 'class,school');
    const data = response.data;
    const records = (Array.isArray(data) ? data : (data ? [data] : [])) as unknown as StudentRecord[];

    // Fetch groups for each class record
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

// Apply dialog logic
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

// Group dialog logic
const openGroupDialog = (record: StudentRecord, group?: Group) => {
  currentEditingRecord.value = record;
  if (group) {
    // Edit mode
    groupForm.value = {
      id: group.id,
      name: group.name,
      description: group.description || '',
      image_id: (group as any).image_id || null,
      imageUrl: group.image?.url || ''
    };
    if (!groupForm.value.image_id && group.image) {
      groupForm.value.image_id = group.image.id;
    }
  } else {
    // Create mode
    const userStore = useUserStoreHook();
    const userName = userStore.userInfo?.userData?.nickname || userStore.userInfo?.userData?.username || userStore.userInfo?.userData?.email;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const defaultName = `${t('route.personalCenter.campus.defaultGroupName', { name: userName })} ${dateStr}`;
    groupForm.value = { id: null, name: defaultName, description: '', image_id: null, imageUrl: '' };
  }
  groupDialogVisible.value = true;
};

const handleGroupImageSelected = (data: { imageId: number; itemId: number | null; imageUrl?: string }) => {
  groupForm.value.image_id = data.imageId;
  groupForm.value.imageUrl = data.imageUrl || '';
};

const handleSaveGroup = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning(t('route.personalCenter.campus.groupNameRequired'));
    return;
  }

  const record = currentEditingRecord.value;
  if (!record) return;

  const classId = record.class?.id || record.eduClass?.id;
  if (!classId) return;

  savingGroup.value = true;
  try {
    if (groupForm.value.id) {
      // Edit
      await updateGroup(groupForm.value.id, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id ?? undefined
      });
      ElMessage.success(t('common.updateSuccess'));
    } else {
      // Create
      await createClassGroup(classId, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id ?? undefined
      });
      ElMessage.success(t('common.createSuccess'));
    }
    groupDialogVisible.value = false;
    // Refresh groups for this record
    await refreshRecordGroups(record);
    // Refresh the ClassGroupList component
    const listRef = groupListRefs.value.get(classId);
    listRef?.refresh();
  } catch (error: any) {
    console.error('Failed to save group:', error);
    const errorMsg = error.response?.data?.message || (groupForm.value.id ? t('common.operationFailed') : t('common.createFailed'));
    ElMessage.error(errorMsg);
  } finally {
    savingGroup.value = false;
  }
};

const handleJoinGroup = async (group: Group, record: StudentRecord) => {
  joiningGroupId.value = group.id;
  const classId = record.class?.id || record.eduClass?.id;
  try {
    await joinGroup(group.id);
    ElMessage.success(t('route.personalCenter.campus.joinSuccess'));
    await refreshRecordGroups(record);
    if (classId) {
      const listRef = groupListRefs.value.get(classId);
      listRef?.refresh();
    }
  } catch (error: any) {
    console.error('Failed to join group:', error);
    const errorMsg = error.response?.data?.message || t('route.personalCenter.campus.joinFailed');
    ElMessage.error(errorMsg);
  } finally {
    joiningGroupId.value = null;
  }
};

const handleDeleteGroup = async (group: Group, record: StudentRecord) => {
  const classId = record.class?.id || record.eduClass?.id;
  try {
    await ElMessageBox.confirm(
      t('route.personalCenter.campus.confirmDeleteGroup'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    await deleteGroup(group.id);
    ElMessage.success(t('common.deleteSuccess'));
    await refreshRecordGroups(record);
    if (classId) {
      const listRef = groupListRefs.value.get(classId);
      listRef?.refresh();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete group:', error);
      const errorMsg = error.response?.data?.message || t('common.deleteFailed');
      ElMessage.error(errorMsg);
    }
  }
};

const handleEnterGroup = (group: Group) => {
  // Navigate to group page or open group details
  // For now, we'll navigate to the group page with group_id
  ElMessage.info(t('route.personalCenter.campus.enteringGroup') || `进入小组: ${group.name}`);
  // TODO: Implement actual navigation when group detail page is ready
  // router.push({ path: '/campus/group/detail', query: { group_id: group.id } });
};

const refreshRecordGroups = async (record: StudentRecord) => {
  const classId = record.class?.id || record.eduClass?.id;
  if (!classId) return;
  try {
    const myGroupRes = await getClassGroups(classId, '-created_at', '', 1, 'image,user');
    const groupData = myGroupRes.data;
    if (Array.isArray(groupData)) {
      record.groups = groupData;
    } else {
      record.groups = groupData ? [groupData] : [];
    }
  } catch (e) {
    console.error(`Failed to refresh groups for class ${classId}`, e);
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

.group-section {
  padding: 16px 20px;
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
