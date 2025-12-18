<template>
  <div class="class-page-container">
    <ClassDetail v-if="classId" :class-id="classId" @class-loaded="onClassLoaded" />
    <el-empty v-else :description="$t('common.noData')" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ClassDetail from './components/ClassDetail.vue';
import type { EduClass } from '@/api/v1/types/edu-class';

const route = useRoute();

const classId = computed(() => {
  const id = route.query.class_id;
  return id ? Number(id) : null;
});

const onClassLoaded = (classInfo: EduClass) => {
  // Optionally update page title or perform other actions
  document.title = classInfo.name || 'Class';
};
</script>

<style scoped lang="scss">
.class-page-container {
  padding: 20px;
  min-height: 400px;
}
</style>
