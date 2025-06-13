<template>
  <div class="image-selector">
    <!-- 资源对话框组件 -->
    <ResourceDialog :multiple="false" @selected="onResourceSelected" ref="resourceDialog"></ResourceDialog>

    <!-- 图片显示区域 -->
    <div class="image-display" style="width: 100%; text-align: center; cursor: pointer;" @click="showImageSelectDialog">
      <el-image fit="contain" style="width: 100%; height: 300px" :src="displayImageUrl"></el-image>
    </div>

    <!-- 选择图片方式的对话框 -->
    <el-dialog v-model="imageSelectDialogVisible" :title="$t('imageSelector.selectImageMethod')" width="30%"
      align-center>
      <div style="display: flex; justify-content: space-around; margin: 10px 0;">
        <el-button-group>
          <el-button type="primary" @click="openResourceDialog">
            {{ $t('imageSelector.selectFromResource') }}
          </el-button>
          <el-button type="success">
            <el-upload action="" :auto-upload="false" :show-file-list="false" :on-change="handleLocalUpload"
              accept="image/jpeg,image/gif,image/png,image/bmp">
              {{ $t('imageSelector.uploadLocal') }}
            </el-upload>
          </el-button>
        </el-button-group>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { ElMessage, ElMessageBox } from 'element-plus';
import type { UploadFile, UploadFiles } from "element-plus";
import type { ViewCard } from "vue-waterfall-plugin-next/dist/types/types/waterfall"
import defaultImage from '@/assets/image/none2.png';

const props = defineProps({
  imageUrl: {
    type: String,
  },
  itemId: {
    type: Number,
    required: true
  }
});

const displayImageUrl = computed(() => {
  return props.imageUrl || defaultImage;
});

const emit = defineEmits(['image-selected', 'image-upload-success']);
const { t } = useI18n();
const fileStore = useFileStore();
const resourceDialog = ref();
const imageSelectDialogVisible = ref(false);

// 显示图片选择对话框
const showImageSelectDialog = () => {
  imageSelectDialogVisible.value = true;
};

// 打开资源对话框
const openResourceDialog = () => {
  if (resourceDialog.value) {
    imageSelectDialogVisible.value = false;
    resourceDialog.value.openIt({
      type: "picture",
    });
  }
};

// 处理从资源库选择的图片
const onResourceSelected = (data: ViewCard) => {
  imageSelectDialogVisible.value = false;
  emit('image-selected', {
    imageId: data.image_id,
    itemId: props.itemId
  });
};

// 处理本地上传的图片
const handleLocalUpload = async (file: UploadFile, fileList: UploadFiles) => {
  imageSelectDialogVisible.value = false;

  const selectedFile = file.raw;
  if (!selectedFile) {
    ElMessage.error(t('imageSelector.uploadError'));
    return;
  }

  const isValidImage = [
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/gif",
  ].includes(selectedFile.type);
  const isLt2M = selectedFile.size / 1024 / 1024 < 2;

  if (!isValidImage) {
    ElMessage.error(t('imageSelector.invalidImageType'));
    return;
  }
  if (!isLt2M) {
    ElMessage.error(t('imageSelector.imageTooLarge'));
    return;
  }

  try {
    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(selectedFile);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t('imageSelector.handlerError'));
      return;
    }

    // 检查文件是否已存在
    const extension = selectedFile.name.split(".").pop() || "";
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      "backup"
    );

    // 如果文件不存在，上传文件
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        selectedFile,
        (p: any) => { },
        handler,
        "backup"
      );
    }

    // 保存图片信息
    await saveLocalImage(md5, extension, selectedFile, handler);
  } catch (error) {
    console.error("上传图片失败:", error);
    ElMessage.error(t('imageSelector.uploadFailed'));
  }
};

// 保存本地上传的图片信息
const saveLocalImage = async (
  md5: string,
  extension: string,
  file: File,
  handler: any
) => {
  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
  };

  try {
    const post = await postFile(data);

    emit('image-upload-success', {
      imageId: post.data.id,
      itemId: props.itemId
    });
  } catch (err) {
    console.error("保存图片信息失败:", err);
    ElMessage.error(t('imageSelector.saveFailed'));
  }
};
</script>

<style scoped>
.image-display {
  cursor: pointer;
  transition: all 0.3s;
}

.image-display:hover {
  opacity: 0.8;
}
</style>