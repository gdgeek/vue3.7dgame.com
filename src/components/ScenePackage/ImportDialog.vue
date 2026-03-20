<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('ui.importScene')"
    width="480px"
    :close-on-click-modal="!importing"
    :close-on-press-escape="!importing"
    :show-close="!importing"
    @close="handleClose"
  >
    <!-- 文件选择状态 -->
    <div v-if="state === 'idle'" class="import-upload">
      <el-upload
        ref="uploadRef"
        drag
        accept=".zip"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
      >
        <el-icon class="upload-icon">
          <Upload></Upload>
        </el-icon>
        <div class="upload-text">{{ t("ui.dragOrSelectScenePackage") }}</div>
        <template #tip>
          <div class="upload-tip">{{ t("ui.onlyZipScenePackage") }}</div>
        </template>
      </el-upload>
    </div>

    <!-- 导入中状态（简化为 loading） -->
    <div v-else-if="state === 'importing'" class="import-loading">
      <el-icon class="is-loading loading-icon">
        <Loading></Loading>
      </el-icon>
      <p class="loading-text">{{ t("ui.importing") }}</p>
    </div>

    <!-- 导入成功状态 -->
    <div v-else-if="state === 'success'" class="import-result">
      <el-result
        icon="success"
        :title="t('ui.importSuccess')"
        :sub-title="t('ui.importSuccessSubtitle')"
      ></el-result>
    </div>

    <!-- 导入失败状态 -->
    <div v-else-if="state === 'error'" class="import-result">
      <el-result
        icon="error"
        :title="t('ui.importFailed')"
        :sub-title="importError"
      ></el-result>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <template v-if="state === 'idle'">
        <el-button @click="dialogVisible = false">{{
          t("common.cancel")
        }}</el-button>
      </template>

      <template v-else-if="state === 'success'">
        <el-button @click="dialogVisible = false">{{
          t("ui.close")
        }}</el-button>
        <el-button type="primary" @click="handleNavigate">{{
          t("ui.goToView")
        }}</el-button>
      </template>

      <template v-else-if="state === 'error'">
        <el-button @click="dialogVisible = false">{{
          t("ui.close")
        }}</el-button>
        <el-button type="primary" @click="handleRetry">
          {{ t("ui.reselectFile") }}
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Loading, Upload } from "@element-plus/icons-vue";

import { importScene } from "@/services/scene-package/import-service";

import type { UploadFile } from "element-plus";

// ============================================================================
// Props & Emits
// ============================================================================

const dialogVisible = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  success: [verseId: number];
}>();

// ============================================================================
// 状态
// ============================================================================

type ImportState = "idle" | "importing" | "success" | "error";

const { t } = useI18n();
const router = useRouter();

const state = ref<ImportState>("idle");
const importing = ref(false);
const importError = ref("");
const newVerseId = ref(0);

// ============================================================================
// 方法
// ============================================================================

const handleFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw;
  if (!file) return;

  // 验证文件类型
  if (!file.name.endsWith(".zip")) {
    ElMessage.error(t("ui.selectZipScenePackage"));
    return;
  }

  state.value = "importing";
  importing.value = true;
  importError.value = "";

  try {
    const result = await importScene(file);

    if (result.success) {
      newVerseId.value = result.verseId;
      state.value = "success";
      emit("success", result.verseId);
    } else {
      importError.value = result.error || t("ui.retryLater");
      state.value = "error";
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("ui.unknownError");
    importError.value = message;
    state.value = "error";
  } finally {
    importing.value = false;
  }
};

const handleNavigate = () => {
  dialogVisible.value = false;
  if (newVerseId.value) {
    router.push({ name: "verse-edit", params: { id: newVerseId.value } });
  }
};

const handleRetry = () => {
  state.value = "idle";
  importError.value = "";
};

const handleClose = () => {
  if (!importing.value) {
    resetState();
  }
};

const resetState = () => {
  state.value = "idle";
  importing.value = false;
  importError.value = "";
  newVerseId.value = 0;
};
</script>

<style scoped>
.import-upload {
  padding: 10px 0;
}

.upload-icon {
  margin-bottom: 8px;
  font-size: 48px;
  color: var(--el-text-color-placeholder);
}

.upload-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.upload-text em {
  font-style: normal;
  color: var(--el-color-primary);
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.import-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-icon {
  margin-bottom: 16px;
  font-size: 48px;
  color: var(--el-color-primary);
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.import-result {
  padding: 0;
}
</style>
