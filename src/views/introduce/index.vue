<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="nav-container" :class="{
      'nav-scrolled':
        isScrolled && (currentTab === 'about' || currentTab === 'products') && !isMobile,
      'nav-transparent':
        (currentTab === 'about' || currentTab === 'products') && !isScrolled && !isMobile,
      'nav-default': (currentTab !== 'about' && currentTab !== 'products') || isMobile,
    }">
      <div class="nav-left">
        <div class="menu-icon" @click="toggleSidebar" v-show="isMobile">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <!-- 桌面端显示 -->
        <template v-if="!isMobile">
          <img src="/media/image/logo.gif" alt="Logo" class="logo" />
          <span class="company-name" :class="{
            'text-white':
              (currentTab === 'about') && !isScrolled,
          }">
            不加班AR编程平台
          </span>
        </template>
        <!-- 移动端显示 -->
        <template v-else>
          <div class="mobile-breadcrumb">
            <span class="breadcrumb-home" @click="switchTab('about')">不加班AR编程平台</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">{{
              navItems.find((item) => item.key === currentTab)?.label
            }}</span>
          </div>
        </template>
      </div>
      <div class="nav-right" v-show="!isMobile">
        <div v-for="item in navItems" :key="item.key" :class="[
          'nav-item',
          {
            active: currentTab === item.key,
            'text-white':
              (currentTab === 'about') &&
              !isScrolled,
          },
        ]" @click="switchTab(item.key)">
          {{ item.label }}
        </div>
      </div>
    </nav>

    <!-- 移动端侧边栏菜单 -->
    <div class="sidebar-overlay" v-if="isMobile && sidebarVisible" @click="toggleSidebar"></div>
    <div class="sidebar-menu" :class="{ 'sidebar-visible': sidebarVisible }" v-if="isMobile">
      <!-- 侧边栏顶部 -->
      <div class="sidebar-header">
        <img src="/media/image/logo.gif" alt="Logo" class="sidebar-logo" />
        <span class="sidebar-company-name">上海不加班科技有限公司</span>
      </div>
      <div class="sidebar-items">
        <div v-for="item in navItems" :key="item.key" class="sidebar-item" :class="{ active: currentTab === item.key }"
          @click="handleSidebarItemClick(item.key)">
          {{ item.label }}
        </div>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div class="content-container">
      <router-view></router-view>
      <FooterContainer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import FooterContainer from "./components/FooterContainer.vue";

const router = useRouter();
const route = useRoute();

defineOptions({
  name: "Introduce",
  inheritAttrs: false,
});

const navItems = [
  { key: "about", label: "关于我们" },
  { key: "products", label: "产品案例" },
  { key: "news", label: "新闻动态" },
  { key: "login", label: "登录平台" },
];

const currentTab = ref("about");

// 切换标签方法
const switchTab = (tab: string) => {
  if (tab === "login") {
    router.push("/site/login");
    return;
  }
  // 更新路由时使用相对路径
  router.push(tab);
  currentTab.value = tab;
};

watch(
  () => route.path,
  (newPath) => {
    const tab = newPath.split("/").pop() || "about";
    currentTab.value = tab;
  },
  { immediate: true }
);

const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 250;
};

const isMobile = ref(false);
const sidebarVisible = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 切换侧边栏显
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value;
};

const handleSidebarItemClick = (tab: string) => {
  switchTab(tab);
  toggleSidebar();
};

// 监听窗口大小变化
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style lang="scss" scoped>
.app-container {
  position: relative;
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

    .menu-icon {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 24px;
      height: 20px;
      margin-right: 16px;
      cursor: pointer;

      span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: currentColor;
        transition: all 0.3s ease;
      }
    }

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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

// 侧边栏遮罩层
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

// 侧边栏菜单
.sidebar-menu {
  position: fixed;
  top: 0;
  left: -280px;
  width: 280px;
  height: 100vh;
  background-color: #fff;
  z-index: 999;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);

  &.sidebar-visible {
    left: 0;
  }

  .sidebar-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 12px;

    .sidebar-logo {
      width: 32px;
      height: 32px;
    }

    .sidebar-company-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  }

  .sidebar-items {
    margin-top: 0;
    padding: 20px 0;

    .sidebar-item {
      padding: 16px 24px;
      font-size: 16px;
      color: #666;
      cursor: pointer;
      transition: all 0.3s ease;

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

// 移动端面包屑导航样式
.mobile-breadcrumb {
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;

  .breadcrumb-home {
    color: #333;
    cursor: pointer;

    &:hover {
      color: #1890ff;
    }
  }

  .breadcrumb-separator {
    color: #333;
  }

  .breadcrumb-current {
    color: #333;
    font-weight: 500;
  }
}

// 移动端适配样式
@media screen and (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
    height: 50px;
    background-color: #fff !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;

    .nav-left {
      .menu-icon {
        margin-right: 12px;
      }
    }
  }
}
</style>
