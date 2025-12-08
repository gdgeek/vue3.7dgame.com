<template>
  <el-dialog v-model="dialogVisible" :title="title" width="600px" center destroy-on-close @closed="handleDialogClose"
    class="upload-dialog" append-to-body>
    <div class="document-index">
      <el-card class="box-card-component">
        <template #header>
          <div class="box-card-header">
            <div>
              <h3>{{ title }}:</h3>
              <span class="header-declared">{{ declared }}</span>
            </div>
            <div v-if="maxSize > 0" class="size-limit-badge">
              {{ $t('upload.maxSizeLimit', { size: maxSize }) }}
            </div>
          </div>
        </template>
        <div style="position: relative">
          <div v-if="showEffectTypeSelect" class="effect-type-selector">
            <span>{{ $t('upload.effectType') }}:</span>
            <el-select v-model="selectedEffectType" :disabled="isDisabled" style="width: 120px; margin-left: 10px;">
              <el-option label="Glow" value="glow"></el-option>
              <el-option label="Wave" value="wave"></el-option>
            </el-select>
          </div>

          <!-- 统一进度条 -->
          <div class="unified-progress">
            <div class="stage-info">
              <span class="stage-text">{{ currentStageText || $t('upload.ready') }}</span>
              <span class="stage-number" v-if="currentStage > 0">{{ currentStage }}/3</span>
            </div>
            <el-progress :percentage="unifiedProgress" :color="currentStageColor" :stroke-width="20" />
          </div>

          <!-- 添加批量上传进度条 -->
          <div v-if="totalFilesCount > 1 && uploadedCount > 0" class="batch-progress">
            <span>{{ $t('upload.batchProgress', { current: uploadedCount, total: totalFilesCount }) }}</span>
            <el-progress :percentage="Math.round((uploadedCount / totalFilesCount) * 100)"
              :status="uploadedCount === totalFilesCount ? 'success' : ''"></el-progress>
          </div>

          <!-- 文件预览区域 -->
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <div class="files-header">
              <span>{{ $t('upload.selectedFiles', { count: selectedFiles.length }) }}</span>
              <el-tooltip :content="$t('upload.clearFiles')" placement="top" effect="light">
                <el-button type="text" @click="clearFiles" :disabled="isDisabled">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <el-scrollbar max-height="120px">
              <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                <el-icon>
                  <Document />
                </el-icon>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
            </el-scrollbar>
          </div>

          <el-divider></el-divider>
          <el-button type="primary" :disabled="isDisabled" @click="select" :loading="isDisabled">
            <el-icon v-if="!isDisabled" style="margin-right: 5px;">
              <UploadFilled />
            </el-icon>
            <slot>{{ $t("upload.button") }}</slot>
          </el-button>
        </div>
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { useFileStore } from "@/store/modules/config";
import { UploadFileType } from "@/api/user/model";
import { postFile } from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";
import { Delete, Document, Upload } from '@element-plus/icons-vue';
import { processModel } from "@/utils/modelProcessor";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    fileType: string;
    dir: string;
    advanced?: boolean;
    modelValue: boolean;
    showEffectTypeSelect?: boolean;
    multiple?: boolean;
    maxSize?: number; // 最大文件大小限制 (MB)
  }>(),
  {
    fileType: "*",
    dir: "",
    advanced: false,
    modelValue: false,
    showEffectTypeSelect: false,
    multiple: true,
    maxSize: 0, // 0 表示不限制
  }
);

const emit = defineEmits([
  "saveResource",
  "update:modelValue",
  "success"
]);

// 特效类型的选择
const selectedEffectType = ref<string>("glow");

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

const fileStore = useFileStore();
const selectedFiles = ref<File[]>([]);

const data = computed(() => [
  {
    name: "md5",
    title: t("upload.item1.title"),
    failed: t("upload.item1.failed"),
    declared: t("upload.item1.declared"),
    percentage: 0,
    status: "",
  },
  {
    name: "upload",
    title: t("upload.item2.title"),
    failed: t("upload.item2.failed"),
    declared: t("upload.item2.declared"),
    percentage: 0,
    status: "",
  },
  {
    name: "save",
    title: t("upload.item3.title"),
    failed: t("upload.item3.failed"),
    declared: t("upload.item3.declared"),
    percentage: 0,
    status: "",
  },
]);

// 默认
const defaultTitle = computed(() => t("upload.title"));
const defaultDeclared = computed(() => t("upload.declared"));
// 自定义
const changeTitle = ref<string | null>(null);
const changeDeclared = ref<string | null>(null);

const title = computed(() => changeTitle.value ?? defaultTitle.value);
const declared = computed(() => changeDeclared.value ?? defaultDeclared.value);

const isDisabled = ref(false);
const lastUploadedId = ref<number | null>(null);
let uploadedCount = ref(0);
let totalFilesCount = ref(0);
// 用于记录本次上传的所有模型ID
const uploadedIds = ref<number[]>([]);

