<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="600px"
    class="standard-upload-dialog"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @closed="handleDialogClose"
  >
    <div
      class="upload-area"
      :class="{ 'is-dragover': isDragOver, 'is-disabled': isDisabled }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerFileSelect"
    >
      <div class="upload-content">
        <div class="cloud-icon">
          <span class="material-symbols-outlined">cloud_upload</span>
        </div>
        <div class="upload-text">
          <h3>拖拽文件到此处，或点击浏览</h3>
          <p>支持多个文件同时上传</p>
        </div>
        <el-button
          type="primary"
          class="browse-btn"
          :loading="isDisabled"
          @click.stop="triggerFileSelect"
        >
          浏览文件
        </el-button>
      </div>

      <!-- Upload Progress Overlay -->
      <div v-if="isDisabled" class="upload-progress-overlay" @click.stop>
        <div class="progress-content">
          <el-progress
            type="circle"
            :percentage="unifiedProgress"
            :status="uploadStatus"
          ></el-progress>
          <p class="progress-text">{{ currentStageText }}</p>
          <p class="file-count" v-if="totalFilesCount > 1">
            {{ uploadedCount }} / {{ totalFilesCount }}
          </p>
        </div>
      </div>
    </div>

    <div class="upload-footer">
      <div class="footer-row header">
        <div class="footer-col">支持格式</div>
        <div class="footer-col">单个文件大小</div>
      </div>
      <div class="footer-row body">
        <div class="footer-col">{{ supportedFormats }}</div>
        <div class="footer-col">最大 {{ maxSize }}MB</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Message } from "@/components/Dialog";
import { useFileStore } from "@/store/modules/config";
import { UploadFileType } from "@/api/user/model";
import { postFile } from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";
import { processModel } from "@/utils/modelProcessor";

const { t } = useI18n();
const fileStore = useFileStore();

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    fileType: string; // e.g., "audio/mp3, audio/wav" or ".glb, .gltf"
    dir: string;
    maxSize?: number; // MB
    multiple?: boolean;
    showEffectTypeSelect?: boolean;
  }>(),
  {
    title: "上传资源",
    fileType: "*",
    dir: "",
    maxSize: 0,
    multiple: true,
    showEffectTypeSelect: false,
  }
);

const emit = defineEmits(["update:modelValue", "saveResource", "success"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isDragOver = ref(false);
const isDisabled = ref(false);
const selectedFiles = ref<File[]>([]);
const uploadedCount = ref(0);
const totalFilesCount = ref(0);
const uploadedIds = ref<number[]>([]);

// Progress tracking
const currentStage = ref(0); // 0: Idle, 1: Hashing, 2: Uploading, 3: Saving
const stageProgress = ref([0, 0, 0]);

const unifiedProgress = computed(() => {
  if (currentStage.value === 0) return 0;
  // Simple weighted progress: Stage 1 (MD5) 20%, Stage 2 (Upload) 60%, Stage 3 (Save) 20%
  const p1 = stageProgress.value[0] * 0.2;
  const p2 = stageProgress.value[1] * 0.6;
  const p3 = stageProgress.value[2] * 0.2;
  return Math.round(p1 + p2 + p3);
});

const uploadStatus = computed(() => {
  return unifiedProgress.value >= 100 ? "success" : "";
});

const currentStageText = computed(() => {
  if (currentStage.value === 1) return "正在校验文件...";
  if (currentStage.value === 2) return "正在上传文件...";
  if (currentStage.value === 3) return "正在保存资源...";
  return "准备中...";
});

const supportedFormats = computed(() => {
  // Convert mime types or extensions to readable format
  // e.g., "audio/mp3, audio/wav" -> "MP3, WAV"
  // ".glb, .gltf" -> "GLB, GLTF"
  return props.fileType
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      if (s.startsWith(".")) return s.substring(1).toUpperCase();
      if (s.includes("/")) return s.split("/")[1].toUpperCase();
      return s.toUpperCase();
    })
    .join(", ");
});

// Drag & Drop Handlers
const onDragOver = (e: DragEvent) => {
  isDragOver.value = true;
};

const onDragLeave = (e: DragEvent) => {
  isDragOver.value = false;
};

const onDrop = (e: DragEvent) => {
  isDragOver.value = false;
  if (isDisabled.value) return;

  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length > 0) {
    // Filter by type if possible (simple check)
    // Note: Proper type checking is complex with drag-drop,
    // we'll rely on processFiles to validate.
    processFiles(files);
  }
};

