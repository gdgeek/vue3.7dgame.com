<template>
  <div class="export-button-wrapper">
    <el-button type="primary" :loading="exporting" @click="handleExport">
      <el-icon v-if="!exporting">
        <Download />
      </el-icon>
      导出场景
    </el-button>
  </div>
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
