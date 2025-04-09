<template>
  <div class="app-container" :class="{ 'dark-theme': isDark }">
    <!-- 导航栏 -->
    <nav class="nav-container" :class="{ 'nav-scrolled': isScrolled, 'dark-theme': isDark }">
      <div class="nav-left">
        <img src="/media/image/logo.gif" alt="Logo" class="logo" />
        <!-- <span class="company-name">不加班AR编程平台</span> -->
        <RadiantText
          class="inline-flex items-center justify-center pl-0 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400"
          :duration="5" :fontSize="isMobile ? 16 : 20" :textColor="getTextColor()">
          <span class="font-bold">不加班AR编程平台</span>
        </RadiantText>
      </div>
      <div class="nav-right">
        <div class="theme-switch" v-if="!isMobile">
          <el-switch v-model="isDark" inline-prompt active-icon="Moon" inactive-icon="Sunny"
            @change="toggleTheme"></el-switch>
        </div>
        <div class="nav-item" @click="openLoginDialog" :class="{ 'mobile-nav-item': isMobile }">
          登录平台
        </div>
      </div>
    </nav>

    <!-- 移动端侧边栏菜单 -->
    <div class="sidebar-overlay" v-if="isMobile && sidebarVisible" @click="toggleSidebar"></div>
    <div class="sidebar-menu" :class="{ 'sidebar-visible': sidebarVisible, 'dark-theme': isDark }" v-if="isMobile">
      <!-- 侧边栏顶部 -->
      <div class="sidebar-header">
        <img src="/media/image/logo.gif" alt="Logo" class="sidebar-logo" />
        <span class="sidebar-company-name">不加班AR编程平台</span>
      </div>
      <div class="sidebar-items">
        <div class="theme-switch-mobile">
          <el-switch v-model="isDark" inline-prompt active-icon="Moon" inactive-icon="Sunny"
            @change="toggleTheme"></el-switch>
        </div>
        <div v-for="item in navItems" :key="item.key" class="sidebar-item" :class="{ active: currentTab === item.key }"
          @click="handleSidebarItemClick(item.key)">
          {{ item.label }}
        </div>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div class="content-container" ref="contentRef" :class="{ 'dark-theme': isDark }">

      <Banner />

      <router-view></router-view>

      <Footer :maxwidth="true" />
    </div>

    <!-- 登录对话框 -->
    <LoginDialog ref="loginDialogRef" />
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useRouter, useRoute } from "vue-router";
import Banner from "./components/Banner.vue";
import Footer from "@/layout/components/NavBar/components/Footer.vue";
import LoginDialog from "@/components/Account/LoginDialog.vue";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";

const router = useRouter();
const route = useRoute();
const contentRef = ref<HTMLElement | null>(null);
const settingsStore = useSettingsStore();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

defineOptions({
  name: "Introduce",
  inheritAttrs: false,
});

const navItems = [
  { key: "login", label: "登录平台" },
];

const currentTab = ref("login");

const loginDialogRef = ref<any>(null);

/** 主题切换 */
const toggleTheme = () => {
  const newTheme = isDark.value ? ThemeEnum.DARK : ThemeEnum.LIGHT;
  settingsStore.changeTheme(newTheme);
};

// 根据主题和滚动状态获取文本颜色
const getTextColor = () => {
  if (isDark.value) {
    return '#fff';
  } else {
    return isScrolled.value ? '#333' : '#fff';
  }
};

const openLoginDialog = () => {
  if (loginDialogRef.value) {
    loginDialogRef.value.openDialog();
  }
};

const switchTab = (tab: string) => {
  if (tab === 'login') {
    openLoginDialog();
  }
};

watch(
  () => route.path,
  (newPath) => {
    currentTab.value = "login";
  },
  { immediate: true }
);

const isScrolled = ref(false);

// 自动滚动
const SCROLL_POSITION_KEY = 'web_scroll_position';

// 保存滚动位置
const saveScrollPosition = () => {
  if (contentRef.value) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollTop.toString());
    } catch (e) {
      console.error('保存滚动位置失败:', e);
    }
  }
};

// 恢复滚动位置
const restoreScrollPosition = () => {
  try {
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition !== null) {
      nextTick(() => {
        window.scrollTo({
          top: parseInt(savedPosition),
          behavior: 'auto'
        });
      });
    }
  } catch (e) {
    console.error('恢复滚动位置失败:', e);
  }
};

// 防抖
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

// 监听滚动事件
const handleScroll = () => {
  isScrolled.value = window.scrollY > 250;
  // 保存滚动位置（使用防抖）
  debouncedSaveScrollPosition();
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

// 监听窗口大小变化和滚动事件
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  window.addEventListener("scroll", handleScroll);

  // 恢复滚动位置
  restoreScrollPosition();

  // 监听路由变化，在路由变化后保存滚动位置
  router.beforeEach((to, from) => {
    if (from.path.startsWith('/web')) {
      saveScrollPosition();
    }
    return true;
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("scroll", handleScroll);
  // 页面卸载前保存滚动位置
  saveScrollPosition();
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

  &.dark-theme {
    background-color: #1e1e1e;
    color: #fff;
  }
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
  background-color: transparent;

  &.nav-scrolled {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.dark-theme {
    &.nav-scrolled {
      background-color: #252525;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
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
      font-weight: 600;
      color: #fff;
      transition: color 0.3s ease;
    }
  }

  .nav-right {
    display: flex;
    align-items: center;

    .theme-switch {
      margin-right: 20px;
    }

    .nav-item {
      font-size: 16px;
      color: #fff;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 4px;
      transition: all 0.3s ease;

      &.mobile-nav-item {
        font-size: 14px;
        padding: 6px 12px;
      }

      &:hover {
        color: #1890ff;
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &.nav-scrolled {

    .nav-left .company-name,
    .nav-right .nav-item {
      color: #333;
    }

    &.dark-theme {

      .nav-left .company-name,
      .nav-right .nav-item {
        color: #fff;
      }

      .nav-right .nav-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
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

  &.dark-theme {
    background-color: #1e1e1e;

    .content-section {
      h1 {
        color: #f0f0f0;
      }

      p {
        color: #d0d0d0;
      }
    }
  }

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

  &.dark-theme {
    background-color: #252525;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);

    .sidebar-header {
      border-bottom: 1px solid #333;

      .sidebar-company-name {
        color: #f0f0f0;
      }
    }

    .sidebar-items {
      .sidebar-item {
        color: #d0d0d0;

        &:hover {
          background-color: rgba(24, 144, 255, 0.2);
        }

        &.active {
          color: #1890ff;
          background-color: rgba(24, 144, 255, 0.2);
        }
      }
    }
  }

  &.sidebar-visible {
    left: 0;

    // 侧边栏显示时的logo和名称动画
    .sidebar-header {
      .sidebar-logo {
        transform: scale(1);
        opacity: 1;
      }

      .sidebar-company-name {
        transform: translateX(0);
        opacity: 1;
      }
    }
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
      transform: scale(0.8);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition-delay: 0.1s;
    }

    .sidebar-company-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      transform: translateX(-20px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition-delay: 0.2s;
    }
  }

  .sidebar-items {
    margin-top: 0;
    padding: 20px 0;

    .theme-switch-mobile {
      padding: 0 24px 16px;
      display: flex;
      justify-content: flex-start;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 10px;
    }

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
  }

  .content-container {
    min-height: calc(100vh - 50px);
  }

  .sidebar-items .theme-switch-mobile {
    border-bottom-color: #333;
  }
}
</style>