const triggerFileSelect = async () => {
  if (isDisabled.value) return;
  try {
    const files = await fileStore.store.fileOpen(
      props.fileType,
      props.multiple
    );
    if (files.length > 0) {
      processFiles(files);
    }
  } catch (err) {
    console.error("File selection failed:", err);
  }
};

const processFiles = async (files: File[]) => {
  // 1. Validate Size
  if (props.maxSize > 0) {
    const maxBytes = props.maxSize * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxBytes);
    if (oversized.length > 0) {
      const names = oversized.map((f) => f.name).join(", ");
      Message.error(
        `${t("upload.fileTooLarge", { size: props.maxSize })}: ${names}`
      );
      files = files.filter((f) => f.size <= maxBytes);
    }
  }

  if (files.length === 0) return;

  selectedFiles.value = files;
  isDisabled.value = true;
  uploadedCount.value = 0;
  totalFilesCount.value = files.length;
  uploadedIds.value = [];

  // Reset progress
  currentStage.value = 1;
  stageProgress.value = [0, 0, 0];

  for (const file of files) {
    await uploadSingleFile(file);
  }
};

const uploadSingleFile = async (file: File) => {
  try {
    // Stage 1: MD5
    currentStage.value = 1;
    const md5 = await fileStore.store.fileMD5(file, (p: number) => {
      stageProgress.value[0] = Math.round(p * 100);
    });
    stageProgress.value[0] = 100;

    const handler = await fileStore.store.publicHandler();
    let extension = ".bytes";
    // Helper to get extension
    const nameExt = file.name.substring(file.name.lastIndexOf("."));
    if (nameExt) extension = nameExt;

    // Check if exists
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      props.dir
    );

    // Stage 2: Upload
    currentStage.value = 2;
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        file,
        (p: number) => {
          stageProgress.value[1] = Math.round(p * 100);
        },
        handler,
        props.dir
      );
    }
    stageProgress.value[1] = 100;

    // Handle Metadata (Image/Video/Audio/Model)
    let info: string | undefined;
    let image_id: number | undefined;

    // Image
    if (props.dir === "picture" && file.type.startsWith("image/")) {
      const size = await getImageSize(file);
      if (size.x > 0 && size.y > 0) {
        info = JSON.stringify({ size });
      }
    }
    // Video
    else if (props.dir === "video" && file.type.startsWith("video/")) {
      const videoInfo = await getVideoInfo(file);
      if (videoInfo.size.x > 0) {
        info = JSON.stringify(videoInfo);
      }
    }
    // Audio
    else if (props.dir === "audio" && file.type.startsWith("audio/")) {
      const audioInfo = await getAudioInfo(file);
      if (audioInfo.length > 0) {
        const size = { x: 800, y: 800 };
        info = JSON.stringify({ size, length: audioInfo.length });
      }
    }
    // Polygen (Model)
    else if (
      props.dir === "polygen" &&
      file.name.toLowerCase().endsWith(".glb")
    ) {
      try {
        const processed = await processModel(file);
        info = processed.info;

        // Upload screenshot
        const imageFile = processed.image;
        const imageMd5 = await fileStore.store.fileMD5(imageFile);
        const imageExtension = ".jpg";
        const imageHas = await fileStore.store.fileHas(
          imageMd5,
          imageExtension,
          handler,
          "screenshot/polygen"
        );

        if (!imageHas) {
          await fileStore.store.fileUpload(
            imageMd5,
            imageExtension,
            imageFile,
            () => {},
            handler,
            "screenshot/polygen"
          );
        }

        // Register Screenshot File
        const imageData: UploadFileType = {
          filename: imageFile.name,
          md5: imageMd5,
          key: imageMd5 + imageExtension,
          url: fileStore.store.fileUrl(
            imageMd5,
            imageExtension,
            handler,
            "screenshot/polygen"
          ),
        };
        const imageResponse = await postFile(imageData);
        image_id = imageResponse.data.id;
      } catch (e) {
        console.error("Model processing failed", e);
      }
    }

    // Stage 3: Save Resource
    currentStage.value = 3;
    stageProgress.value[2] = 20;

    await saveFileRecord(md5, extension, file, handler, info, image_id);

    stageProgress.value[2] = 100;
  } catch (err) {
    console.error(`Error uploading ${file.name}`, err);
    Message.error(`Upload failed: ${file.name}`);
  } finally {
    if (uploadedCount.value === totalFilesCount.value) {
      setTimeout(() => {
        isDisabled.value = false;
        // Optionally auto-close or just enable buttons
      }, 500);
    }
  }
};

