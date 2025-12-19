<template>
  <CardListPage ref="cardListPageRef" :fetch-data="fetchSchools" wrapper-class="school-management" :show-empty="true"
    @refresh="handleRefresh">
    <template #header-actions>
      <el-button-group :inline="true" v-if="isRoot">
        <el-button size="small" type="primary" @click="handleCreate">
          <font-awesome-icon icon="plus"></font-awesome-icon>
          &nbsp;
          <span class="hidden-sm-and-down">{{ $t("manager.createSchool") }}</span>
        </el-button>
      </el-button-group>
    </template>

    <template #card="{ item }">
      <MrPPCard :item="item" color="#e74c3c" @named="handleEdit" @deleted="handleDeleteWithCallback">
        <template #enter>
          <el-descriptions :column="1" size="small" class="school-info">
            <el-descriptions-item :label="$t('manager.school.principal')">
              {{ item.principal ? ((item.principal as any).nickname || (item.principal as any).username || '-') : '-' }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('manager.school.address')">
              {{ item.info?.address || '-' }}
            </el-descriptions-item>
          </el-descriptions>
          <el-button type="primary" size="small" @click="handleOpenClasses(item)">
            {{ $t('common.open') }}
          </el-button>
        </template>
      </MrPPCard>
    </template>

    <template #dialogs>
      <!-- Edit School Dialog -->
      <el-dialog v-model="editDialogVisible" :title="$t('manager.dialog.editTitle')" width="500px"
        :close-on-click-modal="false">
        <el-form :model="editForm" label-width="120px">
          <el-form-item :label="$t('manager.form.name')">
            <el-input v-model="editForm.name" :placeholder="$t('manager.form.namePlaceholder')" />
          </el-form-item>
          <el-form-item :label="$t('manager.form.image')">
            <ImageSelector :item-id="editForm.id" :image-url="editForm.imageUrl" @image-selected="handleImageSelected"
              @image-upload-success="handleImageSelected" />
          </el-form-item>
          <el-form-item :label="$t('manager.form.principal')">
            <el-button @click="openPrincipalSelector">
              {{ editForm.principalName || $t('manager.form.principalPlaceholder') }}
            </el-button>
            <el-button v-if="editForm.principal_id || editForm.principalName" type="danger" :icon="Delete" circle
              size="small" style="margin-left: 10px;" @click="handleClearPrincipal" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
          <el-button type="primary" @click="handleSaveEdit">{{ $t('manager.form.submit') }}</el-button>
        </template>
      </el-dialog>

      <!-- User Selection Dialog -->
      <UserSelector v-model="userDialogVisible" :title="$t('common.selectUser')" @select="handleSelectUser" />

      <!-- Class Management Dialog -->
      <ClassManagementDialog v-model="classDialogVisible" :school-id="selectedSchool?.id || 0" :school="selectedSchool"
        @refresh="refreshList" />
    </template>
  </CardListPage>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import UserSelector from '@/components/UserSelector/index.vue';
import ImageSelector from '@/components/MrPP/ImageSelector.vue';
import ClassManagementDialog from '@/components/MrPP/ClassManagementDialog.vue';
import type { EduSchool } from '@/api/v1/types/edu-school';
import { getSchools, deleteSchool, createSchool, updateSchool, getPrincipalSchools } from '@/api/v1/edu-school';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';
import { useUserStoreHook } from "@/store/modules/user";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStoreHook();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

// Check if user is root
const isRoot = computed(() => {
  return userStore.getRole() === userStore.RoleEnum.Root;
});

// Track previous role to detect changes
const previousRole = ref<string | null>(null);

// Watch for user info changes - refresh list when role is loaded/changed
watch(() => userStore.userInfo, (newUserInfo) => {
  if (!newUserInfo || newUserInfo.id === 0) {
    return;
  }

  const currentRole = userStore.getRole();
  // Only refresh if role has changed (including initial load)
  if (previousRole.value !== currentRole) {
    previousRole.value = currentRole;
    // Refresh the list with correct API based on role
    cardListPageRef.value?.refresh();
  }
}, { deep: true, immediate: true });

const editDialogVisible = ref(false);
const userDialogVisible = ref(false);
const classDialogVisible = ref(false);
const selectedSchool = ref<EduSchool | null>(null);
const editForm = ref({
  id: null as number | null,
  name: '',
  imageUrl: '',
  image_id: null as number | null,
  principal_id: null as number | null,
  principalName: '',
});

const fetchSchools = async (params: FetchParams): Promise<FetchResponse> => {
  if (isRoot.value) {
    return await getSchools(
      params.sort,
      params.search,
      params.page,
      'image,principal'
    );
  } else {
    return await getPrincipalSchools(
      params.sort,
      params.search,
      params.page,
      'image,principal'
    );
  }
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const generateDefaultName = (prefix: string) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // 2025-12-03
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // 10-39-05
  return `${prefix}_${dateStr}_${timeStr}`;
};

const handleCreate = () => {
  editForm.value = {
    id: null,
    name: generateDefaultName(t('manager.defaultSchoolName')),
    imageUrl: '',
    image_id: null,
    principal_id: null,
    principalName: '',
  };
  editDialogVisible.value = true;
};

const handleEdit = async (item: EduSchool) => {
  editForm.value = {
    id: item.id,
    name: item.name,
    imageUrl: item.image?.url || '',
    image_id: item.image_id || null,
    principal_id: item.principal_id || null,
    principalName: (item.principal as any)?.nickname || (item.principal as any)?.username || '',
  };
  editDialogVisible.value = true;
};

const handleSaveEdit = async () => {
  if (!editForm.value.name.trim()) {
    ElMessage.warning(t('manager.validation.nameRequired'));
    return;
  }

  try {
    const data: any = {
      name: editForm.value.name.trim(),
      image_id: editForm.value.image_id,
      principal_id: editForm.value.principal_id,
    };

    if (editForm.value.id) {
      await updateSchool(editForm.value.id, data);
      ElMessage.success(t('manager.messages.updateSuccess'));
    } else {
      await createSchool(data);
      ElMessage.success(t('manager.messages.createSuccess'));
    }

    editDialogVisible.value = false;
    refreshList();
  } catch (error) {
    console.error('Failed to save school:', error);
    ElMessage.error(t('manager.errors.saveFailed'));
  }
};

const handleDeleteWithCallback = async (item: EduSchool, resetLoading: () => void) => {
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

    await deleteSchool(item.id);
    ElMessage.success(t('manager.messages.deleteSuccess'));
    refreshList();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete school:', error);
      ElMessage.error(t('manager.errors.deleteFailed'));
    }
    resetLoading();
  }
};

const handleImageSelected = (data: { imageId: number; itemId: number | null; imageUrl?: string }) => {
  editForm.value.image_id = data.imageId;
  editForm.value.imageUrl = data.imageUrl || '';
};

const openPrincipalSelector = () => {
  userDialogVisible.value = true;
};

const handleSelectUser = (user: any) => {
  editForm.value.principal_id = user.id;
  editForm.value.principalName = user.nickname || user.username;
  userDialogVisible.value = false;
};

const handleClearPrincipal = () => {
  editForm.value.principal_id = null;
  editForm.value.principalName = '';
};

const handleAssignPrincipal = (item: EduSchool) => {
  handleEdit(item);
  setTimeout(() => {
    openPrincipalSelector();
  }, 100);
};

const handleOpenClasses = (item: EduSchool) => {
  selectedSchool.value = item;
  classDialogVisible.value = true;
};
</script>

<style scoped lang="scss">
.school-management {
  padding: 20px;
}

.school-info {
  margin-bottom: 12px;
}
</style>
