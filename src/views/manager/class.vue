<template>
  <div class="class-management">
    <el-container>
      <el-header>

        <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort">
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="handleCreate">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.createClass") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-card style="width: 100%; min-height: 400px;">
          <div v-if="schoolId && currentSchool" style="margin-bottom: 20px;">
            <el-card shadow="hover" :body-style="{ padding: '20px', display: 'flex', alignItems: 'center' }">
              <div style="width: 100px; height: 100px; margin-right: 20px; flex-shrink: 0;">
                <img :src="currentSchool.image?.url || getDefaultImage(currentSchool.id)" class="image" />
              </div>
              <div style="flex-grow: 1;">
                <h2 style="margin: 0 0 10px 0;">{{ currentSchool.name }}</h2>
                <p style="margin: 0; color: #666;">
                  <span style="margin-right: 20px;">
                    <strong>{{ $t('manager.school.principal') }}:</strong>
                    {{ (currentSchool.principal as any)?.nickname || (currentSchool.principal as any)?.username || '-'
                    }}
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

          <Waterfall v-if="classes.length > 0" :list="classes" :width="320" :gutter="20"
            :backgroundColor="'rgba(255, 255, 255, .05)'">
            <template #default="{ item }">
              <MrPPCard :item="item" @named="handleEdit" @deleted="handleDeleteWithCallback">
                <div style="padding: 10px; font-size: 12px; color: #666;">
                  <div v-for="teacher in (item.eduTeachers || []).slice(0, 3)" :key="teacher.id"
                    style="margin-bottom: 2px;">
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
          </Waterfall>
          <el-empty v-else-if="!loading" description="No Data"></el-empty>
          <el-skeleton v-else :rows="8" animated />
        </el-card>
      </el-main>

      <el-footer>
        <el-card class="box-card">
          <el-pagination :current-page="pagination.current" :page-size="pagination.size" :total="pagination.total"
            layout="prev, pager, next, jumper" background @current-change="handleCurrentChange"></el-pagination>
        </el-card>
      </el-footer>
    </el-container>

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
    <UserSelector v-model="userDialogVisible" :title="$t('common.selectUser')" @select="handleUserSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Delete } from '@element-plus/icons-vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import Id2Image from "@/components/Id2Image.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import UserSelector from "@/components/UserSelector/index.vue";
import { getClasses, deleteClass, createClass, updateClass } from "@/api/v1/edu-class";
import { getSchool } from "@/api/v1/edu-school";
import { createTeacher, deleteTeacher } from "@/api/v1/edu-teacher";
import { createStudent, deleteStudent } from "@/api/v1/edu-student";
import type { EduClass } from "@/api/v1/types/edu-class";
import type { EduSchool } from "@/api/v1/types/edu-school";
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const classes = ref<EduClass[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 20,
  total: 0,
});

const schoolId = computed(() => {
  const id = route.query.school_id;
  return id ? parseInt(id as string) : null;
});

const currentSchool = ref<EduSchool | null>(null);

// Edit dialog state
const editDialogVisible = ref(false);
const editForm = ref({
  id: 0,
  name: '',
  image_id: null as number | null,
  imageUrl: '',
});

// Teacher and Student dialog state
const teacherDialogVisible = ref(false);
const studentDialogVisible = ref(false);
const selectedClass = ref<EduClass | null>(null);
const teachers = ref<any[]>([]);
const students = ref<any[]>([]);
const teachersLoading = ref(false);
const studentsLoading = ref(false);

// User selection state
const userDialogVisible = ref(false);
const userSelectType = ref<'teacher' | 'student'>('teacher');

const fetchSchoolInfo = async () => {
  if (!schoolId.value) {
    currentSchool.value = null;
    return;
  }
  try {
    const response = await getSchool(schoolId.value);
    if (response.data) {
      currentSchool.value = response.data;
    }
  } catch (error) {
    console.error("Failed to fetch school info", error);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await getClasses(
      sorted.value,
      searched.value,
      pagination.value.current,
      "image,eduTeachers,eduStudents",
      schoolId.value
    );

    if (response.data) {
      classes.value = response.data;
      if (response.headers) {
        pagination.value.current = parseInt(response.headers["x-pagination-current-page"] || "1");
        pagination.value.size = parseInt(response.headers["x-pagination-per-page"] || "20");
        pagination.value.total = parseInt(response.headers["x-pagination-total-count"] || "0");
      }
    }

  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to fetch classes');
  } finally {
    loading.value = false;
  }
};

