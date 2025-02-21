<template>
  <div class="content">
    <div :class="['box', { 'dark-theme': isDark }]">
      <el-card shadow="hover" :body-style="{ padding: '15px' }">
        <div class="logout-head">
          <h1 class="logout-welcome">{{ t("login.logout.title") }}</h1>
          <p class="logout-text">{{ t("login.logout.text") }}</p>
          <div>
            <p class="logout-lead"></p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useRouter } from "vue-router";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";

const router = useRouter();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

onMounted(() => {
  setTimeout(() => {
    router.push("/site/login?redirect=/home/index");
  }, 1000);
});
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
}

.box {
  position: relative;
  height: auto;
  width: 400px;
  max-width: 100%;
  padding: 10px 10px 10px 10px;
  margin: 0 auto;
  margin-bottom: 20px;
  border-radius: 5px;
  background-color: #fff;
  overflow: hidden;

  transition: all 0.3s ease;

  &.dark-theme {
    background-color: rgb(63, 63, 63);
    border-color: #494949;
    color: white;
  }
}

.logout-head {
  padding: 10px;
  max-width: 100%;
}

.logout-welcome {
  margin-top: 20px;
  font-size: 36px;
  font-weight: normal;
  color: #666;
}

.logout-text {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}

.logout-lead {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}
</style>
