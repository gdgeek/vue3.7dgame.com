<template>
  <TransitionWrapper>
    <CardListPage
      ref="cardListPageRef"
      :fetch-data="fetchVideos"
      wrapper-class="video-index"
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
              $t("video.uploadVideo")
            }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card
          :item="item"
          type="视频"
          color="#1abc9c"
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
              {{ $t("video.initializeVideoData") }}
            </el-button>
            <el-button
              v-else
              type="primary"
              size="small"
              @click="openViewDialog(item.id)"
            >
              {{ $t("video.viewVideo") }}
            </el-button>
          </template>
          <template #overlay>
            <el-button
              type="primary"
              circle
              size="large"
              @click.stop="openViewDialog(item.id, true)"
            >
              <el-icon :size="30">
                <VideoPlay></VideoPlay>
              </el-icon>
            </el-button>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <mr-p-p-upload-dialog
          v-model="uploadDialogVisible"
          dir="video"
          :file-type="fileType"
          :max-size="80"
          @save-resource="saveVideo"
          @success="handleUploadSuccess"
        >
          {{ $t("video.uploadFile") }}
        </mr-p-p-upload-dialog>

        <VideoDialog
          v-model="viewDialogVisible"
          :id="currentVideoId"
          :auto-play="autoPlay"
          @refresh="refreshList"
          @deleted="refreshList"
        ></VideoDialog>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { VideoPlay } from "@element-plus/icons-vue";
import CardListPage from "@/components/MrPP/CardListPage/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import VideoDialog from "@/components/MrPP/VideoDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getVideos,
  putVideo,
  deleteVideo,
  postVideo,
} from "@/api/v1/resources/index";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const uploadDialogVisible = ref(false);
const fileType = ref("video/mp4, video/webm");
const viewDialogVisible = ref(false);
const currentVideoId = ref<number | null>(null);
const autoPlay = ref(false);

const fetchVideos = async (params: FetchParams): Promise<FetchResponse> => {
  return await getVideos(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => {};

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = (id: number, play: boolean = false) => {
  currentVideoId.value = id;
  autoPlay.value = play;
  viewDialogVisible.value = true;
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refreshList();
};

const saveVideo = async (
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
    }
    if (image_id) {
      data.image_id = image_id;
    } else {
      data.image_id = file_id;
    }
    const response = await postVideo(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save video:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = (await ElMessageBox.prompt(
      t("video.prompt.message1"),
      t("video.prompt.message2"),
      {
        confirmButtonText: t("video.prompt.confirm"),
        cancelButtonText: t("video.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    )) as { value: string };
    await putVideo(item.id, { name: value });
    refreshList();
    ElMessage.success(t("video.prompt.success") + value);
  } catch {
    ElMessage.info(t("video.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("video.confirm.message1"),
      t("video.confirm.message2"),
      {
        confirmButtonText: t("video.confirm.confirm"),
        cancelButtonText: t("video.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteVideo(item.id);
    refreshList();
    ElMessage.success(t("video.confirm.success"));
  } catch {
    ElMessage.info(t("video.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped>
.video-index {
  padding: 20px;
}
</style>
