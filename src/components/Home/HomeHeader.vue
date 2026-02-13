<template>
  <div class="home-header">
    <el-row
      :gutter="10"
      justify="space-between"
      align="middle"
      class="home-header-row"
    >
      <el-col :md="16" :span="24">
        <div class="home-greeting-container">
          <h1 class="home-greeting-title">
            {{ greeting }}<span class="home-username">{{ name }}</span>
          </h1>
          <p class="home-greeting-subtitle">
            {{
              t(
                "homepage.header.subtitle",
                "探索 AR 的无限可能，开启您的创意之旅。"
              )
            }}
          </p>
        </div>
      </el-col>
      <el-col :md="8" :span="24">
        <div :class="['home-header-button', { mobile: isMobile }]">
          <button class="btn-secondary home-btn" @click="showQRCode()">
            <span class="material-symbols-outlined btn-icon">qr_code_2</span>
            {{ t("login.loginCode") }}
          </button>
        </div>
      </el-col>
    </el-row>
  </div>

  <QRCodeDialog ref="codeDialog"></QRCodeDialog>
</template>

<script setup lang="ts">
import QRCodeDialog from "./QRCodeDialog.vue";
import { useUserStore } from "@/store/modules/user";
import { useScreenStore } from "@/store";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const codeDialog = ref<any>(null);

const userStore = useUserStore();
const { t } = useI18n();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);

const name = computed(() => {
  if (userStore.userInfo === null || userStore.userInfo.userData === null) {
    return "";
  }
  if (userStore.userInfo.userData.nickname) {
    return userStore.userInfo.userData.nickname;
  } else {
    return userStore.userInfo.userData.username;
  }
});

const greeting = computed(() => {
  const hours = new Date().getHours();
  if (6 < hours && hours < 12) {
    return t("homepage.greeting.morning");
  } else if (hours < 13) {
    return t("homepage.greeting.noon");
  } else if (hours < 18) {
    return t("homepage.greeting.afternoon");
  } else {
    return t("homepage.greeting.evening");
  }
});

const showQRCode = () => {
  codeDialog.value.openDialog();
};
</script>

<style lang="scss" scoped>
.home-header {
  position: relative;
  width: auto;
  padding: 0;
  background: transparent;
}

.home-greeting-title {
  margin: 0 0 16px 0; // Increased spacing to 16px as requested
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.home-username {
  color: var(--primary-color, #03a9f4);
}

.home-greeting-subtitle {
  margin: 0;
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.home-header-row {
  position: relative;
  z-index: 1;
  align-items: flex-end; // Align items to bottom so button aligns with subtitle
}

.home-header-button {
  display: flex;
  justify-content: flex-end;
  padding: 0;
  margin-top: 0;
  padding-bottom: 4px; // Fine-tune alignment with text baseline

  &.mobile {
    justify-content: flex-start;
    margin-top: var(--spacing-md);
    padding-bottom: 0;
  }
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  box-shadow: 0 4px 12px var(--shadow-sm, rgba(0, 0, 0, 0.08));

  .btn-icon {
    font-size: 20px;
    color: var(--primary-color, #03a9f4);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px var(--shadow-md, rgba(0, 0, 0, 0.12));
    background: var(--bg-hover, #f8fafc);
  }
}
</style>
