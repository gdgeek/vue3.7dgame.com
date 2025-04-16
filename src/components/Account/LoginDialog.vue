<template>
  <el-dialog v-model="dialogVisible" :title="title" width="420px" destroy-on-close center @closed="handleDialogClosed"
    class="login-dialog" :class="{ 'dark-theme': isDark }">
    <div class="login-container">
      <!-- 顶部标题与图标 -->
      <div class="login-header">
        <img src="/media/image/logo.gif" alt="Logo" class="login-logo" />
        <h2 class="login-title">不加班AR编程平台</h2>
      </div>

      <!-- 登录表单 -->
      <div class="login-tabs">
        <div class="tab-item" :class="{ 'active': activeTab === 'account' }" @click="activeTab = 'account'">
          <el-icon>
            <UserFilled />
          </el-icon>
          <span>账号登录</span>
        </div>
        <div class="tab-item" :class="{ 'active': activeTab === 'wechat' }" @click="activeTab = 'wechat'">
          <el-icon>
            <ChatRound />
          </el-icon>
          <span>微信登录</span>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="login-content">
        <transition name="fade" mode="out-in">
          <div v-if="activeTab === 'account'" class="account-login">
            <NamePassword @login-success="handleLoginSuccess" />
          </div>
          <div v-else class="wechat-login">
            <Wechat />
            <div class="wechat-tips">
              <p>扫码后自动注册并登录</p>
              <p>便捷、安全的登录方式</p>
            </div>
          </div>
        </transition>
      </div>

      <!-- 底部协议 -->
      <div class="login-footer">
        <p class="agreement-text">
          登录即表示您同意
          <a href="#" @click.prevent="openAgreement('terms')">服务条款</a>
          和
          <a href="#" @click.prevent="openAgreement('privacy')">隐私政策</a>
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import NamePassword from './NamePassword.vue';
import Wechat from './Wechat.vue';
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";

const props = defineProps({
  title: {
    type: String,
    default: '用户登录'
  }
});

const emit = defineEmits(['dialog-closed']);
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const dialogVisible = ref(false);
const activeTab = ref('account');

const openDialog = () => {
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
};

const handleLoginSuccess = () => {
  dialogVisible.value = false;
  ElMessage.success('登录成功！');
};

const handleDialogClosed = () => {
  emit('dialog-closed');
  // 重置状态
  activeTab.value = 'account';
};

const openAgreement = (type: 'terms' | 'privacy') => {
  // 打开相应的协议页面，都指向隐私政策页面，通过tab参数区分
  const url = `/privacy-policy?tab=${type}`;
  window.open(url, '_blank');
};

defineExpose({
  openDialog,
  closeDialog
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
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 8px;

  .tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    font-size: 15px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;

    .el-icon {
      font-size: 18px;
    }

    &:hover {
      color: #00a8ab;
    }

    &.active {
      color: #00a8ab;
      border-bottom-color: #00a8ab;
    }

    .dark-theme & {
      color: #aaa;

      &:hover,
      &.active {
        color: #00dbde;
      }

      &.active {
        border-bottom-color: #00dbde;
      }
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