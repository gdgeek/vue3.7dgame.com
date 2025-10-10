<template>
  <div>
    <el-dialog v-model="dialogVisible" title="登陆码" width="50%" align-center>

      <div class="qrcode-container">
       
        <div v-loading="code === ''" :class="['qrcode-bg', { 'dark-theme': isDark }]">
          <qrcode-vue v-if="code !== ''" :value="code" :size="size" level="H"></qrcode-vue>
        </div>
        <p class="qrcode-tip">请使用手机扫描二维码登录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Token from "@/store/modules/token";
import QrcodeVue from "qrcode.vue";
import { useSettingsStore } from '@/store/modules/settings';
import { ThemeEnum } from '@/enums/ThemeEnum';
import { getUserLinked } from '@/api/v1/tools';
const dialogVisible = ref(false);
const size = ref<number>(400);
const code = ref<string>("");

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);

const openDialog = () => {
  dialogVisible.value = true;
}

// 防抖优化 resize 事件
let resizeTimer: NodeJS.Timeout | null = null;
const onResize = () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  
  resizeTimer = setTimeout(() => {
    try {
      const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.4;
      size.value = Math.max(180, Math.min(400, Math.floor(maxSize)));
    } catch (error) {
      console.warn('Failed to calculate QR code size:', error);
      size.value = 300; // 默认尺寸
    }
  }, 100);
};

onMounted(async () => {
  try {
    onResize();
    window.addEventListener("resize", onResize);
    const userLinked = await getUserLinked();
    if (userLinked?.data.key) {
      code.value = 'web_' + userLinked.data.key;
    } else {
      console.error('No refresh token available');
      code.value = ''; // 保持 loading 状态
    }
  } catch (error) {
    console.error('Failed to initialize QR code:', error);
    code.value = '';
  }
});

onUnmounted(() => {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
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
