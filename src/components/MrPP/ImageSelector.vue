<template>
  <div class="image-selector">
    <!-- 1. 资源对话框 -->
    <resource-dialog
      :multiple="false"
      @selected="onResourceSelected"
      ref="resourceDialog"
    ></resource-dialog>

    <!-- 2. 图片展示区域 -->
    <div class="image-display" @click="showImageSelectDialog">
      <div v-if="!displayImageUrl && !props.itemId" class="upload-placeholder">
        <el-icon :size="28">
          <Plus></Plus>
        </el-icon>
        <div class="placeholder-text">{{ $t("common.select") }}</div>
      </div>
      <Id2Image
        v-else
        :id="props.itemId ?? undefined"
        :image="displayImageUrl"
        :lazy="false"
        style="
          width: 140px;
          height: 140px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--el-border-color);
        "
        thumbnailSize="256x"
        fit="cover"
      ></Id2Image>
    </div>

    <!-- 3. 选择方式弹窗 -->
    <el-dialog
      v-model="imageSelectDialogVisible"
      :title="$t('imageSelector.selectImageMethod')"
      width="500px"
      align-center
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="selection-container">
        <div class="selection-card" @click="openResourceDialog">
          <div class="card-icon">
            <el-icon :size="32">
              <FolderOpened></FolderOpened>
            </el-icon>
          </div>
          <div class="card-title">
            {{ $t("imageSelector.selectFromResource") }}
          </div>
          <div class="card-description">
            {{ $t("imageSelector.selectFromResourceDesc") }}
          </div>
        </div>

        <div class="selection-card" @click="openUploadDialog">
          <div class="card-icon">
            <el-icon :size="32">
              <Upload></Upload>
            </el-icon>
          </div>
          <div class="card-title">{{ $t("imageSelector.uploadLocal") }}</div>
          <div class="card-description">
            {{ $t("imageSelector.uploadLocalDesc") }}
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 4. 上传对话框 -->
    <mr-p-p-upload-dialog
      v-model="uploadDialogVisible"
      dir="picture"
      :file-type="fileType"
      :multiple="false"
      @save-resource="savePicture"
      @success="handleUploadSuccess"
      append-to-body
    >
      {{ $t("imageSelector.uploadFile") }}
    </mr-p-p-upload-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { FolderOpened, Upload, Plus } from "@element-plus/icons-vue";
import ResourceDialog from "./ResourceDialog.vue";
import MrPPUploadDialog from "./MrPPUploadDialog/index.vue";
import Id2Image from "@/components/Id2Image.vue";
import { postPicture, getPicture } from "@/api/v1/resources/index";
import { ElMessage } from "element-plus";
import { CardInfo } from "@/utils/types";

const props = withDefaults(
  defineProps<{
    imageUrl?: string;
    itemId?: number | null;
  }>(),
  {
    imageUrl: "",
    itemId: null,
  }
);

const emit = defineEmits<{
  (
    e: "image-selected",
    data: { imageId: number; itemId: number | null; imageUrl?: string }
  ): void;
  (
    e: "image-upload-success",
    data: { imageId: number; itemId: number | null; imageUrl?: string }
  ): void;
}>();

const { t } = useI18n();
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>(null);
const imageSelectDialogVisible = ref(false);
const uploadDialogVisible = ref(false);
const fileType = ref("image/jpeg,image/gif,image/png,image/bmp");

// 显示的图片 URL，传递给 Id2Image 组件
const displayImageUrl = ref<string | null>(null);

// 同步 props.imageUrl 到 displayImageUrl
watch(
  [() => props.imageUrl, () => props.itemId],
  ([newUrl]) => {
    displayImageUrl.value = newUrl || null;
  },
  { immediate: true }
);

const showImageSelectDialog = () => {
  imageSelectDialogVisible.value = true;
};

const openResourceDialog = () => {
  imageSelectDialogVisible.value = false;
  resourceDialog.value?.openIt({ type: "picture" });
};

const onResourceSelected = (data: CardInfo) => {
  emit("image-selected", {
    imageId: data.context.image_id || data.image?.id || 0, // Fallback to image.id
    itemId: props.itemId,
    imageUrl: data.image?.url,
  });
};

const openUploadDialog = () => {
  imageSelectDialogVisible.value = false;
  uploadDialogVisible.value = true;
};

const savePicture = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  image_id?: number
) => {
  try {
    const data: any = { name, file_id };
    if (info) {
      data.info = info;
      data.image_id = file_id;
    }
    const response = await postPicture(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save picture:", err);
    callback(-1);
  }
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  const ids = Array.isArray(uploadedIds) ? uploadedIds : [uploadedIds];
  const pictureResourceId = ids[0];

  console.log(
    "ImageSelector: Upload success, picture resource ID:",
    pictureResourceId
  );

  try {
    // Fetch the picture resource to get its image_id (file ID)
    const response = await getPicture(pictureResourceId);
    console.log("ImageSelector: Fetched picture resource:", response.data);

    // For picture resources, strictly speaking the 'file' IS the image.
    // Sometimes 'image_id' (thumbnail) might not be generated or linked yet,
    // but 'file' is definitely there for a picture resource.
    // So we prefer image_id, but fall back to file.id if necessary.
    const imageId = response.data.image_id || response.data.file?.id;
    const imageUrl = response.data.image?.url || response.data.file?.url;

    if (imageId) {
      console.log(
        "ImageSelector: Emitting image-upload-success with imageId:",
        imageId
      );

      // Update display URL to show the newly uploaded image
      if (imageUrl) {
        displayImageUrl.value = imageUrl;
      }

      emit("image-upload-success", {
        imageId: imageId,
        itemId: props.itemId,
        imageUrl: imageUrl,
      });
    } else {
      console.error("ImageSelector: No image_id in response:", response.data);
      ElMessage.error("Failed to get image ID from uploaded picture");
    }
  } catch (error) {
    console.error("ImageSelector: Failed to fetch uploaded picture:", error);
    ElMessage.error("Failed to update image");
  }
};
</script>

<style scoped>
.image-display {
  cursor: pointer;
  text-align: center;
  transition: opacity 0.3s;
}

.image-display:hover {
  opacity: 0.8;
}

.selection-container {
  display: flex;
  gap: 15px;
  padding: 5px;
}

.selection-card {
  flex: 1;
  padding: 20px 15px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
}

.selection-card:hover {
  border-color: #409eff;
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(64, 158, 255, 0.2);
  background: linear-gradient(135deg, #ecf5ff 0%, #ffffff 100%);
}

.card-icon {
  color: #409eff;
  margin-bottom: 15px;
  transition: transform 0.3s ease;
}

.selection-card:hover .card-icon {
  transform: scale(1.1);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.card-description {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.image-display {
  display: flex;
  justify-content: center;
}

.upload-placeholder {
  width: 140px;
  height: 140px;
  background-color: #f5f7fa;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  transition: all 0.3s;
  cursor: pointer;
}

.upload-placeholder:hover {
  border-color: #409eff;
  color: #409eff;
}

.placeholder-text {
  margin-top: 10px;
  font-size: 14px;
}
</style>
