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
          <font-awesome-icon
            :icon="['fas', 'cloud-arrow-up']"
          ></font-awesome-icon>
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

    <div v-if="compatibilityNotes.length" class="compatibility-notes">
      <div class="compatibility-title">
        <font-awesome-icon :icon="['fas', 'circle-info']"></font-awesome-icon>
        {{ compatibilityTitle }}
      </div>
      <ul>
        <li v-for="note in compatibilityNotes" :key="note">{{ note }}</li>
      </ul>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
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
    displayFormats?: string;
    dir: string;
    maxSize?: number; // MB
    multiple?: boolean;
    showEffectTypeSelect?: boolean;
    compatibilityTitle?: string;
    compatibilityNotes?: string[];
  }>(),
  {
    title: "上传资源",
    fileType: "*",
    displayFormats: "",
    dir: "",
    maxSize: 0,
    multiple: true,
    showEffectTypeSelect: false,
    compatibilityTitle: "兼容说明",
    compatibilityNotes: () => [],
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
const rejectedModelFiles = ref<{ name: string; reasons: string[] }[]>([]);
const uploadedModelFiles = ref<string[]>([]);
const modelSummaryShown = ref(false);

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
  if (props.displayFormats && props.displayFormats.trim() !== "") {
    return props.displayFormats;
  }
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

type GlbJsonChunk = {
  images?: Array<{
    mimeType?: string;
    uri?: string;
  }>;
};

const getUriTextureMimeType = (uri: string): string | null => {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.startsWith("data:")) {
    const match = normalizedUri.match(/^data:([^;,]+)/);
    return match?.[1] ?? null;
  }
  const pathWithoutQuery = normalizedUri.split(/[?#]/)[0];
  if (pathWithoutQuery.endsWith(".png")) return "image/png";
  if (pathWithoutQuery.endsWith(".jpg") || pathWithoutQuery.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (pathWithoutQuery.endsWith(".ktx")) return "image/ktx";
  if (pathWithoutQuery.endsWith(".ktx2")) return "image/ktx2";
  if (pathWithoutQuery.endsWith(".webp")) return "image/webp";
  return null;
};

const parseGlbJson = async (file: File): Promise<GlbJsonChunk> => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const decoder = new TextDecoder();

  if (buffer.byteLength < 20 || decoder.decode(buffer.slice(0, 4)) !== "glTF") {
    throw new Error(t("upload.invalidGlb"));
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new Error(t("upload.unsupportedGlbVersion", { version }));
  }

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = decoder.decode(buffer.slice(offset + 4, offset + 8));
    offset += 8;

    if (offset + chunkLength > buffer.byteLength) break;

    if (chunkType === "JSON") {
      const jsonText = decoder.decode(
        buffer.slice(offset, offset + chunkLength)
      );
      return JSON.parse(jsonText.trim()) as GlbJsonChunk;
    }

    offset += chunkLength;
  }

  throw new Error(t("upload.missingGlbJson"));
};

const getUnsupportedModelReasons = async (file: File): Promise<string[]> => {
  if (props.dir !== "polygen" || !file.name.toLowerCase().endsWith(".glb")) {
    return [];
  }

  let gltf: GlbJsonChunk;
  try {
    gltf = await parseGlbJson(file);
  } catch {
    return [];
  }

  const hasWebPTexture = (gltf.images ?? []).some((image) => {
    const mimeType = (
      image.mimeType ||
      (image.uri ? getUriTextureMimeType(image.uri) : "") ||
      ""
    ).toLowerCase();

    return mimeType === "image/webp";
  });

  if (hasWebPTexture) {
    return [t("upload.unsupportedTextureFormats", { formats: "WebP" })];
  }

  return [];
};

const filterUnsupportedModelFiles = async (files: File[]): Promise<File[]> => {
  const checkedFiles: File[] = [];

  for (const file of files) {
    const reasons = await getUnsupportedModelReasons(file);
    if (reasons.length > 0) {
      rejectedModelFiles.value.push({ name: file.name, reasons });
      continue;
    }
    checkedFiles.push(file);
  }

  return checkedFiles;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderModelUploadList = (items: string[], emptyText: string): string => {
  if (items.length === 0) {
    return `<div class="model-upload-summary-empty">${escapeHtml(emptyText)}</div>`;
  }

  return `<ul>${items
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join("")}</ul>`;
};

const renderRejectedModelUploadList = (
  items: { name: string; reasons: string[] }[],
  emptyText: string
): string => {
  if (items.length === 0) {
    return `<div class="model-upload-summary-empty">${escapeHtml(emptyText)}</div>`;
  }

  return `<ul>${items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong><div>${escapeHtml(
          item.reasons.join("；")
        )}</div></li>`
    )
    .join("")}</ul>`;
};

const showModelUploadSummary = async (): Promise<void> => {
  if (
    props.dir !== "polygen" ||
    modelSummaryShown.value ||
    rejectedModelFiles.value.length === 0
  ) {
    return;
  }

  modelSummaryShown.value = true;

  const html = `
    <div class="model-upload-summary">
      <section>
        <h4>${escapeHtml(t("upload.uploadedModels"))}</h4>
        ${renderModelUploadList(
          uploadedModelFiles.value,
          t("upload.noUploadedModels")
        )}
      </section>
      <section>
        <h4>${escapeHtml(t("upload.rejectedModels"))}</h4>
        ${renderRejectedModelUploadList(
          rejectedModelFiles.value,
          t("upload.noRejectedModels")
        )}
      </section>
    </div>
    <style>
      .model-upload-summary { display: grid; gap: 14px; text-align: left; }
      .model-upload-summary h4 { margin: 0 0 8px; font-size: 14px; color: #1e293b; }
      .model-upload-summary ul { margin: 0; padding-left: 18px; }
      .model-upload-summary li { margin: 6px 0; line-height: 1.45; }
      .model-upload-summary li div { margin-top: 2px; color: #ef4444; font-size: 13px; }
      .model-upload-summary-empty { color: #94a3b8; font-size: 13px; }
    </style>
  `;

  try {
    await ElMessageBox.alert(html, t("upload.modelUploadSummaryTitle"), {
      confirmButtonText: t("common.confirm"),
      dangerouslyUseHTMLString: true,
      customClass: "model-upload-summary-dialog",
    });
  } catch {
    // Alert may reject if closed; no follow-up needed.
  }
};

const finishUploadFile = (file: File, id: number): void => {
  uploadedCount.value++;
  uploadedIds.value.push(id);

  if (props.dir === "polygen") {
    if (id > 0) {
      uploadedModelFiles.value.push(file.name);
    } else {
      rejectedModelFiles.value.push({
        name: file.name,
        reasons: [t("upload.saveResourceFailed")],
      });
    }
  }

  if (uploadedCount.value === totalFilesCount.value) {
    void showModelUploadSummary();
    emit("success", uploadedIds.value);
  }
};

// Drag & Drop Handlers
const onDragOver = (_e: DragEvent) => {
  isDragOver.value = true;
};

const onDragLeave = (_e: DragEvent) => {
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
    logger.error("File selection failed:", err);
  }
};

const processFiles = async (files: File[]) => {
  if (props.dir === "polygen") {
    rejectedModelFiles.value = [];
    uploadedModelFiles.value = [];
    modelSummaryShown.value = false;
  }

  // 1. Validate Size
  if (props.maxSize > 0) {
    const maxBytes = props.maxSize * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxBytes);
    if (oversized.length > 0) {
      const names = oversized.map((f) => f.name).join(", ");
      if (props.dir === "polygen") {
        oversized.forEach((file) => {
          rejectedModelFiles.value.push({
            name: file.name,
            reasons: [t("upload.fileTooLarge", { size: props.maxSize })],
          });
        });
      } else {
        Message.error(
          `${t("upload.fileTooLarge", { size: props.maxSize })}: ${names}`
        );
      }
      files = files.filter((f) => f.size <= maxBytes);
    }
  }

  files = await filterUnsupportedModelFiles(files);

  if (files.length === 0) {
    await showModelUploadSummary();
    return;
  }

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
        const imageExtension = imageFile.type === "image/png" ? ".png" : ".jpg";
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
        logger.error("Model processing failed", e);
      }
    }

    // Stage 3: Save Resource
    currentStage.value = 3;
    stageProgress.value[2] = 20;

    await saveFileRecord(md5, extension, file, handler, info, image_id);

    stageProgress.value[2] = 100;
  } catch (err) {
    logger.error(`Error uploading ${file.name}`, err);
    if (props.dir === "polygen") {
      finishUploadFile(file, -1);
    } else {
      Message.error(`Upload failed: ${file.name}`);
    }
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
        finishUploadFile(file, id);
      },
      undefined, // effectType
      info,
      image_id
    );
  } catch (err) {
    logger.error(err);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 320px;
  overflow: hidden;
  cursor: pointer;
  background-color: var(--bg-card, #fff);
  border: 2px dashed var(--border-color, #e2e8f0);
  border-radius: 24px;
  transition: all 0.3s ease;

  &:hover,
  &.is-dragover {
    background-color: var(--primary-light, #f0f9ff);
    border-color: var(--primary-color, #0ea5e9);
  }

  &.is-disabled {
    cursor: not-allowed;
    background-color: var(--bg-secondary, #f8fafc);
    border-color: var(--border-color, #e2e8f0);
  }
}

.upload-content {
  z-index: 1;
  text-align: center;
}

.cloud-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background-color: var(
    --info-light,
    #e0f2fe
  ); // Ensure info-light is defined or fallback

  border-radius: 50%;

  .svg-inline--fa {
    font-size: 40px;
    color: var(--primary-color, #0ea5e9);
  }
}

.upload-text {
  margin-bottom: 24px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
  }

  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted, #94a3b8);
  }
}

.browse-btn {
  height: auto;
  padding: 12px 32px;
  font-size: 14px;
  border-radius: 20px;
}

.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  opacity: 0.95;

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
  overflow: hidden;
  border: var(--border-width, 1px) solid var(--border-color, #ebeef5);
  border-radius: 12px;
}

.footer-row {
  display: flex;
  align-items: center;

  &.header {
    padding: 12px 0;
    font-size: 13px;
    color: var(--text-muted, #909399);
    background-color: var(--bg-secondary, #f5f7fa);
  }

  &.body {
    padding: 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #303133);
    background-color: var(--bg-card, #fff);
  }
}

.footer-col {
  flex: 1;
  text-align: center;
}

.compatibility-notes {
  padding: 14px 16px;
  margin-top: 14px;
  color: var(--text-secondary, #64748b);
  background: var(--bg-secondary, #f8fafc);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: 12px;
}

.compatibility-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);

  .svg-inline--fa {
    color: var(--primary-color, #0ea5e9);
  }
}

.compatibility-notes ul {
  padding-left: 18px;
  margin: 0;
}

.compatibility-notes li {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.55;
}

// Override Dialog styles
:deep(.el-dialog__header) {
  padding: 20px 24px;
  margin-right: 0;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #f1f5f9);
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 500;
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
