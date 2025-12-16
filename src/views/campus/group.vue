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

    <!-- Group Content Area - Left empty for future content -->
    <div class="group-content">
      <el-empty :description="$t('common.comingSoon') || '敬请期待'" />
    </div>
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
import { getGroup } from '@/api/v1/group';
import type { Group } from '@/api/v1/types/group';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userStore = useUserStoreHook();

const groupId = computed(() => Number(route.query.group_id));
const loading = ref(false);
const group = ref<Group | null>(null);

const isMyGroup = computed(() => {
  if (!group.value || !userStore.userInfo?.userData?.id) return false;
  return group.value.user?.id === userStore.userInfo.userData.id;
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
}

.group-content {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 40px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
