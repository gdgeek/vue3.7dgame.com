<template>
  <TransitionWrapper>
    <CardListPage
      ref="cardListPageRef"
      :fetch-data="fetchPictures"
      wrapper-class="picture-index"
      @refresh="handleRefresh"
    >
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button
            size="small"
            type="primary"
            icon="uploadFilled"
            @click="openUploadDialog"
          >
            <span class="hidden-sm-and-down">{{
              $t("picture.uploadPicture")
            }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card
          :item="item"
          type="图片"
          color="#27ae60"
          @named="namedWindow"
          @deleted="deletedWindow"
        >
          <template #enter>
            <el-button
              v-if="item.info === null || item.image === null"
              type="warning"
              size="small"
              @click="openViewDialog(item.id)"
            >
              {{ $t("picture.initializePictureData") }}
            </el-button>
            <el-button
              v-else
              type="primary"
              size="small"
              @click="openViewDialog(item.id)"
            >
              {{ $t("picture.viewPicture") }}
            </el-button>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <!-- 新增上传弹窗组件 -->
        <mr-p-p-upload-dialog
          v-model="uploadDialogVisible"
          dir="picture"
          :file-type="fileType"
          :max-size="5"
          @save-resource="savePicture"
          @success="handleUploadSuccess"
        >
          {{ $t("picture.uploadFile") }}
        </mr-p-p-upload-dialog>

        <!-- 图片查看弹窗 -->
        <PictureDialog
          v-model="viewDialogVisible"
          :id="currentPictureId"
          @refresh="refreshList"
          @deleted="refreshList"
        ></PictureDialog>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import CardListPage from "@/components/MrPP/CardListPage/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import PictureDialog from "@/components/MrPP/PictureDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getPictures,
  putPicture,
  deletePicture,
  postPicture,
} from "@/api/v1/resources/index";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();

// Reference to CardListPage for calling refresh
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref("image/gif, image/jpeg, image/png, image/webp");

// 查看弹窗相关
const viewDialogVisible = ref(false);
const currentPictureId = ref<number | null>(null);

// Fetch data function for CardListPage
const fetchPictures = async (params: FetchParams): Promise<FetchResponse> => {
  return await getPictures(params.sort, params.search, params.page);
};

// Handle refresh event from CardListPage
const handleRefresh = (data: any[]) => {
  // Can add custom logic here if needed
};

// Helper to refresh the list
const refreshList = () => {
  cardListPageRef.value?.refresh();
};

// 打开上传弹窗
const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

// 打开查看弹窗
const openViewDialog = (id: number) => {
  currentPictureId.value = id;
  viewDialogVisible.value = true;
};

// 上传成功后处理
const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refreshList();
};

// 保存图片
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

// 重命名处理
const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = (await ElMessageBox.prompt(
      t("picture.prompt.message1"),
      t("picture.prompt.message2"),
      {
        confirmButtonText: t("picture.prompt.confirm"),
        cancelButtonText: t("picture.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    )) as { value: string };
    await putPicture(item.id, { name: value });
    refreshList();
    ElMessage.success(t("picture.prompt.success") + value);
  } catch {
    ElMessage.info(t("picture.prompt.info"));
  }
};

// 删除确认
const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("picture.confirm.message1"),
      t("picture.confirm.message2"),
      {
        confirmButtonText: t("picture.confirm.confirm"),
        cancelButtonText: t("picture.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePicture(item.id);
    refreshList();
    ElMessage.success(t("picture.confirm.success"));
  } catch {
    ElMessage.info(t("picture.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped>
.picture-index {
  padding: 20px;
}
</style>
