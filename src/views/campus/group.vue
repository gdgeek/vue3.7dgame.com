<template>

  <div class="group-list-content">
    <ClassGroupList v-if="classId" ref="groupListRef" :class-id="classId" :my-groups="myGroups"
      :joining-group-id="joiningGroupId" @join-group="handleJoinGroup" @create-group="openGroupDialog()"
      @edit-group="openGroupDialog" @delete-group="handleDeleteGroup" />
  </div>

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

</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useUserStoreHook } from "@/store/modules/user";
import ClassGroupList from './components/ClassGroupList.vue';
import ImageSelector from '@/components/MrPP/ImageSelector.vue';
import { getClassGroups, createClassGroup } from '@/api/v1/edu-class';
import { deleteGroup, joinGroup, updateGroup } from '@/api/v1/group';
import type { Group } from '@/api/v1/types/group';
// Removed EduClass import

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const classId = computed(() => Number(route.query.class_id));
const loading = ref(false);
const myGroups = ref<Group[]>([]);
const joiningGroupId = ref<number | null>(null);
const groupListRef = ref<InstanceType<typeof ClassGroupList> | null>(null);

// Group Dialog State
const groupDialogVisible = ref(false);
const savingGroup = ref(false);
const groupForm = ref({
  id: null as number | null,
  name: '',
  description: '',
  image_id: null as number | null,
  imageUrl: ''
});

const goBack = () => {
  router.push('/campus/student');
};

const fetchData = async () => {
  if (!classId.value) return;
  loading.value = true;
  try {
    // Fetch my groups in this class
    const myGroupRes = await getClassGroups(classId.value, 'image,user');
    const groupData = myGroupRes.data;
    if (Array.isArray(groupData)) {
      myGroups.value = groupData;
    } else {
      myGroups.value = groupData ? [groupData] : [];
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
    ElMessage.error(t('common.networkError'));
  } finally {
    loading.value = false;
  }
};

// Actions
const openGroupDialog = (group?: Group) => {
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

  savingGroup.value = true;
  try {
    if (groupForm.value.id) {
      // Edit
      await updateGroup(groupForm.value.id, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id
      });
      ElMessage.success(t('common.updateSuccess'));
    } else {
      // Create
      await createClassGroup(classId.value, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id
      });
      ElMessage.success(t('common.createSuccess'));
    }
    groupDialogVisible.value = false;
    await fetchData(); // Refresh my groups
    groupListRef.value?.refresh(); // Refresh list
  } catch (error: any) {
    console.error('Failed to save group:', error);
    const errorMsg = error.response?.data?.message || (groupForm.value.id ? t('common.operationFailed') : t('common.createFailed'));
    ElMessage.error(errorMsg);
  } finally {
    savingGroup.value = false;
  }
};

const handleJoinGroup = async (group: Group) => {
  joiningGroupId.value = group.id;
  try {
    await joinGroup(group.id);
    ElMessage.success(t('route.personalCenter.campus.joinSuccess'));
    await fetchData();
    groupListRef.value?.refresh();
  } catch (error: any) {
    console.error('Failed to join group:', error);
    const errorMsg = error.response?.data?.message || t('route.personalCenter.campus.joinFailed');
    ElMessage.error(errorMsg);
  } finally {
    joiningGroupId.value = null;
  }
};

const handleDeleteGroup = async (group: Group) => {
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
    await fetchData();
    groupListRef.value?.refresh();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete group:', error);
      const errorMsg = error.response?.data?.message || t('common.deleteFailed');
      ElMessage.error(errorMsg);
    }
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="scss">
.group-page-container {
  padding: 20px;
  background-color: var(--el-bg-color);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.group-list-content {
  margin-top: 20px;
}
</style>