// 统一进度条相关状态
const currentStage = ref(0); // 0: 未开始, 1: 预处理, 2: 上传, 3: 保存
const stageProgress = ref([0, 0, 0]); // 每个阶段的进度 0-100

// 计算统一进度
const unifiedProgress = computed(() => {
  if (currentStage.value === 0) return 0;
  const completedStages = currentStage.value - 1;
  const currentProgress = stageProgress.value[currentStage.value - 1];
  return Math.round((completedStages * 100 + currentProgress) / 3);
});

// 当前阶段颜色
const currentStageColor = computed(() => {
  if (currentStage.value === 0) return '#909399'; // 灰色 - 准备中
  const colors = ['#409eff', '#e6a23c', '#67c23a']; // 蓝色、橙色、绿色
  return colors[currentStage.value - 1] || '#409eff';
});

// 当前阶段文本
const currentStageText = computed(() => {
  const stages = [
    t('upload.stage1'),
    t('upload.stage2'),
    t('upload.stage3')
  ];
  return stages[currentStage.value - 1] || '';
});

// 获取本次上传的所有模型ID的方法
const getUploadedIds = () => {
  return uploadedIds.value;
};

// 获取图片尺寸
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

// 获取视频信息
const getVideoInfo = (file: File): Promise<{ size: { x: number; y: number }; length: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        size: { x: video.videoWidth, y: video.videoHeight },
        length: video.duration
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ size: { x: 0, y: 0 }, length: 0 });
    };
  });
};

// 获取音频信息
const getAudioInfo = (file: File): Promise<{ length: number }> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve({
        length: audio.duration
      });
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve({ length: 0 });
    };
  });
};

// 格式化文件大小显示
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// 清除已选择的文件
const clearFiles = () => {
  selectedFiles.value = [];
};

// 更新标题和声明信息
const step = (idx: number) => {
  const item = data.value[idx];
  changeTitle.value = item.title;
  changeDeclared.value = item.declared;
};

// 更新进度条
const progress = (p: number, idx: number) => {
  // 更新当前阶段
  currentStage.value = idx + 1;

  // 更新阶段进度
  stageProgress.value[idx] = Math.round(Math.min(p, 1) * 100);

  // 更新标题和声明（保留原有逻辑）
  step(idx);
  data.value[idx].status = p >= 1 ? "success" as const : "" as const;
  data.value[idx].percentage = Math.round(Math.min(p, 1) * 100);
};

const saveFile = async (
  md5: string,
  extension: string,
  file: File,
  handler: FileHandler,
  totalFiles: number,
  info?: string,
  image_id?: number
) => {
  extension = extension.startsWith('.') ? extension : `.${extension}`;
  const data: UploadFileType = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, props.dir),
    particleType: props.showEffectTypeSelect ? selectedEffectType.value : undefined,
  };

  // 更新上传进度完成
  progress(1, 1);

  // 开始保存信息的进度
  progress(0.3, 2);

  try {
    const response = await postFile(data);

    // 文件信息已保存到服务器，更新进度
    progress(0.6, 2);

    emit("saveResource", data.filename, response.data.id, totalFiles, (id: number) => {
      // 资源保存完成，更新最终进度
      progress(1, 2);
      uploadedCount.value++;
      lastUploadedId.value = id;
      uploadedIds.value.push(id);

      // 如果所有文件都已上传，触发成功事件
      if (uploadedCount.value === totalFilesCount.value) {
        emit("success", uploadedIds.value);
      }
    }, selectedEffectType.value, info, image_id);
  } catch (err) {
    console.error(err);
  }
};

