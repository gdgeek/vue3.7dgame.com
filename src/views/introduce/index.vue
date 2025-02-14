<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav
      class="nav-container"
      :class="{
        'nav-scrolled': isScrolled && currentTab === 'about',
        'nav-transparent': currentTab === 'about' && !isScrolled,
        'nav-default': currentTab !== 'about',
      }"
    >
      <div class="nav-left">
        <img src="/media/image/logo.gif" alt="Logo" class="logo" />
        <span
          class="company-name"
          :class="{ 'text-white': currentTab === 'about' && !isScrolled }"
        >
          上海不加班科技有限公司
        </span>
      </div>
      <div class="nav-right">
        <div
          v-for="item in navItems"
          :key="item.key"
          :class="[
            'nav-item',
            {
              active: currentTab === item.key,
              'text-white': currentTab === 'about' && !isScrolled,
            },
          ]"
          @click="switchTab(item.key)"
        >
          {{ item.label }}
        </div>
      </div>
    </nav>

    <!-- 内容区域 -->
    <div class="content-container">
      <About v-if="currentTab === 'about'"></About>
      <div v-if="currentTab === 'products'" class="content-section">
        <h1>我们的产品</h1>
        <p>products</p>
      </div>
      <div v-if="currentTab === 'news'" class="content-section">
        <h1>新闻动态</h1>
        <p>news</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
// import About from "./components/About.vue";

defineOptions({
  name: "Introduce",
  inheritAttrs: false,
});

// 导航项配置
const navItems = [
  { key: "about", label: "关于我们" },
  { key: "products", label: "我们的产品" },
  { key: "news", label: "新闻动态" },
];

// 当前选中的标签
const currentTab = ref("about");

// 切换标签方法
const switchTab = (tab: string) => {
  currentTab.value = tab;
};

// 添加滚动状态控制
const isScrolled = ref(false);

// 处理滚动事件
const handleScroll = () => {
  isScrolled.value = window.scrollY > 500;
};

// 组件挂载时添加滚动监听
onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});

// 组件卸载时移除滚动监听
onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 60px;
  height: 64px;
  width: 100%;
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  margin: 0;
  transition: all 0.3s ease;

  // 默认样式（非关于我们页面）
  &.nav-default {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  // 透明样式（关于我们页面顶部）
  &.nav-transparent {
    background-color: transparent;
    box-shadow: none;
  }

  // 滚动样式（关于我们页面滚动后）
  &.nav-scrolled {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .nav-left {
    display: flex;
    align-items: center;

    .logo {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }

    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      transition: color 0.3s ease;

      &.text-white {
        color: #fff;
      }
    }
  }

  .nav-right {
    display: flex;
    gap: 48px;

    .nav-item {
      font-size: 16px;
      color: #666;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 4px;
      transition: all 0.3s ease;

      &.text-white {
        color: #fff;

        &:hover {
          color: #1890ff;
          background-color: rgba(255, 255, 255, 0.1);
        }

        &.active {
          color: #1890ff;
          background-color: rgba(255, 255, 255, 0.1);
        }
      }

      &:hover {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
      }

      &.active {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
      }
    }
  }
}

.content-container {
  position: absolute;
  width: 100%;
  flex: 1;
  background-color: #fff;
  box-sizing: border-box;
  overflow: hidden;

  .content-section {
    height: 100%;

    h1 {
      font-size: 28px;
      color: #333;
      margin-bottom: 24px;
    }

    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }
  }
}
</style>
