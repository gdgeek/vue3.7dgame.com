<template>
  <div class="sso-container">
    Processing login...
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/store/modules/app';

import AuthAPI from "@/api/v1/auth";
import Token from '@/store/modules/token';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

onMounted(async () => {
  const { refreshToken, lang, redirect } = route.query;

  if (refreshToken) {


    const response = await AuthAPI.refresh(refreshToken as string);
    Token.setToken(response.data.token);
    //
    //alert(JSON.stringify(response.data.token))
    // Set token
    //alert(JSON.stringify(response))
    // Token.setToken(token);
  }

  if (lang) {
    // Set language
    appStore.changeLanguage(lang as string);
  }

  // Redirect
  const redirectPath = (redirect as string) || '/home/index';
  router.replace(redirectPath);
});
</script>

<style scoped>
.sso-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #666;
}
</style>
