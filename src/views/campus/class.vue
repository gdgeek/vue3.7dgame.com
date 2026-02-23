<template>
  <div class="class-page-container">
    <ClassDetail
      v-if="classId"
      :class-id="classId"
      @class-loaded="onClassLoaded"
    ></ClassDetail>
    <el-empty v-else :description="$t('common.noData')"></el-empty>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import ClassDetail from "./components/ClassDetail.vue";
import type { EduClass } from "@/api/v1/types/edu-class";
import { useDomainStore } from "@/store/modules/domain";

const route = useRoute();
const domainStore = useDomainStore();

const classId = computed(() => {
  const id = route.query.class_id;
  return id ? Number(id) : null;
});

const onClassLoaded = (classInfo: EduClass) => {
  const siteName = domainStore.title || "不加班AR创作平台";
  document.title = classInfo.name
    ? `${classInfo.name} - ${siteName}`
    : siteName;
};
</script>

<style scoped lang="scss">
.class-page-container {
  padding: 20px;
  min-height: 400px;
}
</style>
