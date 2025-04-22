<template>
  <div>
    <div>
      <aside style="margin-top: 15px"></aside>
      你好，可以启动iPad 连接工具扫码连接此系统。
      <br />
      <br />
      <el-card>
        <template #header>
          <b id="title">
            <font-awesome-icon icon="qrcode"></font-awesome-icon>
            程序扫码，连接服务器 [{{ ip }}]
          </b>
        </template>
        <qrcode-vue :value="value" :size="size" level="H"></qrcode-vue>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import QrcodeVue from "qrcode.vue";
import environment from "@/environment";

const value = ref<string>(
  JSON.stringify({ veri: "bujiaban.com", api: environment.api })
);
const size = ref<number>(400);

const ip = computed(() => environment.ip);

// Define onResize function at the top level
const onResize = () => {
  size.value = window.innerWidth * 0.5 - 100;
};

onMounted(() => {
  onResize(); // Initialize size
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>
