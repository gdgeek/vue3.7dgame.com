<template>
  <div class="qrcode-container">
    <!-- 用于显示二维码的 canvas 元素 -->
    <canvas ref="qrcodeCanvas" class="qrcode-canvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref, defineProps, watch } from 'vue';
import QRCode from 'qrcode';

// 定义 props
const props = defineProps({
  text: {
    type: String,
    required: true
  }
});

// 引用 canvas 元素
const qrcodeCanvas = ref(null);

const generateQRCode = async (text) => {
  try {
    await QRCode.toCanvas(qrcodeCanvas.value, text, { width: 400 });
  } catch (error) {
    console.error('生成二维码时出错:', error);
  }
};

onMounted(() => {
  generateQRCode(props.text);
});

// 监听 props.text 的变化
watch(() => props.text, (newText) => {
  generateQRCode(newText);
});
</script>

<style scoped>
.qrcode-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.qrcode-canvas {
  width: 100%;
  aspect-ratio: 1 / 1;
  height: auto;
}
</style>