const clearSchoolFilter = () => {
  router.push({ path: '/manager/class' });
};

watch(() => route.query.school_id, () => {
  pagination.value.current = 1;
  fetchSchoolInfo();
  fetchData();
});

const handleSearch = (value: string) => {
  searched.value = value;
  pagination.value.current = 1;
  fetchData();
};

const handleSort = (value: string) => {
  sorted.value = value;
  fetchData();
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  fetchData();
};

const handleCreate = async () => {
  if (!schoolId.value) {
    ElMessage.warning(t('manager.class.messages.selectSchoolFirst'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('manager.class.messages.createConfirm'),
      t('manager.class.dialog.createTitle'),
      {
        confirmButtonText: t('manager.form.submit'),
        cancelButtonText: t('manager.form.cancel'),
        type: 'info',
      }
    );

    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-').replace(/:/g, '-').replace(/ /g, '_');

    const defaultName = `新班级_${timestamp}`;

    await createClass({
      name: defaultName,
      school_id: schoolId.value // If creating under a school context
    });

    ElMessage.success(t('manager.class.messages.createSuccess'));
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.class.messages.createFailed'));
    }
  }
};

const handleEdit = (item: EduClass) => {
  editForm.value = {
    id: item.id,
    name: item.name,
    image_id: item.image ? item.image.id : null,
    imageUrl: item.image ? item.image.url : '',
  };
  editDialogVisible.value = true;
};

const handleImageSelected = (data: { imageId: number; itemId: number; imageUrl?: string }) => {
  editForm.value.image_id = data.imageId;
  if (data.imageUrl) {
    editForm.value.imageUrl = data.imageUrl;
  }
};

const handleSaveEdit = async () => {
  try {
    await updateClass(editForm.value.id, {
      name: editForm.value.name,
      image_id: editForm.value.image_id,
    });
    ElMessage.success(t('manager.class.messages.updateSuccess'));
    editDialogVisible.value = false;
    fetchData();
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.class.messages.updateFailed'));
  }
};

