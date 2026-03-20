<template>
  <div class="sso-container">Processing login...</div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/store/modules/app";

import { refresh as authRefresh } from "@/api/v1/auth";
import Token from "@/store/modules/token";
import { useUserStore } from "@/store/modules/user";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();

onMounted(async () => {
  const { refreshToken, lang, redirect } = route.query;

  if (refreshToken) {
    try {
      const response = await authRefresh(refreshToken as string);
      Token.setToken(response.data.token);

      // 拉取并设置用户信息（使用 store 提供的方法）
      try {
        await userStore.getUserInfo();
      } catch (err) {
        logger.error("Failed to fetch user info after refresh:", err);
      }
    } catch (err) {
      logger.error("Refresh token failed in SSO callback:", err);
    }
  }

  if (lang) {
    appStore.changeLanguage(lang as string);
  }

  // Redirect
  const redirectPath = (redirect as string) || "/home/index";
  router.replace(redirectPath);
});
</script>

<style scoped>
.sso-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 18px;
  color: #666;
}
</style>
