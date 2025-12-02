<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchParticles" wrapper-class="particle-index"
      @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
            <span class="hidden-sm-and-down">{{ $t("particle.uploadParticle") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card :item="item" @named="namedWindow" @deleted="deletedWindow">
          <template #enter>
            <router-link :to="`/resource/particle/view?id=${item.id}`">
              <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                {{ $t("particle.initializeParticleData") }}
              </el-button>
              <el-button v-else type="primary" size="small">
                {{ $t("particle.viewParticle") }}
              </el-button>
            </router-link>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="particle" :file-type="fileType"
          :show-effect-type-select="true" @save-resource="saveParticle" @success="handleUploadSuccess">
          {{ $t("particle.uploadFile") }}
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
import { getParticles, putParticle, deleteParticle, postParticle } from '@/api/v1/resources/index';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const uploadDialogVisible = ref(false);
const fileType = ref('.json');

const fetchParticles = async (params: FetchParams): Promise<FetchResponse> => {
  return await getParticles(params.sort, params.search, params.page);
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

const saveParticle = async (
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
    if (effectType) {
      data.effect_type = effectType;
    }
    if (info) {
      data.info = info;
    }
    if (image_id) {
      data.image_id = image_id;
    }
    const response = await postParticle(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error('Failed to save particle:', err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t('particle.prompt.message1'),
      t('particle.prompt.message2'),
      {
        confirmButtonText: t('particle.prompt.confirm'),
        cancelButtonText: t('particle.prompt.cancel'),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await putParticle(item.id, { name: value });
    refreshList();
    ElMessage.success(t('particle.prompt.success') + value);
  } catch {
    ElMessage.info(t('particle.prompt.info'));
  }
};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('particle.confirm.message1'),
      t('particle.confirm.message2'),
      {
        confirmButtonText: t('particle.confirm.confirm'),
        cancelButtonText: t('particle.confirm.cancel'),
        closeOnClickModal: false,
        type: 'warning',
      }
    );
    await deleteParticle(item.id);
    refreshList();
    ElMessage.success(t('particle.confirm.success'));
  } catch {
    ElMessage.info(t('particle.confirm.info'));
    resetLoading();
  }
};
</script>

<style scoped>
.particle-index {
  padding: 20px;
}
</style>
