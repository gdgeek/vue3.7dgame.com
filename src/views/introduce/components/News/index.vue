<template>
  <div class="content-section">
    <div id="news-container" class="news-container">
      <!-- 当路由是 /introduce/news 时显示 Book 组件 -->
      <template v-if="route.path === '/introduce/news'">
        <Book :items="items" :modelValue="activeTab" document-path="/introduce/news/document"
          category-path="/introduce/news/category" @tab-change="handleTabChange"></Book>
      </template>
      <!-- 显示子路由内容 -->
      <router-view v-else></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Book from "@/components/Home/Book.vue";

const route = useRoute();
const router = useRouter();

// 固定的标签项
const items = [
  { label: "新闻", type: "category", id: 74 },
  { label: "案例教程", type: "category", id: 79 },
];

const activeTab = computed(() => {
  const tab = route.query.tab;
  return tab === 'tutorial' ? 1 : 0;
});

const handleTabChange = (index: number) => {
  const tab = index === 1 ? 'tutorial' : 'news';
  router.push({
    path: route.path,
    query: { ...route.query, tab }
  });
};

watch(
  () => route.hash,
  (newHash) => {
    if (newHash) {
      setTimeout(() => {
        const element = document.querySelector(newHash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }
);

defineOptions({
  name: "News",
});
</script>

<style lang="scss" scoped>
.news-container {
  margin-top: 64px;
  padding: 20px;
}

#news-container {
  scroll-margin-top: 64px;
}
</style>
