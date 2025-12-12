<template>
  <CardListPage ref="cardListPageRef" :fetch-data="fetchTeacherRecords" wrapper-class="teacher-container"
    :show-empty="true" @refresh="handleRefresh">
    <template #card="{ item }">
      <MrPPCard :item="{
        id: item.id,
        name: item.class?.name || 'No Class Name',
        image: item.class?.image,
        ...item
      }" :show-actions="false">
        <div class="class-info">
          <p class="school-name">
            <el-icon>
              <OfficeBuilding />
            </el-icon>
            {{ item.school?.name || item.class?.school?.name || '-' }}
          </p>
          <div class="teacher-details">
            <el-tag size="small" effect="plain">{{ item.subject || 'No Subject' }}</el-tag>
            <span class="phone-text" v-if="item.phone">
              <el-icon>
                <Phone />
              </el-icon> {{ item.phone }}
            </span>
          </div>
        </div>
        <template #enter>
          <div class="card-actions">
            <el-button type="primary" size="small" icon="Edit" @click="handleEdit(item)">
              {{ $t('common.edit') }}
            </el-button>
          </div>
        </template>
      </MrPPCard>
    </template>

    <template #dialogs>
      <!-- Edit Dialog -->
      <el-dialog v-model="editDialogVisible" :title="$t('campus.dialog.editTeacherTitle')" width="500px"
        :close-on-click-modal="false">
        <el-form :model="editForm" label-width="120px">
          <el-form-item :label="$t('campus.form.subject')">
            <el-input v-model="editForm.subject" />
          </el-form-item>
          <el-form-item :label="$t('campus.form.phone')">
            <el-input v-model="editForm.phone" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSaveEdit">{{ $t('common.submit') }}</el-button>
        </template>
      </el-dialog>
    </template>
  </CardListPage>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { OfficeBuilding, Phone } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import { getTeacherMe, updateTeacher } from '@/api/v1/edu-teacher';
import type { Teacher } from '@/api/v1/edu-teacher';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();

const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);
const editDialogVisible = ref(false);
const editForm = ref({
  id: 0,
  subject: '',
  phone: '',
});

const fetchTeacherRecords = async (params: FetchParams): Promise<FetchResponse> => {
  const response = await getTeacherMe(
    params.sort,
    params.search,
    params.page,
    'class,school'
  );
  // Ensure response structure matches what CardListPage expects (array or object with headers)
  // If getTeacherMe returns generic array without pagination headers, we might need to adjust.
  // Assuming standard request wrapper returns .data and .headers.
  return response as unknown as FetchResponse;
};

const handleRefresh = () => {
  // Logic after refresh if needed
};

const handleEdit = (item: Teacher) => {
  editForm.value = {
    id: item.id,
    subject: item.subject,
    phone: item.phone,
  };
  editDialogVisible.value = true;
};

const handleSaveEdit = async () => {
  try {
    await updateTeacher(editForm.value.id, {
      subject: editForm.value.subject,
      phone: editForm.value.phone
    });
    ElMessage.success(t('common.updateSuccess'));
    editDialogVisible.value = false;
    cardListPageRef.value?.refresh();
  } catch (error) {
    console.error(error);
    ElMessage.error(t('common.operationFailed'));
  }
};
</script>

<style scoped lang="scss">
.teacher-container {
  padding: 20px;
}

.class-info {
  padding: 10px;

  .school-name {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.teacher-details {
  display: flex;
  align-items: center;
  gap: 8px;

  .phone-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