// 选择文件并上传
const select = async () => {
  try {
    let files = await fileStore.store.fileOpen(props.fileType, props.multiple);
    if (files.length === 0) return;

    // 文件大小检查
    if (props.maxSize > 0) {
      const maxBytes = props.maxSize * 1024 * 1024;
      const oversizedFiles = files.filter((f: File) => f.size > maxBytes);
      if (oversizedFiles.length > 0) {
        const names = oversizedFiles.map((f: File) => f.name).join(', ');
        ElMessage.error(t('upload.fileTooLarge', { size: props.maxSize }) + ': ' + names);
        files = files.filter((f: File) => f.size <= maxBytes);
        if (files.length === 0) {
          return;
        }
      }
    }

    selectedFiles.value = files;
    isDisabled.value = true; // 禁用按钮
    uploadedCount.value = 0; // 重置已完成文件计数
    totalFilesCount.value = files.length; // 总文件数
    uploadedIds.value = []; // 重置上传ID列表

    // 初始化进度条为 0%，显示灰色进度条
    currentStage.value = 0;
    stageProgress.value = [0, 0, 0];

    for (const file of files) {
      try {
        const md5 = await fileStore.store.fileMD5(file, (p: number) =>
          progress(p, 0)
        );
        const handler = await fileStore.store.publicHandler();
        let extension = ".bytes";
        if (file.extension !== undefined) {
          extension = file.extension.startsWith('.') ? file.extension : `.${file.extension}`;
        }
        const has = await fileStore.store.fileHas(
          md5,
          extension,
          handler,
          props.dir
        );

        if (!has) {
          await fileStore.store.fileUpload(
            md5,
            extension,
            file,
            (p: number) => progress(p, 1),
            handler,
            props.dir
          );
        }

        let info: string | undefined;
        let image_id: number | undefined;

        // 如果是图片，获取尺寸信息
        if (props.dir === 'picture' && file.type.startsWith('image/')) {
          const size = await getImageSize(file);
          if (size.x > 0 && size.y > 0) {
            info = JSON.stringify({ size });
            // 图片上传时，image_id 暂时未知（需要文件上传后获得文件ID），
            // 但在这里我们还不知道文件ID。
            // 实际上 saveFile 会先上传文件获得文件ID (response.data.id)，
            // 然后我们在 saveResource 回调中创建资源。
            // 这里的 image_id 参数其实是多余的，因为 saveFile 内部获得了文件ID。
            // 我们只需要传递 info 即可，image_id 将在 savePicture (父组件) 中被设置为 file_id。
          }
        }

        // 如果是视频，获取时长和尺寸信息
        if (props.dir === 'video' && file.type.startsWith('video/')) {
          const videoInfo = await getVideoInfo(file);
          if (videoInfo.size.x > 0) {
            info = JSON.stringify(videoInfo);
          }
        }

        // 如果是音频，获取时长信息
        if (props.dir === 'audio' && file.type.startsWith('audio/')) {
          const audioInfo = await getAudioInfo(file);
          if (audioInfo.length > 0) {
            const size = { x: 800, y: 800 };
            info = JSON.stringify({ size, length: audioInfo.length });
          }
        }

        // 如果是模型，处理模型信息并生成截图
        if (props.dir === 'polygen' && file.name.toLowerCase().endsWith('.glb')) {
          try {
            const processed = await processModel(file);
            info = processed.info;

            // 上传生成的截图
            const imageFile = processed.image;
            const imageMd5 = await fileStore.store.fileMD5(imageFile);
            const imageHandler = await fileStore.store.publicHandler();
            const imageExtension = ".jpg";

            const imageHas = await fileStore.store.fileHas(
              imageMd5,
              imageExtension,
              imageHandler,
              "screenshot/polygen"
            );

            if (!imageHas) {
              await fileStore.store.fileUpload(
                imageMd5,
                imageExtension,
                imageFile,
                () => { },
                imageHandler,
                "screenshot/polygen"
              );
            }

            // 保存图片文件记录以获取ID
            const imageData: UploadFileType = {
              filename: imageFile.name,
              md5: imageMd5,
              key: imageMd5 + imageExtension,
              url: fileStore.store.fileUrl(imageMd5, imageExtension, imageHandler, "screenshot/polygen"),
            };

            const imageResponse = await postFile(imageData);
            image_id = imageResponse.data.id;

          } catch (e) {
            console.error("Failed to process model:", e);
            ElMessage.warning(t("upload.modelProcessFailed", { name: file.name }));
          }
        }

        await saveFile(md5, extension, file, handler, totalFilesCount.value, info, image_id);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      } finally {
        if (uploadedCount.value === totalFilesCount.value) {
          isDisabled.value = false;
        }
      }
    }
  } catch (error) {
    console.error("Error in select function:", error);
    isDisabled.value = false;
  }
};

// 关闭对话框时重置状态
const handleDialogClose = () => {
  isDisabled.value = false;
  selectedFiles.value = [];
  uploadedCount.value = 0;
  totalFilesCount.value = 0;
  uploadedIds.value = [];

  // 重置统一进度条状态
  currentStage.value = 0;
  stageProgress.value = [0, 0, 0];

  // 重置原有进度条状态
  data.value.forEach(item => {
    item.percentage = 0;
    item.status = "";
  });
  changeTitle.value = null;
  changeDeclared.value = null;
};

// 暴露方法给父组件
defineExpose({
  getUploadedIds
});
</script>

<style scoped>
.document-index {
  padding: 10px;
}

.box-card-component {
  margin-bottom: 10px;
}

.box-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.box-card-header h3 {
  margin: 0 0 4px 0;
}

.header-declared {
  color: #909399;
  font-size: 13px;
}

.size-limit-badge {
  background-color: #409eff;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.progress-item {
  margin-bottom: 10px;
}

.effect-type-selector {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}

.batch-progress {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #eee;
}

.unified-progress {
  margin-bottom: 20px;
}

.stage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stage-text {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.stage-number {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.selected-files {
  margin-top: 15px;
  border-radius: 4px;
  padding: 10px;
  transition: all 0.3s ease;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: bold;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
  animation: fadeIn 0.3s ease;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  flex: 1;
  margin: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.upload-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}

.upload-dialog :deep(.el-dialog__body) {
  padding-top: 20px;
}
</style>
