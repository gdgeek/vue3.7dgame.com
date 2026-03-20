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
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background-color: #f5f5f5;
}

.nav-container {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 999;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 64px;
  padding: 0 60px;
  margin: 0;
  transition: all 0.3s ease;

  // 默认样式（非关于我们页面）
  &.nav-default {
    background-color: #fff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  }

  // 透明样式（关于我们页面顶部）
  &.nav-transparent {
    background-color: transparent;
    box-shadow: none;
  }

  // 滚动样式（关于我们页面滚动后）
  &.nav-scrolled {
    background-color: #fff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
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
      padding: 8px 16px;
      font-size: 16px;
      color: #666;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.3s ease;

      &.text-white {
        color: #fff;

        &:hover {
          color: #1890ff;
          background-color: rgb(255 255 255 / 10%);
        }

        &.active {
          color: #1890ff;
          background-color: rgb(255 255 255 / 10%);
        }
      }

      &:hover {
        color: #1890ff;
        background-color: rgb(24 144 255 / 10%);
      }

      &.active {
        color: #1890ff;
        background-color: rgb(24 144 255 / 10%);
      }
    }
  }
}

.content-container {
  position: absolute;
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  overflow: hidden;
  background-color: #fff;

  .content-section {
    height: 100%;

    h1 {
      margin-bottom: 24px;
      font-size: 28px;
      color: #333;
    }

    p {
      font-size: 16px;
      line-height: 1.6;
      color: #666;
    }
  }
}
</style>
