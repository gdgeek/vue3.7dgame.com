<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchPhototypes" wrapper-class="phototype-list"
      @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" @click="addPrefab">
            <font-awesome-icon icon="plus"></font-awesome-icon>
            &nbsp;
            <span class="hidden-sm-and-down">{{ $t("phototype.create") }}</span>
          </el-button>
          <el-button size="small" type="primary" @click="addPrefabFromPolygen">
            <font-awesome-icon icon="apple-alt"></font-awesome-icon>
            &nbsp;
            <span class="hidden-sm-and-down">{{ $t("phototype.fromModel") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card :item="item" type="预制体" color="#8e44ad" @named="namedWindow" @deleted="deletedWindow">
          <template #enter>
            <el-button-group>
              <el-button type="primary" size="small" @click="edit(item.id)">
                {{ $t("meta.enter") }}
              </el-button>
            </el-button-group>
          </template>
        </mr-p-p-card>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import MrPPCard from '@/components/MrPP/MrPPCard/index.vue';
import TransitionWrapper from '@/components/TransitionWrapper.vue';
import { getPhototypes, postPhototype, deletePhototype, putPhototype } from '@/api/v1/phototype';
import type { PhototypeType } from '@/api/v1/phototype';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const fetchPhototypes = async (params: FetchParams): Promise<FetchResponse> => {
  return await getPhototypes(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const edit = (id: number) => {
  router.push({ path: '/phototype/edit', query: { id } });
};

const addPrefab = () => {
  router.push('/phototype/edit');
};

const addPrefabFromPolygen = () => {
  router.push('/phototype/fromModel');
};

const namedWindow = async (item: { id: string; title: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t('phototype.prompt.message1'),
      t('phototype.prompt.message2'),
      {
        confirmButtonText: t('phototype.prompt.confirm'),
        cancelButtonText: t('phototype.prompt.cancel'),
        closeOnClickModal: false,
        inputValue: item.title,
      }
    );
    await putPhototype(item.id, { title: value });
    refreshList();
    ElMessage.success(t('phototype.prompt.success') + value);
  } catch {
    ElMessage.info(t('phototype.prompt.info'));
  }
};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t('phototype.confirm.message1'),
      t('phototype.confirm.message2'),
      {
        confirmButtonText: t('phototype.confirm.confirm'),
        cancelButtonText: t('phototype.confirm.cancel'),
        closeOnClickModal: false,
        type: 'warning',
      }
    );
    await deletePhototype(item.id);
    refreshList();
    ElMessage.success(t('phototype.confirm.success'));
  } catch {
    ElMessage.info(t('phototype.confirm.info'));
    resetLoading();
  }
};
</script>

<style scoped>
.phototype-list {
  padding: 20px;
}

.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
}

.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

.clearfix {
  display: flex;
  justify-content: flex-end;
}

.el-button .custom-loading .circular {
  margin-right: 6px;
  width: 18px;
  height: 18px;
  animation: loading-rotate 2s linear infinite;
}

.el-button .custom-loading .circular .path {
  animation: loading-dash 1.5s ease-in-out infinite;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-width: 2;
  stroke: var(--el-button-text-color);
  stroke-linecap: round;
}
</style>
