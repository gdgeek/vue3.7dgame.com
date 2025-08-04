<template>
  <div>
    <el-dialog v-model="dialogVisible" title="登陆码" width="50%" align-center>

      <div class="qrcode-container">
        <div :class="['qrcode-bg', { 'dark-theme': isDark }]">
          <qrcode-vue :value="value" :size="size" level="H"></qrcode-vue>
        </div>
        <p class="qrcode-tip">请使用手机扫描二维码登录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">

import Token from "@/store/modules/token";
import QrcodeVue from "qrcode.vue";
import { useSettingsStore } from '@/store/modules/settings';
import { ThemeEnum } from '@/enums/ThemeEnum';
const dialogVisible = ref(false);
const size = ref<number>(400); // 二维码尺寸，初始为400px

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);

const openDialog = () => {
  dialogVisible.value = true;
};
const value = computed(() => {
  const token = Token.getToken();
  return 'web_' + token.refreshToken;
});

// 优化二维码自适应缩放逻辑
const onResize = () => {
  // 取窗口宽高的40%，并限制最小180px，最大400px
  const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.4;
  size.value = Math.max(180, Math.min(400, Math.floor(maxSize)));
};

onMounted(() => {
  onResize(); // Initialize size
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

defineExpose({
  openDialog
});
</script>

<style scoped>
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  /* 防止二维码溢出对话框 */
  max-width: 100%;
  max-height: 60vh;
  box-sizing: border-box;
}

.qrcode-bg {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-tip {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
}

/* 深色模式下二维码背景依然为白色，保证扫码识别 */
:deep(.dark-theme) .qrcode-bg {
  background: #fff !important;
}

:deep(.dark-theme) .qrcode-tip {
  color: #a6a9ad;
}
</style>
