<template>
  <div class="app-container" :class="{ 'dark-theme': isDark }">
    <iframe src="https://forum.rokid.com/index" class="full-height" frameborder="0" allowfullscreen></iframe>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useRouter, useRoute } from "vue-router";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'
const router = useRouter();
const route = useRoute();
const contentRef = ref<HTMLElement | null>(null);
const settingsStore = useSettingsStore();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

defineOptions({
  name: "WebHome",
  inheritAttrs: false,
});

const open = () => {
  ElMessageBox.alert('链接至Rokid论坛，如有问题进入【低代码编程】分区进行讨论。', '论坛求助', {
    // if you want to disable its autofocus
    // autofocus: false,
    confirmButtonText: '确认',
    callback: (action: Action) => {

    },
  })
}

const loginDialogRef = ref<any>(null);





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
  //isScrolled.value = window.scrollY > 50;
  // 保存滚动位置（使用防抖）
  debouncedSaveScrollPosition();
};

const isMobile = ref(false);
const sidebarVisible = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

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
      behavior: 'smooth'
    });
  }
};

// 监听窗口大小变化和滚动事件
onMounted(() => {
  open();
  //滚到news上
  const section = route.query.section;
  if (section) {

    setTimeout(() => {
      scrollToSection("news");
    }, 100);
  }
  checkMobile();
  window.addEventListener("resize", checkMobile);
  window.addEventListener("scroll", handleScroll);

  // 初始化AOS动画库
  AOS.init({
    duration: 1000,
    once: false,
    mirror: true
  });

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
.full-height {
  height: calc(100vh);
  width: 100%;
  border: none;
}

.app-container {
  position: relative;
  min-height: 100vh;
  background-color: #ffffff;
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;

  &.dark-theme {
    background-color: #121212;
    color: #fff;
  }
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 60px;
  height: 70px;
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
  backdrop-filter: blur(0);

  &.nav-scrolled {
    height: 64px;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  }

  &.dark-theme {
    &.nav-scrolled {
      background-color: rgba(18, 18, 18, 0.9);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
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
    align-items: center;
    gap: 30px;

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
        height: 2px;
        width: 0;
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
      border-radius: 10px;
      // background: linear-gradient(90deg, #00dbde, #fc00ff);
      background: linear-gradient(90deg, #00a8ab 0%, #bfbfbf 100%);
      border: none;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        background: linear-gradient(90deg, #bfbfbf 0%, #00a8ab 100%);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
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
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #fff;
  box-sizing: border-box;
  overflow: hidden;

  &.dark-theme {
    background-color: #121212;
  }
}

// 侧边栏遮罩层
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 998;
  backdrop-filter: blur(4px);
}

// 侧边栏菜单
.sidebar-menu {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100vh;
  background-color: #fff;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 2px 0 30px rgba(0, 0, 0, 0.15);
  overflow-y: auto;

  &.dark-theme {
    background-color: #1e1e1e;
    box-shadow: 2px 0 30px rgba(0, 0, 0, 0.5);

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
          background-color: rgba(0, 219, 222, 0.1);
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
    padding: 24px;
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

    .theme-switch-mobile {
      padding: 16px 24px;
      display: flex;
      justify-content: flex-start;
      border-bottom: 1px solid #f0f0f0;
    }

    .sidebar-item {
      padding: 16px 24px;
      font-size: 16px;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
      border-bottom: 1px solid #f0f0f0;

      &:hover {
        background-color: rgba(0, 219, 222, 0.05);
        color: #00dbde;
      }
    }
  }
}

// 移动端适配样式
@media screen and (max-width: 992px) {
  .nav-container {
    padding: 0 30px;
  }
}

@media screen and (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
    height: 60px;
  }

  .content-container {
    padding-top: 0;
  }

  .sidebar-items .theme-switch-mobile {
    border-bottom-color: #333;
  }
}
</style>
