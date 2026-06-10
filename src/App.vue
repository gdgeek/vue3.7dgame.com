<template>
  <!-- 一级路由出口组件 -->
  <!-- <RouterView></RouterView> -->

  <!-- <router-view v-slot="{ Component }" v-mouse-effect v-particle-effect> -->
  <!-- <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <keep-alive>
        <component :is="Component"></component>
      </keep-alive>
    </transition>
  </router-view> -->
  <el-config-provider :locale="elementLocale">
    <router-view v-slot="{ Component, route }">
      <transition name="page" mode="out-in" :key="getPageTransitionKey(route)">
        <component :is="Component"></component>
      </transition>
    </router-view>
  </el-config-provider>
  <span class="global-version">v{{ appVersion }}</span>
</template>
<script setup>
import { UpdateAbility } from "@/utils/ability";
import { useAbility } from "@casl/vue";
import { ElConfigProvider } from "element-plus";
import en from "element-plus/es/locale/lang/en";
import ja from "element-plus/es/locale/lang/ja";
import th from "element-plus/es/locale/lang/th";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import zhTw from "element-plus/es/locale/lang/zh-tw";
import { useAppStore } from "@/store/modules/app";
import { useUserStore } from "@/store/modules/user";
import { useDomainStore } from "@/store/modules/domain";
import { UpdateRoutes } from "@/router";
import { disposeKTX2Loader } from "@/lib/three/loaders";
import authClient from "@/services/auth/authClient";
import { logger } from "@/utils/logger";

/** @type {string} */
const appVersion = __APP_VERSION__;

const userStore = useUserStore();
const domainStore = useDomainStore();
const ability = useAbility(); // 提取到 setup 顶层
const appStore = useAppStore();

const elementLocaleMap = {
  "zh-CN": zhCn,
  "zh-TW": zhTw,
  "en-US": en,
  "ja-JP": ja,
  "th-TH": th,
};

const elementLocale = computed(
  () => elementLocaleMap[appStore.language] || zhCn
);

function getPageTransitionKey(route) {
  if (route?.meta?.preserveComponentOnQueryChange) {
    return `${route.path}:${JSON.stringify(route.params || {})}`;
  }

  return route.fullPath;
}

function getHttpStatus(error) {
  return error?.response?.status;
}

function isExpired(expires) {
  if (!expires) {
    return false;
  }

  const expiresAt = new Date(expires).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

async function ensureBootToken() {
  if (!authClient.getAccessToken()) {
    return false;
  }

  const tokenInfo = authClient.getTokenInfo();
  if (!isExpired(tokenInfo?.expires)) {
    return true;
  }

  try {
    await authClient.refresh();
    return Boolean(authClient.getAccessToken());
  } catch (error) {
    if (getHttpStatus(error) === 401) {
      authClient.clearToken("unauthorized");
    } else {
      logger.warn("Failed to refresh auth token during app bootstrap:", error);
    }
    return false;
  }
}

watch(
  () => userStore.userInfo,
  (newUserInfo) => {
    if (
      newUserInfo == null ||
      newUserInfo.id === 0 ||
      userStore.userInfo == null
    ) {
      return;
    }
    UpdateAbility(ability, userStore.userInfo.roles, userStore.userInfo.id);
    UpdateRoutes(ability);
  },
  { deep: true, immediate: true }
);

onMounted(async () => {
  // Fetch domain SEO info on app startup
  await domainStore.fetchDomainInfo();

  if (await ensureBootToken()) {
    try {
      await userStore.getUserInfo();
    } catch (error) {
      if (getHttpStatus(error) === 401) {
        authClient.clearToken("unauthorized");
      } else {
        logger.error("Failed to bootstrap user info:", error);
      }
    }
  }
});

// 可选：应用销毁时释放共享 KTX2 Loader 资源（减少热重载显存/内存占用）
onUnmounted(() => {
  disposeKTX2Loader();
});
</script>
<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to

/* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}

/* 新增页面过渡效果 */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0, 0.1, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;

  /* 确保 canvas 在最上层 */
}

.global-version {
  position: fixed;
  right: 12px;
  bottom: 8px;
  font-size: 11px;
  color: #ccc;
  pointer-events: none;
  z-index: 9999;
  user-select: none;
}
</style>
