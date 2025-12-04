<template>
  <CardListPage ref="cardListPageRef" :fetch-data="fetchClasses" wrapper-class="class-management" :show-empty="true"
    @refresh="handleRefresh">
    <template #header-actions>
      <el-button-group :inline="true">
        <el-button size="small" type="primary" @click="handleCreate">
          <font-awesome-icon icon="plus"></font-awesome-icon>
          &nbsp;
          <span class="hidden-sm-and-down">{{ $t("manager.createClass") }}</span>
        </el-button>
      </el-button-group>
    </template>

    <!-- School Info Card (before cards) -->
    <template #before-cards>
      <div v-if="schoolId && currentSchool" style="margin-bottom: 20px;">
        <el-card shadow="hover" :body-style="{ padding: '20px', display: 'flex', alignItems: 'center' }">
          <div style="width: 100px; height: 100px; margin-right: 20px; flex-shrink: 0;">
            <Id2Image :id="currentSchool.id" :image="currentSchool.image?.url || null" :lazy="false" />
          </div>
          <div style="flex-grow: 1;">
            <h2 style="margin: 0 0 10px 0;">{{ currentSchool.name }}</h2>
            <p style="margin: 0; color: #666;">
              <span style="margin-right: 20px;">
                <strong>{{ $t('manager.school.principal') }}:</strong>
                {{ (currentSchool.principal as any)?.nickname || (currentSchool.principal as any)?.username || '-' }}
              </span>
              <span>
                <strong>{{ $t('manager.school.address') }}:</strong>
                {{ currentSchool.info?.address || '-' }}
              </span>
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">
              {{ currentSchool.info?.description || '-' }}
            </p>
          </div>
        </el-card>
      </div>
      <div v-else-if="schoolId" style="margin-bottom: 20px;">
        <el-tag closable @close="clearSchoolFilter">
          {{ $t('manager.class.filteringBySchool') }}: {{ schoolId }}
        </el-tag>
      </div>
    </template>

    <template #card="{ item }">
      <MrPPCard :item="item" @named="handleEdit" @deleted="handleDeleteWithCallback">
        <div style="padding: 10px; font-size: 12px; color: #666;">
          <div v-for="teacher in (item.eduTeachers || []).slice(0, 3)" :key="teacher.id" style="margin-bottom: 2px;">
            {{ teacher.user.nickname || teacher.user.username }}
          </div>
          <div v-if="(item.eduTeachers || []).length > 3" style="color: #999;">...</div>
        </div>
        <template #enter>
          <el-button-group>
            <el-button type="primary" size="small" @click="handleViewTeachers(item)">
              {{ $t('manager.class.teacher') }}
            </el-button>
            <el-button type="success" size="small" @click="handleViewStudents(item)">
              {{ $t('manager.class.student') }}
            </el-button>
          </el-button-group>
        </template>
      </MrPPCard>
    </template>

    <template #dialogs>
      <!-- Edit Class Dialog -->
      <el-dialog v-model="editDialogVisible" :title="$t('manager.class.dialog.editTitle')" width="500px"
        :close-on-click-modal="false">
        <el-form :model="editForm" label-width="120px">
          <el-form-item :label="$t('manager.class.form.name')">
            <el-input v-model="editForm.name" :placeholder="$t('manager.class.form.namePlaceholder')" />
          </el-form-item>
          <el-form-item :label="$t('manager.class.form.image')">
            <ImageSelector :item-id="editForm.id" :image-url="editForm.imageUrl" @image-selected="handleImageSelected"
              @image-upload-success="handleImageSelected" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
          <el-button type="primary" @click="handleSaveEdit">{{ $t('manager.form.submit') }}</el-button>
        </template>
      </el-dialog>

      <!-- Teacher List Dialog -->
      <el-dialog v-model="teacherDialogVisible" :title="$t('manager.class.teacherList')" width="600px" append-to-body>
        <div style="margin-bottom: 10px;">
          <el-button type="primary" size="small" @click="handleAddTeacher">
            <el-icon>
              <Plus />
            </el-icon> {{ $t('common.add') }}
          </el-button>
        </div>
        <el-table :data="teachers" v-loading="teachersLoading">
          <el-table-column prop="user.username" :label="$t('common.username')" />
          <el-table-column prop="user.nickname" :label="$t('common.nickname')" />
          <el-table-column :label="$t('meta.actions')" width="100">
            <template #default="{ row }">
              <el-button type="danger" size="small" link @click="handleRemoveTeacher(row)">
                {{ $t('manager.list.remove') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <el-button @click="teacherDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
        </template>
      </el-dialog>

      <!-- Student List Dialog -->
      <el-dialog v-model="studentDialogVisible" :title="$t('manager.class.studentList')" width="600px" append-to-body>
        <div style="margin-bottom: 10px;">
          <el-button type="primary" size="small" @click="handleAddStudent">
            <el-icon>
              <Plus />
            </el-icon> {{ $t('common.add') }}
          </el-button>
        </div>
        <el-table :data="students" v-loading="studentsLoading">
          <el-table-column prop="user.username" :label="$t('common.username')" />
          <el-table-column prop="user.nickname" :label="$t('common.nickname')" />
          <el-table-column :label="$t('meta.actions')" width="100">
            <template #default="{ row }">
              <el-button type="danger" size="small" link @click="handleRemoveStudent(row)">
                {{ $t('manager.list.remove') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <el-button @click="studentDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
        </template>
      </el-dialog>

      <!-- User Selection Dialog -->
      <UserSelector v-model="userDialogVisible" :title="userDialogTitle" @select="handleSelectUser" />
    </template>
  </CardListPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import Id2Image from '@/components/Id2Image.vue';
import UserSelector from '@/components/UserSelector/index.vue';
import ImageSelector from '@/components/MrPP/ImageSelector.vue';
import type { EduClass } from '@/api/v1/types/edu-class';
import type { EduSchool } from '@/api/v1/types/edu-school';
import { getClasses, getClass, deleteClass, createClass, updateClass } from '@/api/v1/edu-class';
import { createTeacher, deleteTeacher } from '@/api/v1/edu-teacher';
import { createStudent, deleteStudent } from '@/api/v1/edu-student';
import { getSchool } from '@/api/v1/edu-school';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const schoolId = computed(() => route.query.school_id ? Number(route.query.school_id) : null);
const currentSchool = ref<EduSchool | null>(null);

const editDialogVisible = ref(false);
const teacherDialogVisible = ref(false);
const studentDialogVisible = ref(false);
const userDialogVisible = ref(false);
const userDialogTitle = ref('');
const userSelectionMode = ref<'teacher' | 'student'>('teacher');

const editForm = ref({
  id: null as number | null,
  name: '',
  imageUrl: '',
  image_id: null as number | null,
});

const currentClass = ref<EduClass | null>(null);
const teachers = ref<any[]>([]);
const students = ref<any[]>([]);
const teachersLoading = ref(false);
const studentsLoading = ref(false);

const fetchClasses = async (params: FetchParams): Promise<FetchResponse> => {
  const queryParams: any = {
    sort: params.sort,
    search: params.search,
    page: params.page,
    expand: 'image,eduTeachers.user,eduStudents.user',
  };

  if (schoolId.value) {
    queryParams.school_id = schoolId.value;
  }

  const response = await getClasses(
    queryParams.sort,
    queryParams.search,
    queryParams.page,
    queryParams.expand,
    queryParams.school_id
  );
  return response;
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const clearSchoolFilter = () => {
  router.push({ path: '/manager/class' });
};

const loadSchoolInfo = async () => {
  if (schoolId.value) {
    try {
      const response = await getSchool(schoolId.value, 'image,principal');
      currentSchool.value = response.data;
    } catch (error) {
      console.error('Failed to load school info:', error);
    }
  }
};

const handleCreate = () => {
  if (!schoolId.value) {
    ElMessage.warning(t('manager.class.errors.selectSchoolFirst'));
    return;
  }

  editForm.value = {
    id: null,
    name: '',
    imageUrl: '',
    image_id: null,
  };
  editDialogVisible.value = true;
};

const handleEdit = async (item: EduClass) => {
  editForm.value = {
    id: item.id,
    name: item.name,
    imageUrl: item.image?.url || '',
    image_id: (item as any).image_id || null,
  };
  editDialogVisible.value = true;
};

const handleSaveEdit = async () => {
  if (!schoolId.value && !editForm.value.id) {
    ElMessage.error(t('manager.class.errors.schoolIdRequired'));
    return;
  }

  try {
    const data: any = {
      name: editForm.value.name,
      image_id: editForm.value.image_id,
    };

    if (editForm.value.id) {
      await updateClass(editForm.value.id, data);
      ElMessage.success(t('manager.messages.updateSuccess'));
    } else {
      data.school_id = schoolId.value;
      await createClass(data);
      ElMessage.success(t('manager.messages.createSuccess'));
    }

    editDialogVisible.value = false;
    refreshList();
  } catch (error: any) {
    console.error('Failed to save class:', error);
    if (error.response?.status === 422) {
      const errorMsg = error.response?.data?.message || t('manager.errors.validationFailed');
      ElMessage.error(errorMsg);
    } else {
      ElMessage.error(t('manager.errors.saveFailed'));
    }
  }
};

const handleDeleteWithCallback = async (item: EduClass, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('manager.confirm.deleteMessage'),
      t('manager.confirm.deleteTitle'),
      {
        confirmButtonText: t('manager.confirm.confirm'),
        cancelButtonText: t('manager.confirm.cancel'),
        type: 'warning',
      }
    );

    await deleteClass(item.id);
    ElMessage.success(t('manager.messages.deleteSuccess'));
    refreshList();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete class:', error);
      ElMessage.error(t('manager.errors.deleteFailed'));
    }
    resetLoading();
  }
};

const handleImageSelected = (data: { imageId: number; itemId: number | null; imageUrl?: string }) => {
  editForm.value.image_id = data.imageId;
  editForm.value.imageUrl = data.imageUrl || '';
};

const handleViewTeachers = async (item: EduClass) => {
  currentClass.value = item;
  teachers.value = item.eduTeachers || [];
  teacherDialogVisible.value = true;
};

const handleViewStudents = async (item: EduClass) => {
  currentClass.value = item;
  students.value = item.eduStudents || [];
  studentDialogVisible.value = true;
};

const handleAddTeacher = () => {
  userSelectionMode.value = 'teacher';
  userDialogTitle.value = t('manager.class.selectTeacher');
  userDialogVisible.value = true;
};

const handleAddStudent = () => {
  userSelectionMode.value = 'student';
  userDialogTitle.value = t('manager.class.selectStudent');
  userDialogVisible.value = true;
};

const handleSelectUser = async (user: any) => {
  if (!currentClass.value) return;

  try {
    if (userSelectionMode.value === 'teacher') {
      teachersLoading.value = true;
      await createTeacher({
        user_id: user.id,
        class_id: currentClass.value.id,
        school_id: schoolId.value || 0
      });
      ElMessage.success(t('manager.messages.addSuccess'));
      await refreshTeachers();
    } else {
      studentsLoading.value = true;
      await createStudent({ user_id: user.id, class_id: currentClass.value.id });
      ElMessage.success(t('manager.messages.addSuccess'));
      await refreshStudents();
    }
    userDialogVisible.value = false;
    refreshList();
  } catch (error: any) {
    console.error('Failed to add member:', error);
    if (error.response?.status === 422) {
      const errorMsg = error.response?.data?.message || t('manager.errors.alreadyInClass');
      ElMessage.error(errorMsg);
    } else {
      ElMessage.error(t('manager.errors.addFailed'));
    }
  } finally {
    teachersLoading.value = false;
    studentsLoading.value = false;
  }
};

const handleRemoveTeacher = async (teacher: any) => {
  if (!currentClass.value) return;

  try {
    await ElMessageBox.confirm(
      t('manager.confirm.removeMemberMessage'),
      t('manager.confirm.removeMemberTitle'),
      {
        confirmButtonText: t('manager.confirm.confirm'),
        cancelButtonText: t('manager.confirm.cancel'),
        type: 'warning',
      }
    );

    teachersLoading.value = true;
    await deleteTeacher(teacher.id);
    ElMessage.success(t('manager.messages.removeSuccess'));
    await refreshTeachers();
    refreshList();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to remove teacher:', error);
      if (error.response?.status === 422) {
        const errorMsg = error.response?.data?.message || t('manager.errors.removeFailed');
        ElMessage.error(errorMsg);
      } else {
        ElMessage.error(t('manager.errors.removeFailed'));
      }
    }
  } finally {
    teachersLoading.value = false;
  }
};

const handleRemoveStudent = async (student: any) => {
  if (!currentClass.value) return;

  try {
    await ElMessageBox.confirm(
      t('manager.confirm.removeMemberMessage'),
      t('manager.confirm.removeMemberTitle'),
      {
        confirmButtonText: t('manager.confirm.confirm'),
        cancelButtonText: t('manager.confirm.cancel'),
        type: 'warning',
      }
    );

    studentsLoading.value = true;
    await deleteStudent(student.id);
    ElMessage.success(t('manager.messages.removeSuccess'));
    await refreshStudents();
    refreshList();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to remove student:', error);
      if (error.response?.status === 422) {
        const errorMsg = error.response?.data?.message || t('manager.errors.removeFailed');
        ElMessage.error(errorMsg);
      } else {
        ElMessage.error(t('manager.errors.removeFailed'));
      }
    }
  } finally {
    studentsLoading.value = false;
  }
};

const refreshTeachers = async () => {
  if (!currentClass.value) return;
  try {
    const response = await getClass(currentClass.value.id, 'eduTeachers.user');
    if (response && response.data) {
      teachers.value = response.data.eduTeachers || [];
      currentClass.value = response.data;
    }
  } catch (error) {
    console.error('Failed to refresh teachers:', error);
  }
};

const refreshStudents = async () => {
  if (!currentClass.value) return;
  try {
    const response = await getClass(currentClass.value.id, 'eduStudents.user');
    if (response && response.data) {
      students.value = response.data.eduStudents || [];
      currentClass.value = response.data;
    }
  } catch (error) {
    console.error('Failed to refresh students:', error);
  }
};

onMounted(() => {
  loadSchoolInfo();
});
</script>

<style scoped lang="scss">
.class-management {
  padding: 20px;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
</style>
