<template>
  <div style="height: 50px"></div>
  <el-card shadow="never" class="back-button-container">
    <el-card id="news-detail-content">
      <Document
        :post-id="id"
        :category="true"
        category-path="/web/category"
      ></Document>
    </el-card>
  </el-card>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import Document from "@/components/Home/Document.vue";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));

onMounted(() => {
  logger.error(id.value);

  // 自动滚动到内容区域
  setTimeout(() => {
    const element = document.getElementById("news-detail-content");
    if (element) {
      // 计算滚动位置
      const navbarHeight = 64;
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      // 滚动到指定位置
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, 300);
});
</script>

<style lang="scss" scoped>
#news-detail-content {
  scroll-margin-top: 64px;
  margin-top: 20px;
}

.back-button-container {
  margin-bottom: 20px;

  .el-button {
    display: flex;
    gap: 4px;
    align-items: center;

    .el-icon {
      font-size: 20px;
    }
  }
}
</style>
