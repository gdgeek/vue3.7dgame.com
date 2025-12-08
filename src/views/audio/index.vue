<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchAudios" wrapper-class="audio-index" @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
            <span class="hidden-sm-and-down">{{ $t("audio.uploadAudio") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card :item="item" @named="namedWindow" @deleted="deletedWindow">
          <template #enter>
            <el-button v-if="item.info === null" type="warning" size="small" @click="handleViewAudio(item.id)">
              {{ $t("audio.initializeAudioData") }}
            </el-button>
            <el-button v-else type="primary" size="small" @click="handleViewAudio(item.id)">
              {{ $t("audio.viewAudio") }}
            </el-button>
          </template>
          <template #overlay>
            <el-button type="primary" circle size="large" @click.stop="handleViewAudio(item.id, true)">
              <el-icon :size="30">
                <VideoPlay />
              </el-icon>
            </el-button>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="audio" :file-type="fileType" :max-size="5"
          @save-resource="saveAudio" @success="handleUploadSuccess">
          {{ $t("audio.uploadFile") }}
        </mr-p-p-upload-dialog>

        <audio-dialog v-model="viewDialogVisible" :audio-id="currentAudioId" :auto-play="autoPlay"
          @deleted="handleDeleted" @renamed="handleRenamed" />
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { VideoPlay } from '@element-plus/icons-vue';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import MrPPUploadDialog from '@/components/MrPP/MrPPUploadDialog/index.vue';
import AudioDialog from '@/components/MrPP/AudioDialog/index.vue';
import TransitionWrapper from '@/components/TransitionWrapper.vue';
import { getAudios, putAudio, deleteAudio, postAudio } from '@/api/v1/resources/index';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const uploadDialogVisible = ref(false);
const fileType = ref('audio/mp3, audio/wav');
const viewDialogVisible = ref(false);
const currentAudioId = ref<number | null>(null);
const autoPlay = ref(false);

const fetchAudios = async (params: FetchParams): Promise<FetchResponse> => {
  return await getAudios(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => {
  // Custom logic if needed
};

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const handleViewAudio = (id: number, play: boolean = false) => {
  currentAudioId.value = id;
  autoPlay.value = play;
  viewDialogVisible.value = true;
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refreshList();
};

const saveAudio = async (
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
    }
    const response = await postAudio(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error('Failed to save audio:', err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t('audio.prompt.message1'),
      t('audio.prompt.message2'),
      {
        confirmButtonText: t('audio.prompt.confirm'),
        cancelButtonText: t('audio.prompt.cancel'),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await putAudio(item.id, { name: value });
    refreshList();
    ElMessage.success(t('audio.prompt.success') + value);
  } catch {
    ElMessage.info(t('audio.prompt.info'));
  }
};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('audio.confirm.message1'),
      t('audio.confirm.message2'),
      {
        confirmButtonText: t('audio.confirm.confirm'),
        cancelButtonText: t('audio.confirm.cancel'),
        closeOnClickModal: false,
        type: 'warning',
      }
    );
    await deleteAudio(item.id);
    refreshList();
    ElMessage.success(t('audio.confirm.success'));
  } catch {
    ElMessage.info(t('audio.confirm.info'));
    resetLoading();
  }
};

const handleDeleted = () => {
  refreshList();
};

const handleRenamed = () => {
  refreshList();
};
</script>

<style scoped>
.audio-index {
  padding: 20px;
}
</style>
