<template>
  <el-card id="news-detail-content">
    <div class="back-button-container">
      <el-button type="primary" text @click="goBack">
        <el-icon>
          <Back />
        </el-icon>
      </el-button>
    </div>
    <Document :post-id="id" :category="true" category-path="/web/category"></Document>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from "vue-router";
import Document from "@/components/Home/Document.vue";
import { ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));

const goBack = () => {
  router.back();
};

onMounted(() => {
  console.error(id.value);

  // 自动滚动到内容区域
  setTimeout(() => {
    const element = document.getElementById('news-detail-content');
    if (element) {
      // 计算滚动位置
      const navbarHeight = 64;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      // 滚动到指定位置
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
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
    align-items: center;
    gap: 4px;

    .el-icon {
      font-size: 20px;
    }
  }
}
</style>
