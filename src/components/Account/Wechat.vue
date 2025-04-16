<template>
  <div class="wechat-container" :class="{ 'dark-theme': isDark }">
    <el-button class="wechat-login-button" @click="login">
      <el-icon class="wechat-icon">
        <ChatRound />
      </el-icon>
      <span>微信扫码登录</span>
    </el-button>

    <el-dialog v-model="dialogVisible" title="微信扫码登录" width="340px" class="qrcode-dialog"
      :class="{ 'dark-theme': isDark }" :show-close="true" align-center @close="close">
      <div class="qrcode-container">
        <div class="qrcode-wrapper">
          <div class="qrcode-box">
            <Qrcode :text="url" :options="qrOptions" />
          </div>
          <div class="qrcode-logo">
            <img src="/media/image/logo.gif" alt="Logo" />
          </div>
        </div>

        <div class="qrcode-tips">
          <p class="main-tip">打开微信，扫一扫登录</p>
          <p class="sub-tip">扫码后自动注册并登录</p>
        </div>

        <div class="loading-status" v-if="isScanning">
          <el-progress type="circle" :percentage="scanProgress" :width="36" :stroke-width="4" />
          <span class="scanning-text">扫码中，请稍候...</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "@/store";
import Qrcode from "./Qrcode.vue";
import { getQrcode, refresh } from "@/api/auth/wechat";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useRouter, LocationQuery, useRoute } from "vue-router";

const url = ref("");
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const dialogVisible = ref(false);
const isScanning = ref(false);
const scanProgress = ref(0);
let intervalId: NodeJS.Timeout | string | number | undefined = undefined;
let progressInterval: NodeJS.Timeout | undefined = undefined;

// 二维码配置
const qrOptions = computed(() => ({
  width: 200,
  margin: 2,
  color: {
    dark: isDark.value ? '#ffffff' : '#000000',
    light: '#ffffff00'  // 透明背景
  }
}));

const parseRedirect = (): {
  path: string;
  queryParams: Record<string, string>;
} => {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/";
  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
};

const close = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }

  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = undefined;
  }

  dialogVisible.value = false;
  isScanning.value = false;
  scanProgress.value = 0;
};

const fetchRefresh = async () => {
  try {
    const response = await refresh(token);
    if (response.data.success) {
      // 设置为扫描状态
      isScanning.value = true;
      // 加速进度条
      scanProgress.value = Math.min(scanProgress.value + 20, 90);

      close();
      if (response.data.message === 'signup') {
        router.push({ path: '/site/register', query: { token: response.data.token } });
      } else if (response.data.message === 'signin') {
        await userStore.loginByWechat({ token: response.data.token });
        await userStore.getUserInfo();

        const { path, queryParams } = parseRedirect();
        router.push({ path: path, query: queryParams });
      }
    }
  } catch (error) {
    console.error('微信登录刷新错误:', error);
  }
};

let token: string | null = null;

const login = async function () {
  try {
    const ret = await getQrcode();
    url.value = ret.data.qrcode.url;
    token = ret.data.token;
    dialogVisible.value = true;

    // 重置状态并启动轮询
    isScanning.value = false;
    scanProgress.value = 0;

    // 启动进度条动画
    progressInterval = setInterval(() => {
      if (scanProgress.value < 85) {
        scanProgress.value += 1;
      }
    }, 1000);

    // 启动轮询检查登录状态
    intervalId = setInterval(fetchRefresh, 3000);
  } catch (error) {
    console.error('获取微信二维码失败:', error);
    ElMessage.error('获取微信二维码失败，请稍后再试');
  }
};
</script>

<style scoped lang="scss">
.wechat-container {
  width: 100%;
}

.wechat-login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 42px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background-color: #07c160;
  border: none;
  color: white;
  transition: all 0.3s ease;

  .wechat-icon {
    font-size: 20px;
    margin-right: 8px;
  }

  &:hover {
    background-color: #06ad56;
    transform: translateY(-1px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
}

.qrcode-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;

    .el-dialog__header {
      padding: 16px;
      margin: 0;
      text-align: center;
      border-bottom: 1px solid #f0f0f0;
    }

    .el-dialog__body {
      padding: 24px;
    }

    .el-dialog__headerbtn {
      top: 16px;
      right: 16px;
    }
  }

  &.dark-theme {
    :deep(.el-dialog) {
      background-color: #202020;

      .el-dialog__header {
        border-bottom: 1px solid #333;
      }

      .el-dialog__title,
      .el-dialog__close {
        color: #eee;
      }
    }
  }
}

.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qrcode-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  background-color: white;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .qrcode-box {
    width: 100%;
    height: 100%;
  }

  .qrcode-logo {
    position: absolute;
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
  }

  .dark-theme & {
    background-color: #333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.qrcode-tips {
  text-align: center;

  .main-tip {
    font-size: 15px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;

    .dark-theme & {
      color: #eee;
    }
  }

  .sub-tip {
    font-size: 13px;
    color: #999;

    .dark-theme & {
      color: #aaa;
    }
  }
}

.loading-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;

  .scanning-text {
    font-size: 14px;
    color: #666;

    .dark-theme & {
      color: #bbb;
    }
  }
}
</style>
