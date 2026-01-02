<template>
  <div class="qrcode-container">
    <!-- 用于显示二维码的 canvas 元素 -->
    <canvas ref="qrcodeCanvas" class="qrcode-canvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import QRCode from "qrcode";

// 定义 props
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  options: {
    type: Object,
    default: () => ({
      width: 400,
      margin: 4,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }),
  },
});

// 引用 canvas 元素
const qrcodeCanvas = ref(null);

const generateQRCode = async (text) => {
  if (!qrcodeCanvas.value) return;

  try {
    // 合并默认选项和传入的自定义选项
    const qrOptions = {
      width: props.options.width || 400,
      margin:
        typeof props.options.margin !== "undefined" ? props.options.margin : 4,
      color: {
        dark: props.options.color?.dark || "#000000",
        light: props.options.color?.light || "#ffffff",
      },
    };

    await QRCode.toCanvas(qrcodeCanvas.value, text, qrOptions);
  } catch (error) {
    console.error("生成二维码时出错:", error);
  }
};

onMounted(() => {
  generateQRCode(props.text);
});

// 监听 props.text 和 options 的变化
watch(
  [() => props.text, () => props.options],
  () => {
    generateQRCode(props.text);
  },
  { deep: true }
);
</script>

<script>
export default {
  name: "Qrcode",
};
</script>

<!-- 添加默认导出以解决导入问题 -->
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
