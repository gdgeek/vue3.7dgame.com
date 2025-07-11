<template>
  <el-dialog v-model="dialogVisible" :title="title" width="600px" center destroy-on-close @closed="handleDialogClose"
    class="upload-dialog" append-to-body>
    <div class="document-index">
      <el-card class="box-card-component">
        <template #header>
          <div class="box-card-header">
            <h3>{{ title }}:</h3>
            {{ declared }}
          </div>
        </template>
        <div style="position: relative">
          <div v-for="item in data" :key="item.name">
            <div class="progress-item">
              <span>{{ item.title }}</span>
              <el-progress :percentage="item.percentage"
                :status="item.status === 'success' ? 'success' : ''"></el-progress>
            </div>
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

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    fileType: string;
    dir: string;
    advanced?: boolean;
    modelValue: boolean;
  }>(),
  {
    fileType: "*",
    dir: "",
    advanced: false,
    modelValue: false,
  }
);

const emit = defineEmits([
  "saveResource",
  "update:modelValue",
  "success"
]);

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

// 获取本次上传的所有模型ID的方法
const getUploadedIds = () => {
  return uploadedIds.value;
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
  step(idx);
  data.value[idx].status = p >= 1 ? "success" as const : "" as const;
  data.value[idx].percentage = Math.round(Math.min(p, 1) * 100);
};

const saveFile = async (
  md5: string,
  extension: string,
  file: File,
  handler: FileHandler,
  totalFiles: number
) => {
  extension = extension.startsWith('.') ? extension : `.${extension}`;
  const data: UploadFileType = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, props.dir),
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
    });
  } catch (err) {
    console.error(err);
  }
};

// 选择文件并上传
const select = async () => {
  try {
    const files = await fileStore.store.fileOpen(props.fileType, true);
    if (files.length === 0) return;

    selectedFiles.value = files;
    isDisabled.value = true; // 禁用按钮
    uploadedCount.value = 0; // 重置已完成文件计数
    totalFilesCount.value = files.length; // 总文件数
    uploadedIds.value = []; // 重置上传ID列表

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

        await saveFile(md5, extension, file, handler, totalFilesCount.value);
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
  data.value.forEach(item => {
    item.percentage = 0;
    item.status = "";
  });
  changeTitle.value = null;
  changeDeclared.value = null;
  uploadedIds.value = [];
  selectedFiles.value = [];
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
  align-items: center;
  justify-content: space-between;
}

.progress-item {
  margin-bottom: 10px;
}

.batch-progress {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #eee;
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