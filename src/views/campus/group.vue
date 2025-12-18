<template>
  <div class="group-detail-container">
    <!-- Group Header -->
    <div v-loading="loading" class="group-header">
      <div v-if="group" class="group-info">
        <div class="group-image">
          <Id2Image :id="group.id" :image="group.image?.url || null" :lazy="false" fit="cover" />
        </div>
        <div class="group-details">
          <h2 class="group-name">{{ group.name }}</h2>
          <p v-if="group.description" class="group-description">{{ group.description }}</p>
          <div class="group-meta">
            <el-tag v-if="isMyGroup" type="success" size="small">
              {{ $t('route.personalCenter.campus.myGroup') }}
            </el-tag>
            <span v-if="group.user" class="group-creator">
              <el-icon>
                <User />
              </el-icon>
              {{ group.user.nickname || group.user.username }}
            </span>
          </div>
        </div>
        <div class="group-actions">
          <el-button @click="goBack">
            <el-icon>
              <ArrowLeft />
            </el-icon>
            {{ $t('common.back') }}
          </el-button>
        </div>
      </div>
      <el-empty v-else-if="!loading" :description="$t('route.personalCenter.campus.noGroup')" />
    </div>

    <!-- Group Verses List - Using MrPPVersePage pattern -->
    <div class="group-content" v-if="group">
      <Page ref="pageRef" @loaded="handleLoaded" :created="false">
        <template #header-actions>
          <el-button size="small" type="primary" @click="openCreateDialog">
            <font-awesome-icon icon="plus" />
            &nbsp;
            <span class="hidden-sm-and-down">{{ $t('route.personalCenter.campus.createVerse') }}</span>
          </el-button>
        </template>
      </Page>
    </div>

    <!-- Create Verse Dialog -->
    <MrPPVerseWindowCreate ref="createDialogRef" :dialog-title="$t('route.personalCenter.campus.createVerse')"
      :dialog-submit="$t('common.confirm')" @submit="handleCreateVerse" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, ArrowLeft } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useUserStoreHook } from "@/store/modules/user";
import Id2Image from "@/components/Id2Image.vue";
import Page from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import MrPPVerseWindowCreate from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import { getGroup, createGroupVerse, getGroupVerses } from '@/api/v1/group';
import type { Group } from '@/api/v1/types/group';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userStore = useUserStoreHook();

const groupId = computed(() => Number(route.query.group_id));
const loading = ref(false);
const group = ref<Group | null>(null);
const createDialogRef = ref<InstanceType<typeof MrPPVerseWindowCreate> | null>(null);
const pageRef = ref<InstanceType<typeof Page> | null>(null);

const isMyGroup = computed(() => {
  if (!group.value || !group.value.user) return false;
  const currentUserId = userStore.userInfo?.id;
  return currentUserId && group.value.user.id === currentUserId;
});

const goBack = () => {
  router.back();
};

const fetchGroup = async () => {

  if (!groupId.value) {
    ElMessage.warning(t('route.personalCenter.campus.noGroup'));
    return;
  }
  loading.value = true;
  try {
    const response = await getGroup(groupId.value, 'image,user');
    group.value = response.data;
  } catch (error) {
    console.error('Failed to fetch group:', error);
    ElMessage.error(t('common.networkError'));
  } finally {
    loading.value = false;
  }
};

// Loaded callback for MrPPVersePage
const handleLoaded = async (data: any, result: Function) => {
  if (!groupId.value) {
    result({ data: [], pagination: { current: 1, count: 1, size: 20, total: 0 } });
    return;
  }

  try {
    const response = await getGroupVerses(
      groupId.value,
      data.sorted,
      data.current,
      20,
      'image,author',
      data.searched || ''
    );


    const pagination = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };
    result({ data: response.data, pagination: pagination });

  } catch (error) {
    console.error('Failed to fetch group verses:', error);
    result({ data: [], pagination: { current: 1, count: 1, size: 20, total: 0 } });
  }
};

const openCreateDialog = () => {
  createDialogRef.value?.show();
};

const handleCreateVerse = async (form: any, imageId: number | null) => {
  try {
    await createGroupVerse(groupId.value, {
      name: form.name,
      description: form.description,
      image_id: imageId ?? undefined
    });

    ElMessage.success(t('common.createSuccess'));
    createDialogRef.value?.hide();
    // Refresh the list to show new verse
    pageRef.value?.refresh();
  } catch (error: any) {
    console.error('Failed to create verse:', error);
    const errorMsg = error.response?.data?.message || t('common.createFailed');
    ElMessage.error(errorMsg);
  }
};

onMounted(() => {
  fetchGroup();
});
</script>

<style scoped lang="scss">
.group-detail-container {
  padding: 20px;
  min-height: 100vh;
  background: var(--el-bg-color-page);
}

.group-header {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.group-info {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.group-image {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.group-details {
  flex: 1;
  min-width: 0;
}

.group-name {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-description {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-creator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.group-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.group-content {
  min-height: 400px;
}
</style>
