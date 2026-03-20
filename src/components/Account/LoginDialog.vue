<template>
  <el-dialog
    v-model="dialogVisible"
    width="420px"
    destroy-on-close
    center
    @closed="handleDialogClosed"
    class="login-dialog"
    :class="{ 'dark-theme': isDark }"
  >
    <div class="login-container">
      <!-- 顶部标题与图标 -->
      <div class="login-header">
        <img
          :src="domainStore.icon || '/media/image/logo.gif'"
          alt="Logo"
          class="login-logo"
        />
        <h2 class="login-title">{{ domainStore.title }}</h2>
      </div>

      <!-- 内容区域 -->
      <div class="login-content">
        <div>
          <NamePassword
            @login-success="handleLoginSuccess"
            @switch-to-register="toggleRegisterMode"
          ></NamePassword>
          <br />
          <Wechat></Wechat>
        </div>
      </div>

      <!-- 底部协议 -->
      <div class="login-footer">
        <p class="agreement-text">
          {{ t("login.agreementPrefix") }}
          <a href="#" @click.prevent="openAgreement('terms')">{{
            t("login.termsOfService")
          }}</a>
          {{ t("login.agreementAnd") }}
          <a href="#" @click.prevent="openAgreement('privacy')">{{
            t("login.privacyPolicy")
          }}</a>
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import NamePassword from "./NamePassword.vue";
import Wechat from "./Wechat.vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/store/modules/settings";
import { useDomainStore } from "@/store/modules/domain";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { Message } from "@/components/Dialog";

const emit = defineEmits(["dialog-closed"]);
const settingsStore = useSettingsStore();
const domainStore = useDomainStore();
const { t } = useI18n();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const dialogVisible = ref(false);
const activeTab = ref("account-register");
const isRegisterMode = ref(false);

// 切换账号登录和注册模式
const toggleRegisterMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
};

const openDialog = () => {
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
};

const handleLoginSuccess = () => {
  dialogVisible.value = false;
  Message.success(t("login.success"));
};

const handleDialogClosed = () => {
  emit("dialog-closed");
  // 重置状态
  activeTab.value = "account-register";
  isRegisterMode.value = false;
};

const openAgreement = (type: "terms" | "privacy") => {
  // 打开相应的协议页面，都指向隐私政策页面，通过tab参数区分
  const url = `/privacy-policy?tab=${type}`;
  window.open(url, "_blank");
};

defineExpose({
  openDialog,
  closeDialog,
});
</script>

<style scoped lang="scss">
.login-dialog {
  :deep(.el-dialog) {
    overflow: hidden;
    background-color: var(--bg-card, #fff);
    border-radius: 16px;
    box-shadow: var(--shadow-xl, 0 12px 32px rgb(0 0 0 / 10%));

    .el-dialog__header {
      padding: 20px 24px 0;
      margin: 0;
      text-align: center;
    }

    .el-dialog__headerbtn {
      top: 16px;
      right: 16px;
    }

    .el-dialog__body {
      padding: 24px;
    }

    .el-dialog__title {
      color: var(--text-primary, #333);
    }
  }
}

.login-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  .login-logo {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    animation: pulse 2s infinite ease-in-out;
  }

  .login-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.login-tabs {
  margin-bottom: 8px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__nav) {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  :deep(.el-tabs__item) {
    flex: 1;
    height: auto;
    padding: 6px 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    text-align: center;
    transition: all 0.3s ease;

    &.is-active,
    &:hover {
      color: var(--primary-color, #00baff);
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--primary-color, #00baff);
  }

  .tab-label {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;

    .el-icon {
      font-size: 18px;
    }
  }
}

.login-content {
  min-height: 240px;
  margin: 8px 0;

  .wechat-login {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    padding: 16px 0;

    .wechat-tips {
      margin-top: 16px;
      text-align: center;

      p {
        margin: 6px 0;
        font-size: 14px;
        color: var(--text-muted, #888);
      }
    }
  }
}

.login-footer {
  text-align: center;

  .agreement-text {
    margin: 4px 0;
    font-size: 13px;
    color: var(--text-muted, #888);

    a {
      color: var(--primary-color, #00baff);
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-hover, #09d);
        text-decoration: underline;
      }
    }
  }
}

// 淡入淡出动画效果
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

@media screen and (width <= 480px) {
  .login-dialog {
    :deep(.el-dialog) {
      width: 90% !important;
      max-width: 360px;
    }
  }

  .login-header {
    .login-logo {
      width: 50px;
      height: 50px;
    }

    .login-title {
      font-size: 18px;
    }
  }
}
</style>
