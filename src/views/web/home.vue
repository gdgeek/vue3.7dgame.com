<template>
  <div :class="{ 'dark-theme': isDark }">
    <!-- 新闻动态 -->
    <section id="news" ref="newsRef">
      <News.default :activeTabName="section"></News.default>
    </section>

    <section id="status" ref="statusRef">
      <Buy.default></Buy.default>
    </section>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import "@/assets/font/font.css";
import * as Buy from "./components/Buy.vue";
import { useRouter, useRoute } from "vue-router";
import * as News from "./components/News/index.vue";

import { useAOS } from "@/composables/useAOS";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";

useAOS();

const router = useRouter();
const route = useRoute();
const contentRef = ref<HTMLElement | null>(null);

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);

defineOptions({
  name: "WebHome",
  inheritAttrs: false,
});

const section = computed(() => {
  return route.query.section ? (route.query.section as string) : "news";
});

// 自动滚动
const SCROLL_POSITION_KEY = "web_scroll_position";

// 保存滚动位置
const saveScrollPosition = () => {
  if (contentRef.value) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollTop.toString());
    } catch (e) {
      logger.error("保存滚动位置失败:", e);
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
          behavior: "auto",
        });
      });
    }
  } catch (e) {
    logger.error("恢复滚动位置失败:", e);
  }
};

const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const newsRef = ref<HTMLElement | null>(null);
// 滚动到指定部分的函数
const scrollToSection = (sectionId: string) => {
  // 计算导航栏高度（加点额外的间距）
  const navHeight = 80;

  // 根据传入的ID获取对应的元素
  const element = document.getElementById(sectionId);

  if (element) {
    // 获取元素相对于视口的位置
    const elementPosition = element.getBoundingClientRect().top;
    // 获取当前滚动位置
    const offsetPosition = elementPosition + window.scrollY - navHeight;

    // 平滑滚动到指定位置
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
};

// 监听窗口大小变化和滚动事件
onMounted(() => {
  //滚到news上
  const section = route.query.section;
  if (section) {
    setTimeout(() => {
      scrollToSection("news");
    }, 100);
  }
  checkMobile();
  window.addEventListener("resize", checkMobile);

  // 恢复滚动位置
  restoreScrollPosition();

  // 监听路由变化，在路由变化后保存滚动位置
  router.beforeEach((to, from) => {
    if (from.path.startsWith("/web")) {
      saveScrollPosition();
    }
    return true;
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  // 页面卸载前保存滚动位置
  saveScrollPosition();
});
</script>

<style lang="scss" scoped>
.app-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background-color: #fff;

  &.dark-theme {
    color: #fff;
    background-color: #121212;
  }
}

.dark-theme {
  color: #f0f0f0;
  background-color: #121212;
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
  height: 70px;
  padding: 0 60px;
  margin: 0;
  background-color: transparent;
  backdrop-filter: blur(0);
  transition: all 0.3s ease;

  &.nav-scrolled {
    height: 64px;
    background-color: rgb(255 255 255 / 95%);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 20px rgb(0 0 0 / 10%);
  }

  &.dark-theme {
    &.nav-scrolled {
      background-color: rgb(18 18 18 / 90%);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 20px rgb(0 0 0 / 30%);
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

  .nav-middle {
    display: flex;
    gap: 30px;
    align-items: center;

    .nav-menu-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;

      .menu-text {
        font-size: 15px;
        font-weight: 500;
        color: #fff;
        transition: all 0.3s ease;
      }

      .menu-line {
        position: absolute;
        bottom: -6px;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #00dbde, #afafaf);
        transition: all 0.3s ease;
      }

      &:hover {
        .menu-text {
          color: #00dbde;
        }

        .menu-line {
          width: 100%;
        }
      }
    }
  }

  .nav-right {
    display: flex;
    align-items: center;

    .theme-switch {
      margin-right: 24px;
    }

    .login-button {
      padding: 8px 20px;
      font-size: 15px;
      font-weight: 500;
      // background: linear-gradient(90deg, #00dbde, #fc00ff);
      background: linear-gradient(90deg, #00a8ab 0%, #bfbfbf 100%);
      border: none;
      border-radius: 10px;
      transition: all 0.3s ease;

      &:hover {
        background: linear-gradient(90deg, #bfbfbf 0%, #00a8ab 100%);
        box-shadow: 0 8px 15px rgb(0 0 0 / 20%);
        transform: translateY(-1px);
      }

      &.mobile-button {
        padding: 6px 14px;
        font-size: 14px;
      }
    }

    .hamburger-menu {
      margin-left: 16px;
      font-size: 24px;
      color: #fff;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.1);
      }
    }
  }

  &.nav-scrolled {
    .nav-left .company-name,
    .nav-middle .nav-menu-item .menu-text,
    .nav-right .hamburger-menu {
      color: #333;
    }

    &.dark-theme {
      .nav-left .company-name,
      .nav-middle .nav-menu-item .menu-text,
      .nav-right .hamburger-menu {
        color: #fff;
      }
    }
  }
}

.content-container {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background-color: #fff;

  &.dark-theme {
    background-color: #121212;
  }
}

// 侧边栏遮罩层
.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 998;
  background-color: rgb(0 0 0 / 60%);
  backdrop-filter: blur(4px);
}

// 侧边栏菜单
.sidebar-menu {
  position: fixed;
  top: 0;
  left: -300px;
  z-index: 999;
  width: 300px;
  height: 100vh;
  overflow-y: auto;
  background-color: #fff;
  box-shadow: 2px 0 30px rgb(0 0 0 / 15%);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.dark-theme {
    background-color: #1e1e1e;
    box-shadow: 2px 0 30px rgb(0 0 0 / 50%);

    .sidebar-header {
      border-bottom: 1px solid #333;

      .sidebar-company-name {
        color: #f0f0f0;
      }
    }

    .sidebar-items {
      .sidebar-item {
        color: #d0d0d0;
        border-bottom: 1px solid #333;

        &:hover {
          background-color: rgb(0 219 222 / 10%);
        }
      }
    }
  }

  &.sidebar-visible {
    left: 0;

    // 侧边栏显示时的logo和名称动画
    .sidebar-header {
      .sidebar-logo {
        opacity: 1;
        transform: scale(1);
      }

      .sidebar-company-name {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }

  .sidebar-header {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid #f0f0f0;

    .sidebar-logo {
      width: 32px;
      height: 32px;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition-delay: 0.1s;
      transform: scale(0.8);
    }

    .sidebar-company-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition-delay: 0.2s;
      transform: translateX(-20px);
    }
  }

  .sidebar-items {
    margin-top: 0;

    .theme-switch-mobile {
      display: flex;
      justify-content: flex-start;
      padding: 16px 24px;
      border-bottom: 1px solid #f0f0f0;
    }

    .sidebar-item {
      padding: 16px 24px;
      font-size: 16px;
      color: #333;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: all 0.3s ease;

      &:hover {
        color: #00dbde;
        background-color: rgb(0 219 222 / 5%);
      }
    }
  }
}

// 媒体查询适配
@media screen and (width <= 992px) {
  .nav-container {
    padding: 0 30px;
  }
}

@media screen and (width <= 768px) {
  .nav-container {
    height: 60px;
    padding: 0 16px;
  }

  .content-container {
    padding-top: 0;
  }

  .sidebar-items .theme-switch-mobile {
    border-bottom-color: #333;
  }
}
</style>