const handleDelete = async (item: EduClass) => {
  try {
    await ElMessageBox.confirm(
      t("manager.list.confirm.message1"),
      t("manager.list.confirm.message2"),
      {
        confirmButtonText: t("manager.list.confirm.confirm"),
        cancelButtonText: t("manager.list.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteClass(item.id);
    ElMessage.success(t("manager.list.confirm.success"));
    fetchData();
  } catch {
    // Cancelled
  }
};

const handleDeleteWithCallback = async (item: EduClass, callback: () => void) => {
  try {
    await handleDelete(item);
  } finally {
    callback();
  }
};

const handleViewTeachers = async (item: EduClass) => {
  selectedClass.value = item;
  teacherDialogVisible.value = true;
  teachers.value = item.eduTeachers || [];
};

const handleViewStudents = async (item: EduClass) => {
  selectedClass.value = item;
  studentDialogVisible.value = true;
  students.value = item.eduStudents || [];
};

const handleAddTeacher = () => {
  userSelectType.value = 'teacher';
  userDialogVisible.value = true;
};

const handleAddStudent = () => {
  userSelectType.value = 'student';
  userDialogVisible.value = true;
};

const handleUserSelected = async (user: any) => {
  if (!selectedClass.value) return;

  try {
    if (userSelectType.value === 'teacher') {
      await createTeacher({
        user_id: user.id,
        class_id: selectedClass.value.id
      });
      ElMessage.success(t('manager.class.messages.assignTeacherSuccess') || 'Teacher assigned successfully');
    } else {
      await createStudent({
        user_id: user.id,
        class_id: selectedClass.value.id
      });
      ElMessage.success(t('manager.class.messages.assignStudentSuccess') || 'Student assigned successfully');
    }
    userDialogVisible.value = false;
    fetchData(); // Refresh to update lists
    // Also update the local list if possible, but fetchData refreshes everything which is safer
    // We might need to close and reopen dialog or just refresh data.
    // Since dialog uses `teachers` ref which is set from `item.teachers` in `handleViewTeachers`,
    // we need to update `teachers` or `students` ref as well, or re-fetch the specific class.
    // But `fetchData` updates `classes` list. We need to find the updated class and update `teachers`/`students`.
    // Let's just re-fetch data and update the local ref.

    // Wait for fetchData to complete? fetchData is async.
    // Better approach:
    // After fetchData, we need to update the currently open dialog's list.
    // But fetchData updates `classes` array. `teachers` ref is a separate copy? 
    // No, `teachers.value = item.teachers`. If `item` is from `classes`, and `classes` is replaced, `item` is stale.
    // So we need to re-find the class in the new `classes` list.

  } catch (error: any) {
    console.error(error);
    if (error.response && error.response.status === 422 && Array.isArray(error.response.data) && error.response.data.length > 0) {
      const msg = error.response.data[0].message;
      ElMessage.error(msg);
    } else {
      ElMessage.error(t('manager.errors.operationFailed') || 'Operation failed');
    }
  }
};

// Watch classes to update selectedClass and lists if data refreshes
watch(classes, (newClasses) => {
  if (selectedClass.value) {
    const updatedClass = newClasses.find(c => c.id === selectedClass.value?.id);
    if (updatedClass) {
      selectedClass.value = updatedClass;
      if (teacherDialogVisible.value) {
        teachers.value = updatedClass.eduTeachers || [];
      }
      if (studentDialogVisible.value) {
        students.value = updatedClass.eduStudents || [];
      }
    }
  }
});

const handleRemoveTeacher = async (teacher: any) => {
  try {
    await ElMessageBox.confirm(
      t('manager.class.messages.removeTeacherConfirm'),
      t('manager.dialog.editTitle'),
      {
        confirmButtonText: t('manager.form.submit'),
        cancelButtonText: t('manager.form.cancel'),
        type: 'warning',
      }
    );

    await deleteTeacher(teacher.id);
    ElMessage.success(t('manager.class.messages.removeTeacherSuccess'));
    // Refresh data
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error);
      if (error.response && error.response.status === 422 && Array.isArray(error.response.data) && error.response.data.length > 0) {
        const msg = error.response.data[0].message;
        ElMessage.error(msg);
      } else {
        ElMessage.error(t('manager.class.messages.removeTeacherFailed'));
      }
    }
  }
};

const handleRemoveStudent = async (student: any) => {
  try {
    await ElMessageBox.confirm(
      t('manager.class.messages.removeStudentConfirm'),
      t('manager.dialog.editTitle'),
      {
        confirmButtonText: t('manager.form.submit'),
        cancelButtonText: t('manager.form.cancel'),
        type: 'warning',
      }
    );

    await deleteStudent(student.id);
    ElMessage.success(t('manager.class.messages.removeStudentSuccess'));
    // Refresh data
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error);
      if (error.response && error.response.status === 422 && Array.isArray(error.response.data) && error.response.data.length > 0) {
        const msg = error.response.data[0].message;
        ElMessage.error(msg);
      } else {
        ElMessage.error(t('manager.class.messages.removeStudentFailed'));
      }
    }
  }
};

const getDefaultImage = (id: number) => {
  const index = id % 100;
  return new URL(`../../assets/images/items/${index}.webp`, import.meta.url).href;
};

onMounted(() => {
  fetchSchoolInfo();
  fetchData();
});
</script>

<style scoped lang="scss">
.class-management {
  padding: 20px;
}

.class-card {
  margin-bottom: 20px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }
}

.image-container {
  width: 100%;
  height: 150px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.class-name {
  font-size: 16px;
  font-weight: bold;
  display: block;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-info {
  margin-bottom: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}
</style>
