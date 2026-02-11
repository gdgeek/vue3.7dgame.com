<template>
  <el-tooltip content="导出场景" placement="top">
    <el-button type="success" :loading="exporting" :icon="Download" @click="handleExport" />
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Download } from "@element-plus/icons-vue";

import { exportScene } from "@/services/scene-package/export-service";

const props = defineProps<{
  verseId: number;
}>();

const exporting = ref(false);

const handleExport = async () => {
  exporting.value = true;
  try {
    await exportScene(props.verseId);
    ElMessage.success("导出成功");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    ElMessage.error(`导出失败：${message}`);
  } finally {
    exporting.value = false;
  }
};
</script>