const saveFileRecord = async (
  md5: string,
  extension: string,
  file: File,
  handler: FileHandler,
  info?: string,
  image_id?: number
) => {
  const data: UploadFileType = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, props.dir),
    // particleType logic if needed, but rarely used now
  };

  try {
    const response = await postFile(data);

    // Now trigger the parent's save logic (postAudio, postVideo, etc.)
    emit(
      "saveResource",
      data.filename,
      response.data.id,
      totalFilesCount.value,
      (id: number) => {
        uploadedCount.value++;
        uploadedIds.value.push(id);
        if (uploadedCount.value === totalFilesCount.value) {
          emit("success", uploadedIds.value);
        }
      },
      undefined, // effectType
      info,
      image_id
    );
  } catch (err) {
    console.error(err);
  }
};

// Utils (Copied from MrPPUploadDialog)
const getImageSize = (file: File): Promise<{ x: number; y: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ x: img.width, y: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ x: 0, y: 0 });
      URL.revokeObjectURL(img.src);
    };
  });
};

const getVideoInfo = (
  file: File
): Promise<{ size: { x: number; y: number }; length: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        size: { x: video.videoWidth, y: video.videoHeight },
        length: video.duration,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ size: { x: 0, y: 0 }, length: 0 });
    };
  });
};

const getAudioInfo = (file: File): Promise<{ length: number }> => {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve({ length: audio.duration });
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve({ length: 0 });
    };
  });
};

const handleDialogClose = () => {
  isDisabled.value = false;
  selectedFiles.value = [];
  uploadedCount.value = 0;
  totalFilesCount.value = 0;
  uploadedIds.value = [];
  currentStage.value = 0;
  stageProgress.value = [0, 0, 0];
};
</script>

<style scoped lang="scss">
// Overlay and Content styles are mostly using variables already.
// Double check for hardcoded fallbacks or specific colors.

.upload-area {
  position: relative;
  width: 100%;
  height: 320px;
  border: 2px dashed var(--border-color, #e2e8f0);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-card, #fff);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;

  &:hover,
  &.is-dragover {
    border-color: var(--primary-color, #0ea5e9);
    background-color: var(--primary-light, #f0f9ff);
  }

  &.is-disabled {
    cursor: not-allowed;
    border-color: var(--border-color, #e2e8f0);
    background-color: var(--bg-secondary, #f8fafc);
  }
}

.upload-content {
  text-align: center;
  z-index: 1;
}

.cloud-icon {
  width: 80px;
  height: 80px;
  background-color: var(
    --info-light,
    #e0f2fe
  ); // Ensure info-light is defined or fallback
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;

  .material-symbols-outlined {
    font-size: 40px;
    color: var(--primary-color, #0ea5e9);
  }
}

.upload-text {
  margin-bottom: 24px;

  h3 {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-muted, #94a3b8);
    margin: 0;
  }
}

.browse-btn {
  padding: 12px 32px;
  font-size: 14px;
  border-radius: 20px;
  height: auto;
}

.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  opacity: 0.95;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .progress-content {
    text-align: center;
  }

  .progress-text {
    margin-top: 16px;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
  }

  .file-count {
    margin-top: 8px;
    font-size: 14px;
    color: var(--text-secondary, #64748b);
  }
}

.upload-footer {
  margin-top: 24px;
  border: var(--border-width, 1px) solid var(--border-color, #ebeef5);
  border-radius: 12px;
  overflow: hidden;
}

.footer-row {
  display: flex;
  align-items: center;

  &.header {
    background-color: var(--bg-secondary, #f5f7fa);
    color: var(--text-muted, #909399);
    font-size: 13px;
    padding: 12px 0;
  }

  &.body {
    background-color: var(--bg-card, #fff);
    color: var(--text-primary, #303133);
    font-size: 14px;
    font-weight: 600;
    padding: 16px 0;
  }
}

.footer-col {
  flex: 1;
  text-align: center;
}

// Override Dialog styles
:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #f1f5f9);
}

:deep(.el-dialog__title) {
  font-weight: 500;
  font-size: 18px;
  color: var(--text-primary);
}

:deep(.el-dialog__body) {
  padding: 24px;
  background-color: var(--bg-card);
}

:deep(.el-dialog) {
  background-color: var(--bg-card);
}
</style>
