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

    <el-dialog
      v-model="cropDialogVisible"
      :title="$t('imageSelector.cropTitle')"
      width="640px"
      align-center
      :close-on-click-modal="false"
      append-to-body
      @closed="handleCropDialogClosed"
    >
      <p class="crop-tip">{{ $t("imageSelector.cropTip") }}</p>
      <div class="cropper-wrap">
        <VueCropper
          ref="cropperRef"
          :img="cropOptions.img"
          :output-type="cropOptions.outputType"
          :info="true"
          :full="cropOptions.full"
          :can-move-box="cropOptions.canMoveBox"
          :original="cropOptions.original"
          :auto-crop="cropOptions.autoCrop"
          :fixed="cropOptions.fixed"
          :fixed-number="cropOptions.fixedNumber"
          :center-box="cropOptions.centerBox"
          :info-true="cropOptions.infoTrue"
          :fixed-box="cropOptions.fixedBox"
          :auto-crop-width="cropOptions.autoCropWidth"
          :auto-crop-height="cropOptions.autoCropHeight"
        ></VueCropper>
      </div>
      <template #footer>
        <div class="crop-footer">
          <el-button-group>
            <el-button plain @click="rotateLeftHandle">
              {{ $t("imageSelector.rotateLeft") }}
            </el-button>
            <el-button plain @click="rotateRightHandle">
              {{ $t("imageSelector.rotateRight") }}
            </el-button>
            <el-button plain @click="changeScaleHandle(1)">
              {{ $t("imageSelector.zoomIn") }}
            </el-button>
            <el-button plain @click="changeScaleHandle(-1)">
              {{ $t("imageSelector.zoomOut") }}
            </el-button>
          </el-button-group>
          <div>
            <el-button @click="cropDialogVisible = false">
              {{ $t("imageSelector.cancel") }}
            </el-button>
            <el-button
              type="primary"
              :loading="cropSubmitting"
              @click="finishCropAndUpload"
            >
              {{ $t("imageSelector.confirm") }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { UploadFileType } from "@/api/user/model";
import { postFile } from "@/api/v1/files";
import { useFileStore } from "@/store/modules/config";
import { ref, watch } from "vue";
import { FolderOpened, Upload, Plus } from "@element-plus/icons-vue";
import ResourceDialog from "./ResourceDialog.vue";
import MrPPUploadDialog from "./MrPPUploadDialog/index.vue";
import Id2Image from "@/components/Id2Image.vue";
import { postPicture, getPicture } from "@/api/v1/resources/index";
import { ElMessage } from "element-plus";
import { CardInfo } from "@/utils/types";
import { VueCropper } from "vue-cropper";
import "vue-cropper/dist/index.css";
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    imageUrl?: string;
    itemId?: number | null;
    enableCrop?: boolean;
    cropFixed?: boolean;
    cropFixedNumber?: [number, number];
    cropMaxSizeMB?: number;
  }>(),
  {
    imageUrl: "",
    itemId: null,
    enableCrop: false,
    cropFixed: true,
    cropFixedNumber: () => [1, 1] as [number, number],
    cropMaxSizeMB: 2,
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

const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>(null);
const imageSelectDialogVisible = ref(false);
const uploadDialogVisible = ref(false);
const fileType = ref("image/jpeg,image/gif,image/png,image/bmp");
const fileStore = useFileStore();
const cropDialogVisible = ref(false);
const cropSubmitting = ref(false);
const cropperRef = ref<InstanceType<typeof VueCropper> | null>(null);
const selectedLocalFileName = ref("image.jpg");
const objectUrl = ref("");
const cropOptions = ref({
  img: "",
  outputType: "jpeg" as const,
  autoCrop: true,
  autoCropWidth: 300,
  autoCropHeight: 300,
  fixedBox: false,
  fixed: props.cropFixed,
  fixedNumber: props.cropFixedNumber,
  full: false,
  canMoveBox: true,
  original: false,
  centerBox: true,
  infoTrue: true,
});

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
  const context =
    typeof data.context === "object" && data.context !== null
      ? (data.context as { image_id?: number })
      : undefined;
  emit("image-selected", {
    imageId: context?.image_id || data.image?.id || 0, // Fallback to image.id
    itemId: props.itemId,
    imageUrl: data.image?.url,
  });
};

const revokeObjectUrl = () => {
  if (!objectUrl.value) return;
  URL.revokeObjectURL(objectUrl.value);
  objectUrl.value = "";
};

const selectLocalImageForCrop = async () => {
  const files = await fileStore.store.fileOpen(fileType.value, false);
  if (!files.length) return;
  const file = files[0];
  if (!file.type.startsWith("image/")) {
    ElMessage.error(t("imageSelector.invalidType"));
    return;
  }

  if (props.cropMaxSizeMB > 0) {
    const isLtLimit = file.size / 1024 / 1024 < props.cropMaxSizeMB;
    if (!isLtLimit) {
      ElMessage.error(
        t("imageSelector.invalidSize", { size: props.cropMaxSizeMB })
      );
      return;
    }
  }

  selectedLocalFileName.value = file.name || "image.jpg";
  revokeObjectUrl();
  objectUrl.value = URL.createObjectURL(file);
  cropOptions.value.img = objectUrl.value;
  cropOptions.value.fixed = props.cropFixed;
  cropOptions.value.fixedNumber = props.cropFixedNumber;
  cropDialogVisible.value = true;
};

