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
        <img src="/media/image/logo.gif" alt="Logo" class="login-logo" />
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
          注册或登录即表示您同意
          <a href="#" @click.prevent="openAgreement('terms')">服务条款</a>
          和
          <a href="#" @click.prevent="openAgreement('privacy')">隐私政策</a>
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import NamePassword from "./NamePassword.vue";
import RegisterForm from "./RegisterForm.vue";
import Wechat from "./Wechat.vue";
import { useSettingsStore } from "@/store/modules/settings";
import { useDomainStore } from "@/store/modules/domain";
import { ThemeEnum } from "@/enums/ThemeEnum";

const props = defineProps({
  title: {
    type: String,
    default: "用户登录/注册",
  },
});

const emit = defineEmits(["dialog-closed"]);
const settingsStore = useSettingsStore();
const domainStore = useDomainStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const dialogVisible = ref(false);
const activeTab = ref("account-register");
const isRegisterMode = ref(false);

// 切换账号登录和注册模式
const toggleRegisterMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
};

// 处理tab点击事件
const handleTabClick = () => {
  // 当点击微信登录tab时，重置注册模式
  if (activeTab.value === "wechat") {
    isRegisterMode.value = false;
  }
};

const openDialog = () => {
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
};

const handleLoginSuccess = () => {
  dialogVisible.value = false;
  ElMessage.success("登录成功！");
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
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);

    .el-dialog__header {
      margin: 0;
      padding: 20px 24px 0;
      text-align: center;
    }

    .el-dialog__headerbtn {
      top: 16px;
      right: 16px;
    }

    .el-dialog__body {
      padding: 24px;
    }
  }

  &.dark-theme {
    :deep(.el-dialog) {
      background-color: #202020;
      color: #f0f0f0;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);

      .el-dialog__header,
      .el-dialog__title {
        color: #f0f0f0;
      }
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
  align-items: center;
  gap: 12px;

  .login-logo {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    animation: pulse 2s infinite ease-in-out;
  }

  .login-title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0;

    .dark-theme & {
      color: #f0f0f0;
    }
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
    width: 100%;
    justify-content: center;
  }

  :deep(.el-tabs__item) {
    flex: 1;
    text-align: center;
    padding: 6px 0;
    font-size: 15px;
    font-weight: 500;
    color: #666;
    height: auto;
    transition: all 0.3s ease;

    &.is-active {
      color: #00a8ab;
    }

    &:hover {
      color: #00a8ab;
    }

    .dark-theme & {
      color: #aaa;

      &.is-active,
      &:hover {
        color: #00dbde;
      }
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: #00a8ab;

    .dark-theme & {
      background-color: #00dbde;
    }
  }

  .tab-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

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
    align-items: center;
    gap: 16px;
    padding: 16px 0;

    .wechat-tips {
      margin-top: 16px;
      text-align: center;

      p {
        margin: 6px 0;
        color: #888;
        font-size: 14px;

        .dark-theme & {
          color: #aaa;
        }
      }
    }
  }
}

.login-footer {
  text-align: center;

  .agreement-text {
    font-size: 13px;
    color: #888;
    margin: 4px 0;

    a {
      color: #00a8ab;
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: #008385;
        text-decoration: underline;
      }

      .dark-theme & {
        color: #00dbde;

        &:hover {
          color: #6cffff;
        }
      }
    }

    .dark-theme & {
      color: #aaa;
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

@media screen and (max-width: 480px) {
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
