<template>
  <el-dialog
    append-to-body
    v-model="dialogVisible"
    width="80%"
    :close-on-click-modal="false"
  >
    <template #header>
      {{ dialogTitle }}
    </template>
    <el-card class="box-card" style="text-align: center">
      <div
        v-if="verseId !== -1"
        style="margin-bottom: 20px; font-size: 20px; font-weight: 700"
      >
        {{ encode(verseId) }}
      </div>
      <qrcode-vue :value="encode(verseId)" :size="size" level="H"></qrcode-vue>
    </el-card>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import QrcodeVue from "qrcode.vue";
import { getVerse } from "@/api/v1/verse";

const dialogVisible = ref(false);
const value = ref("https://mrpp.com");
const size = ref(400);
const verse = ref<{ id: number; name: string } | null>(null);

const verseId = computed(() => verse.value?.id ?? -1);
const dialogTitle = computed(() =>
  verse.value
    ? `请用设备扫描二维码，进入【${verse.value.name}】。`
    : "请用设备扫描二维码，进入场景。"
);

const encode = (number: number): string => {
  if (number !== -1) {
    return reverseBits(number)
      .toString()
      .padStart(6, "0")
      .split("")
      .reverse()
      .join("");
  }
  return "";
};

const reverseBits = (n: number): number => {
  let result = 0;
  for (let i = 0; i < 18; i++) {
    result <<= 1; // Shift result left by 1 to make space for the next bit
    result |= n & 1; // Add the least significant bit of n to result
    n >>= 1; // Shift n right by 1 to process the next bit
  }
  return result >>> 0; // Convert the result to an unsigned integer
};

const onresize = () => {
  size.value = Math.min(500, window.innerWidth * 0.8 - 80);
};

const open = async (id: number) => {
  const data = { projectId: id, veri: "MrPP.com" };
  value.value = JSON.stringify(data);
  dialogVisible.value = true;
  const r = await getVerse(id);
  verse.value = r.data;
};

// Lifecycle hooks
onMounted(() => {
  onresize();
  window.addEventListener("resize", onresize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onresize);
});

defineExpose({
  open,
});
</script>
