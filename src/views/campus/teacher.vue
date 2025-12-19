<template>
  <CardListPage ref="cardListPageRef" :fetch-data="fetchClasses" wrapper-class="teacher-container" :show-empty="true"
    @refresh="handleRefresh">
    <template #card="{ item }">
      <MrPPCard :item="{
        id: item.id,
        name: item.name,
        image: item.image,
        ...item
      }" type="班级" color="#e67e22" :show-actions="false">
        <div class="class-info">
          <p class="school-name" v-if="item.school">
            <el-icon>
              <OfficeBuilding />
            </el-icon>
            {{ item.school?.name || '-' }}
          </p>
        </div>
        <template #enter>
          <el-button type="primary" size="small" @click="handleEnterClass(item)">
            {{ $t('common.enter') }}
          </el-button>
        </template>
      </MrPPCard>
    </template>
  </CardListPage>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { OfficeBuilding } from '@element-plus/icons-vue';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import { getMyTeacherClasses } from '@/api/v1/edu-class';
import type { EduClass } from '@/api/v1/types/edu-class';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const fetchClasses = async (params: FetchParams): Promise<FetchResponse> => {
  const response = await getMyTeacherClasses(
    params.sort,
    params.page,
    'image,school'
  );
  return response as unknown as FetchResponse;
};

const handleRefresh = () => {
  // Logic after refresh if needed
};

const handleEnterClass = (item: EduClass) => {
  // Navigate to class detail page
  router.push(`/campus/class?class_id=${item.id}`);
};
</script>

<style scoped lang="scss">
.teacher-container {
  padding: 20px;
}

.class-info {
  padding: 10px;

  .school-name {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
