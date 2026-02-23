<template>
  <el-tooltip :content="t('ui.exportScene')" placement="top">
    <el-button
      type="success"
      :loading="exporting"
      :icon="Download"
      @click="handleExport"
    ></el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Download } from "@element-plus/icons-vue";

import { exportScene } from "@/services/scene-package/export-service";

const props = defineProps<{
  verseId: number;
}>();

const { t } = useI18n();

const exporting = ref(false);

const handleExport = async () => {
  exporting.value = true;
  try {
    await exportScene(props.verseId);
    ElMessage.success(t("ui.exportSuccess"));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("ui.unknownError");
    ElMessage.error(t("ui.exportFailed", { message }));
  } finally {
    exporting.value = false;
  }
};
</script>
