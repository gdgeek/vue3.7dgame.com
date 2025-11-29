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
        <el-main>
          <el-card style="width: 100%; min-height: 400px;">
            <Waterfall v-if="classes.length > 0" :list="classes" :width="320" :gutter="20"
              :backgroundColor="'rgba(255, 255, 255, .05)'">
              <template #default="{ item }">
                <MrPPCard :item="item" @named="handleEdit" @deleted="handleDeleteWithCallback">
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
      <el-table :data="teachers" v-loading="teachersLoading">
        <el-table-column prop="username" :label="$t('common.username')" />
        <el-table-column prop="nickname" :label="$t('common.nickname')" />
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
      <el-table :data="students" v-loading="studentsLoading">
        <el-table-column prop="username" :label="$t('common.username')" />
        <el-table-column prop="nickname" :label="$t('common.nickname')" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { getClasses, deleteClass, createClass, updateClass } from "@/api/v1/edu-class";
import type { EduClass } from "@/api/v1/types/edu-class";
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const { t } = useI18n();

const classes = ref<EduClass[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 20,
  total: 0,
});

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

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await getClasses(
      sorted.value,
      searched.value,
      pagination.value.current
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
  teachersLoading.value = true;

  try {
    // TODO: Replace with actual API call to fetch teachers for this class
    // For now, using mock data
    teachers.value = [
      { id: 1, username: 'teacher1', nickname: '张老师' },
      { id: 2, username: 'teacher2', nickname: '李老师' },
    ];
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.errors.fetchFailed'));
  } finally {
    teachersLoading.value = false;
  }
};

const handleViewStudents = async (item: EduClass) => {
  selectedClass.value = item;
  studentDialogVisible.value = true;
  studentsLoading.value = true;

  try {
    // TODO: Replace with actual API call to fetch students for this class
    // For now, using mock data
    students.value = [
      { id: 1, username: 'student1', nickname: '王同学' },
      { id: 2, username: 'student2', nickname: '赵同学' },
    ];
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.errors.fetchFailed'));
  } finally {
    studentsLoading.value = false;
  }
};

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

    // TODO: Implement API call to remove teacher from class
    ElMessage.success(t('manager.class.messages.removeTeacherSuccess'));
    handleViewTeachers(selectedClass.value!);
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.class.messages.removeTeacherFailed'));
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

    // TODO: Implement API call to remove student from class
    ElMessage.success(t('manager.class.messages.removeStudentSuccess'));
    handleViewStudents(selectedClass.value!);
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.class.messages.removeStudentFailed'));
    }
  }
};

const getDefaultImage = (id: number) => {
  const index = id % 100;
  return new URL(`../../assets/images/items/${index}.webp`, import.meta.url).href;
};

onMounted(() => {
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
