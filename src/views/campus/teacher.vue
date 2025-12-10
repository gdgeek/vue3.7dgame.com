<template>
  <CardListPage ref="cardListPageRef" :fetch-data="fetchTeachers" wrapper-class="teacher-management" :show-empty="true"
    @refresh="handleRefresh">
    <template #header-actions>
      <el-button-group :inline="true">
        <el-button size="small" type="primary" @click="handleCreate">
          <font-awesome-icon icon="plus"></font-awesome-icon>
          &nbsp;
          <span class="hidden-sm-and-down">{{ $t("campus.createTeacher") }}</span>
        </el-button>
      </el-button-group>
    </template>

    <template #card="{ item }">
      <MrPPCard :item="item" @named="handleEdit" @deleted="handleDeleteWithCallback">
        <template #enter>
          <el-descriptions :column="1" size="small" class="teacher-info">
            <el-descriptions-item :label="$t('campus.teacher.subject')">
              {{ item.subject || '-' }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('campus.teacher.phone')">
              {{ item.phone || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </MrPPCard>
    </template>

    <template #dialogs>
      <!-- Edit Teacher Dialog -->
      <el-dialog v-model="editDialogVisible" :title="$t('campus.dialog.editTeacherTitle')" width="500px"
        :close-on-click-modal="false">
        <el-form :model="editForm" label-width="120px">
          <!-- Create Mode: Select User, School, Class -->
          <template v-if="!editForm.id">
            <el-form-item :label="$t('campus.form.user')">
              <el-button @click="openUserSelector">
                {{ editForm.userName || $t('campus.form.selectUser') }}
              </el-button>
            </el-form-item>
            <el-form-item :label="$t('campus.form.school')">
              <el-input v-model.number="editForm.school_id" placeholder="School ID (Temporary)" />
            </el-form-item>
            <el-form-item :label="$t('campus.form.class')">
              <el-input v-model.number="editForm.class_id" placeholder="Class ID (Temporary)" />
            </el-form-item>
          </template>

          <!-- Edit Mode: Update Details -->
          <template v-else>
            <el-form-item :label="$t('campus.form.name')">
              <el-input v-model="editForm.name" />
            </el-form-item>
            <el-form-item :label="$t('campus.form.subject')">
              <el-input v-model="editForm.subject" />
            </el-form-item>
            <el-form-item :label="$t('campus.form.phone')">
              <el-input v-model="editForm.phone" />
            </el-form-item>
          </template>

        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSaveEdit">{{ $t('common.submit') }}</el-button>
        </template>
      </el-dialog>

      <UserSelector v-model="userDialogVisible" :title="$t('common.selectUser')" @select="handleSelectUser" />

    </template>
  </CardListPage>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import UserSelector from '@/components/UserSelector/index.vue';
import { getTeachers, deleteTeacher, createTeacher, updateTeacher } from '@/api/v1/edu-teacher';
import type { Teacher } from '@/api/v1/edu-teacher';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const editDialogVisible = ref(false);
const userDialogVisible = ref(false);

const editForm = ref({
  id: null as number | null,
  name: '',
  subject: '',
  phone: '',
  user_id: null as number | null,
  userName: '',
  class_id: null as number | null,
  school_id: null as number | null,
  imageUrl: '', // Required for card?
});

const fetchTeachers = async (params: FetchParams): Promise<FetchResponse> => {
  const response = await getTeachers(
    params.sort,
    params.search,
    params.page,
    ''
  );
  return response as any; // Cast if type mismatch
};

const handleRefresh = () => { };
const refreshList = () => cardListPageRef.value?.refresh();

const handleCreate = () => {
  editForm.value = {
    id: null,
    name: '',
    subject: '',
    phone: '',
    user_id: null,
    userName: '',
    class_id: null,
    school_id: null,
    imageUrl: '',
  };
  editDialogVisible.value = true;
};

const handleEdit = (item: Teacher) => {
  editForm.value = {
    id: item.id,
    name: item.name,
    subject: item.subject,
    phone: item.phone,
    user_id: null,
    userName: '',
    class_id: null,
    school_id: null,
    imageUrl: item.avatar || '',
  };
  editDialogVisible.value = true;
};

const handleSaveEdit = async () => {
  try {
    if (editForm.value.id) {
      await updateTeacher(editForm.value.id, {
        name: editForm.value.name,
        subject: editForm.value.subject,
        phone: editForm.value.phone
      });
      ElMessage.success(t('common.updateSuccess'));
    } else {
      if (!editForm.value.user_id || !editForm.value.class_id || !editForm.value.school_id) {
        ElMessage.warning('Please fill all required fields');
        return;
      }
      await createTeacher({
        user_id: editForm.value.user_id,
        class_id: editForm.value.class_id,
        school_id: editForm.value.school_id
      });
      ElMessage.success(t('common.createSuccess'));
    }
    editDialogVisible.value = false;
    refreshList();
  } catch (error) {
    console.error(error);
    ElMessage.error(t('common.operationFailed'));
  }
};

const handleDeleteWithCallback = async (item: Teacher, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('common.confirmDelete'),
      t('common.warning'),
      { type: 'warning' }
    );
    await deleteTeacher(item.id);
    ElMessage.success(t('common.deleteSuccess'));
    refreshList();
  } catch (error) {
    resetLoading();
  }
};

const openUserSelector = () => userDialogVisible.value = true;
const handleSelectUser = (user: any) => {
  editForm.value.user_id = user.id;
  editForm.value.userName = user.nickname || user.username;
  userDialogVisible.value = false;
};

</script>

<style scoped lang="scss">
.teacher-management {
  padding: 20px;
}

.teacher-info {
  margin-bottom: 12px;
}
</style>
