<template>
  <div>
    <el-dialog v-model="dialogVisible" title="登陆码" width="50%" align-center>

      <div class="qrcode-container">
        <qrcode-vue :value="value" :size="size" level="H"></qrcode-vue>
        <p class="qrcode-tip">请使用手机扫描二维码登录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">

import Token from "@/store/modules/token";
import QrcodeVue from "qrcode.vue";
const dialogVisible = ref(false);
const size = ref<number>(400);

const openDialog = () => {
  dialogVisible.value = true;
};
const value = computed(() => {
  const token = Token.getToken();
  return 'web_' + token.refreshToken;
});

const onResize = () => {
  size.value = window.innerWidth * 0.45;
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
}

.qrcode-tip {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
}

/* 为深色模式添加的样式 */
:deep(.dark-theme) .qrcode-tip {
  color: #a6a9ad;
}
</style>
