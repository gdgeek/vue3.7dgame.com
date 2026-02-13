<template>
  <div class="content">
    <div v-loading="loading" :class="['box1', { 'dark-theme': isDark }]">
      <div :class="['box2', { 'dark-theme': isDark }]">
        <h1>{{ $t("login.h1") }}</h1>

        <h4>{{ $t("login.h4") }}</h4>
        <br />
        <el-card style="width: 100%" shadow="never">
          <span>登录账号</span>
          <br />
          <br />
          <name-password></name-password>
        </el-card>
        <br />
        <div style="width: 100%" shadow="never" class="apple-login-container">
          <wechat></wechat>
        </div>
        <br />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import environment from "@/environment";
import "@/assets/font/font.css";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import NamePassword from "@/components/Account/NamePassword.vue";
import Wechat from "@/components/Account/Wechat.vue";
const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);
const loading = ref<boolean>(false);
</script>

<style scoped lang="scss">
body {
  position: fixed;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  background-image: url("/media/bg/02.jpg");
  background-size: 100% auto;

  // transition:  0.3s ease;
  &.dark-theme {
    background-image: url("/media/bg/02.jpg");
    filter: brightness(80%);
  }
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  .box1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 450px;
    height: 90%;
    background-color: var(--bg-card, #fff);
    transition: all 0.3s ease;

    &.mobile {
      width: 430;
      height: 100%;
    }

    .box2 {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 90%;
      height: 90%;
      padding: 25px;
      border: 1px solid var(--border-color, #ebeefe);
      border-radius: 4px;
      transition: all 0.3s ease;
      background-color: var(--bg-card, #fff);
      color: var(--text-primary, #333);

      &:hover {
        box-shadow: var(--shadow-md, 0 0 10px rgb(0 0 0 / 10%));
        transition: all 0.4s;
      }

      h1 {
        margin-top: 0;
        font-size: 36px;
        font-weight: 500;
      }

      h4 {
        margin-top: 0;
        font-size: 18px;
        font-weight: 400;
        color: var(--text-secondary, #666);
      }

      el-button {
        align-self: center;
        margin-top: 2px;
      }
    }
  }

  .apple-login-container {
    justify-content: center;
    width: 100%;
  }
}
</style>
