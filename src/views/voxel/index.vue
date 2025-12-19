<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchVoxels" wrapper-class="voxel-index" @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" icon="UploadFilled" @click="openUploadDialog">
            <span class="hidden-sm-and-down">{{ $t("voxel.uploadVoxel") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <MrPPCard :item="item" type="体素" color="#9b59b6" @named="namedWindow" @deleted="deletedWindow">
          <template #enter>
            <router-link :to="`/resource/voxel/view?id=${item.id}`">
              <el-button-group :inline="true">
                <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                  {{ $t("voxel.initializeVoxelData") }}
                </el-button>
                <el-button v-else type="primary" size="small">
                  {{ $t("voxel.viewVoxel") }}
                </el-button>
              </el-button-group>
            </router-link>
          </template>
        </MrPPCard>
      </template>

      <template #dialogs>
        <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="voxel" :file-type="fileType" @save-resource="saveVoxel"
          @success="handleUploadSuccess">
          {{ $t("voxel.uploadFile") }}
        </mr-p-p-upload-dialog>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import MrPPUploadDialog from '@/components/MrPP/MrPPUploadDialog/index.vue';
import TransitionWrapper from '@/components/TransitionWrapper.vue';
import { getVoxels, putVoxel, deleteVoxel, postVoxel } from '@/api/v1/resources/index';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const uploadDialogVisible = ref(false);
const fileType = ref('.vox');

const fetchVoxels = async (params: FetchParams): Promise<FetchResponse> => {
  return await getVoxels(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refreshList();
};

const saveVoxel = async (
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
    const response = await postVoxel(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error('Failed to save voxel:', err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t('voxel.prompt.message1'),
      t('voxel.prompt.message2'),
      {
        confirmButtonText: t('voxel.prompt.confirm'),
        cancelButtonText: t('voxel.prompt.cancel'),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await putVoxel(item.id, { name: value });
    refreshList();
    ElMessage.success(t('voxel.prompt.success') + value);
  } catch {
    ElMessage.info(t('voxel.prompt.info'));
  }
};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('voxel.confirm.message1'),
      t('voxel.confirm.message2'),
      {
        confirmButtonText: t('voxel.confirm.confirm'),
        cancelButtonText: t('voxel.confirm.cancel'),
        closeOnClickModal: false,
        type: 'warning',
      }
    );
    await deleteVoxel(item.id);
    refreshList();
    ElMessage.success(t('voxel.confirm.success'));
  } catch {
    ElMessage.info(t('voxel.confirm.info'));
    resetLoading();
  }
};
</script>

<style scoped lang="scss">
.voxel-index {
  padding: 20px;
}
</style>
