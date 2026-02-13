<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入场景"
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
        <div class="upload-text">将场景包拖到此处，或<em>点击选择文件</em></div>
        <template #tip>
          <div class="upload-tip">仅支持 .zip 格式的场景包文件</div>
        </template>
      </el-upload>
    </div>

    <!-- 导入中状态（简化为 loading） -->
    <div v-else-if="state === 'importing'" class="import-loading">
      <el-icon class="is-loading loading-icon">
        <Loading></Loading>
      </el-icon>
      <p class="loading-text">导入中...</p>
    </div>

    <!-- 导入成功状态 -->
    <div v-else-if="state === 'success'" class="import-result">
      <el-result
        icon="success"
        title="导入成功"
        sub-title="场景已成功导入，可以前往查看"
      ></el-result>
    </div>

    <!-- 导入失败状态 -->
    <div v-else-if="state === 'error'" class="import-result">
      <el-result
        icon="error"
        title="导入失败"
        :sub-title="importError"
      ></el-result>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <template v-if="state === 'idle'">
        <el-button @click="dialogVisible = false">取消</el-button>
      </template>

      <template v-else-if="state === 'success'">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleNavigate"> 前往查看 </el-button>
      </template>

      <template v-else-if="state === 'error'">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleRetry">
          重新选择文件
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
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
    ElMessage.error("请选择 .zip 格式的场景包文件");
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
      importError.value = result.error || "导入失败，请重试";
      state.value = "error";
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
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
  font-size: 48px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.upload-text em {
  color: var(--el-color-primary);
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 8px;
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
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
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
