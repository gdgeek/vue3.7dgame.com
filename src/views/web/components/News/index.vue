<template>
  <div class="content-section">
    <div id="news-container" class="news-container">
      <!-- 当路由是 /web/news 时显示 Book 组件 -->
      <template v-if="route.path === '/web/news'">
        <Book :items="items" :modelValue="activeTab" document-path="/web/news/document"
          category-path="/web/news/category" @tab-change="handleTabChange"></Book>
      </template>
      <!-- 显示子路由内容 -->
      <router-view v-else></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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

// 保存滚动位置的常量键
const NEWS_SCROLL_POSITION_KEY = 'news_tab_scroll_position';
const TUTORIAL_SCROLL_POSITION_KEY = 'tutorial_tab_scroll_position';

// 根据当前激活的tab获取对应的存储键
const getCurrentScrollKey = () => {
  return activeTab.value === 1 ? TUTORIAL_SCROLL_POSITION_KEY : NEWS_SCROLL_POSITION_KEY;
};

// 保存当前滚动位置
const saveScrollPosition = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const currentKey = getCurrentScrollKey();

  try {
    sessionStorage.setItem(currentKey, scrollTop.toString());
  } catch (e) {
    console.error('保存滚动位置失败:', e);
  }
};

// 恢复滚动位置
const restoreScrollPosition = (key: string) => {
  try {
    const savedPosition = sessionStorage.getItem(key);
    if (savedPosition !== null) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedPosition),
          behavior: 'smooth'
        });
      }, 100);
    }
  } catch (e) {
    console.error('恢复滚动位置失败:', e);
  }
};

const handleTabChange = (index: number) => {
  // 在tab切换前保存当前滚动位置
  saveScrollPosition();

  const tab = index === 1 ? 'tutorial' : 'news';
  router.push({
    path: route.path,
    query: { ...route.query, tab }
  });

  // 切换后恢复新tab的滚动位置
  const newKey = index === 1 ? TUTORIAL_SCROLL_POSITION_KEY : NEWS_SCROLL_POSITION_KEY;
  restoreScrollPosition(newKey);
};

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: number | null = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

// 使用防抖处理滚动事件
const debouncedSaveScrollPosition = debounce(saveScrollPosition, 200);

// 滚动事件处理函数
const handleScroll = () => {
  debouncedSaveScrollPosition();
};

// 监听路由变化，处理hash锚点跳转
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

// 监听query参数变化，恢复对应tab的滚动位置
watch(
  () => route.query.tab,
  (newTab) => {
    if (route.path === '/web/news') {
      const key = newTab === 'tutorial' ? TUTORIAL_SCROLL_POSITION_KEY : NEWS_SCROLL_POSITION_KEY;
      restoreScrollPosition(key);
    }
  }
);

// 监听路由路径变化，处理详情页面的滚动
watch(
  () => route.path,
  (newPath) => {
    // 如果是新闻详情页面路由，例如 /web/news/document
    if (newPath.includes('/web/news/document')) {
      // 先等待组件渲染完成
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });
      }, 50);
    }
  },
  { immediate: true }
);

onMounted(() => {
  // 页面加载时恢复滚动位置
  const key = getCurrentScrollKey();
  restoreScrollPosition(key);

  // 添加滚动事件监听
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  // 移除滚动事件监听
  window.removeEventListener('scroll', handleScroll);

  // 页面卸载前保存当前滚动位置
  saveScrollPosition();
});

defineOptions({
  name: "News",
});
</script>

<style lang="scss" scoped>
.news-container {
  padding: 20px;
}

#news-container {
  scroll-margin-top: 64px;
}
</style>