const openUploadDialog = async () => {
  imageSelectDialogVisible.value = false;
  if (props.enableCrop) {
    await selectLocalImageForCrop();
    return;
  }
  uploadDialogVisible.value = true;
};

const savePicture = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  _image_id?: number
) => {
  try {
    const data: {
      name: string;
      file_id: number;
      info?: string;
      image_id?: number;
    } = { name, file_id };
    if (info) {
      data.info = info;
      data.image_id = file_id;
    }
    const response = await postPicture(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    logger.error("Failed to save picture:", err);
    callback(-1);
  }
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  const ids = Array.isArray(uploadedIds) ? uploadedIds : [uploadedIds];
  const pictureResourceId = ids[0];

  logger.log(
    "ImageSelector: Upload success, picture resource ID:",
    pictureResourceId
  );

  try {
    // Fetch the picture resource to get its image_id (file ID)
    const response = await getPicture(pictureResourceId);
    logger.log("ImageSelector: Fetched picture resource:", response.data);

    // For picture resources, strictly speaking the 'file' IS the image.
    // Sometimes 'image_id' (thumbnail) might not be generated or linked yet,
    // but 'file' is definitely there for a picture resource.
    // So we prefer image_id, but fall back to file.id if necessary.
    const imageId = response.data.image_id || response.data.file?.id;
    const imageUrl = response.data.image?.url || response.data.file?.url;

    if (imageId) {
      logger.log(
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
      logger.error("ImageSelector: No image_id in response:", response.data);
      ElMessage.error("Failed to get image ID from uploaded picture");
    }
  } catch (error) {
    logger.error("ImageSelector: Failed to fetch uploaded picture:", error);
    ElMessage.error("Failed to update image");
  }
};

const handleCropDialogClosed = () => {
  cropSubmitting.value = false;
  cropOptions.value.img = "";
  revokeObjectUrl();
};

const rotateLeftHandle = () => cropperRef.value?.rotateLeft();
const rotateRightHandle = () => cropperRef.value?.rotateRight();
const changeScaleHandle = (num: number) => {
  cropperRef.value?.changeScale(num || 1);
};

const getCroppedBlob = () =>
  new Promise<Blob>((resolve, reject) => {
    if (!cropperRef.value) {
      reject(new Error("cropper-not-ready"));
      return;
    }
    cropperRef.value.getCropBlob((blob: Blob) => {
      if (!blob) {
        reject(new Error("crop-blob-empty"));
        return;
      }
      resolve(blob);
    });
  });

const uploadSingleImage = async (file: File) => {
  const md5 = await fileStore.store.fileMD5(file);
  const handler = await fileStore.store.publicHandler();
  if (!handler) {
    throw new Error("no-file-handler");
  }

  const extension = ".jpg";
  const has = await fileStore.store.fileHas(md5, extension, handler, "picture");
  if (!has) {
    await fileStore.store.fileUpload(
      md5,
      extension,
      file,
      () => {},
      handler,
      "picture"
    );
  }

  const fileData: UploadFileType = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, "picture"),
  };
  const fileResponse = await postFile(fileData);

  const pictureResponse = await postPicture({
    name: file.name,
    file_id: fileResponse.data.id,
  });
  const pictureResourceId = pictureResponse.data.id;

  const pictureDetail = await getPicture(pictureResourceId);
  const imageId =
    pictureDetail.data.image_id ||
    pictureDetail.data.file?.id ||
    fileResponse.data.id;
  const imageUrl =
    pictureDetail.data.image?.url ||
    pictureDetail.data.file?.url ||
    fileData.url;

  return { imageId, imageUrl };
};

const finishCropAndUpload = async () => {
  cropSubmitting.value = true;
  try {
    const blob = await getCroppedBlob();
    const baseName = selectedLocalFileName.value.replace(/\.[^.]+$/, "");
    const fileName = `${baseName || "image"}_crop.jpg`;
    const file = new File([blob], fileName, {
      type: "image/jpeg",
    });
    const uploaded = await uploadSingleImage(file);
    displayImageUrl.value = uploaded.imageUrl;
    emit("image-upload-success", {
      imageId: uploaded.imageId,
      itemId: props.itemId,
      imageUrl: uploaded.imageUrl,
    });
    cropDialogVisible.value = false;
  } catch (error) {
    logger.error("ImageSelector: crop upload failed", error);
    ElMessage.error(t("imageSelector.uploadFailed"));
  } finally {
    cropSubmitting.value = false;
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

.crop-tip {
  margin: 0 0 10px;
  color: #606266;
  font-size: 13px;
}

.cropper-wrap {
  width: 100%;
  height: 360px;
  text-align: center;
}

.crop-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
