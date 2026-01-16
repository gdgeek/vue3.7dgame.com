<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchMetas" wrapper-class="root" @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" @click="addMeta">
            <font-awesome-icon icon="plus"></font-awesome-icon>
            &nbsp;
            <span class="hidden-sm-and-down">{{ $t("meta.title") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card :item="item" type="实体" color="#3498db" :isMeta="true" @named="namedWindow"
          @deleted="deletedWindow">
          <template #enter>
            <el-button-group>
              <el-button type="primary" size="small" @click="openDetail(item.id)">
                {{ $t("common.open") }}
              </el-button>
              <el-button type="primary" :loading="copyLoadingMap.get(item.id)" size="small" icon="CopyDocument"
                @click="copyWindow(item)">
                <template #loading>
                  <div class="custom-loading">
                    <svg class="circular" viewBox="-10, -10, 50, 50">
                      <path class="path" d="
                        M 30 15
                        L 28 17
                        M 25.61 25.61
                        A 15 15, 0, 0, 1, 15 30
                        A 15 15, 0, 1, 1, 27.99 7.5
                        L 15 15
                      " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)" />
                    </svg>
                  </div>
                </template>
              </el-button>
            </el-button-group>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <el-dialog v-model="detailVisible" :title="$t('meta.edit')" width="80%" append-to-body destroy-on-close>
          <MetaDetail :metaId="currentMetaId" @changed="refreshList"></MetaDetail>
        </el-dialog>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { v4 as uuidv4 } from "uuid";
import CardListPage from "@/components/MrPP/CardListPage/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import MetaDetail from "@/components/Meta/MetaDetail.vue";
import {
  getMetas,
  postMeta,
  deleteMeta,
  putMeta,
  getMeta,
  putMetaCode,
} from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();
const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const copyLoadingMap = ref<Map<number, boolean>>(new Map());
const detailVisible = ref(false);
const currentMetaId = ref<number>(0);

const fetchMetas = async (params: FetchParams): Promise<FetchResponse> => {
  return await getMetas(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const openDetail = (id: number) => {
  currentMetaId.value = id;
  detailVisible.value = true;
};

const generateDefaultName = (prefix: string) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${prefix}_${dateStr}_${timeStr}`;
};

const addMeta = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("meta.create.namePlaceholder"),
      t("meta.create.title"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        closeOnClickModal: false,
        inputValue: generateDefaultName(t("meta.create.defaultName")),
        inputValidator: (val) => {
          if (!val || !val.trim()) {
            return t("meta.create.nameRequired");
          }
          return true;
        },
      }
    );

    const newMeta = {
      title: value.trim(),
      uuid: uuidv4(),
    };

    await postMeta(newMeta);
    refreshList();
    ElMessage.success(t("meta.create.success"));
  } catch {
    // User cancelled
  }
};

const copyWindow = async (item: metaInfo) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.title + " - Copy",
      }
    );
    await copy(item.id, value);
    ElMessage.success(t("meta.prompt.success") + value);
  } catch {
    ElMessage.info(t("meta.prompt.info"));
  }
};

const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id);
    const meta = response.data;

    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
      data: meta.data,
      info: meta.info,
      events: meta.events,
      prefab: meta.prefab,
    };

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    if (meta.metaCode) {
      await putMetaCode(newMetaId, {
        lua: meta.metaCode.lua,
        blockly: meta.metaCode.blockly || "",
      });
    }

    refreshList();
  } catch (error) {
    console.error(error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};

const namedWindow = async (item: { id: string; title: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.title,
      }
    );
    await putMeta(item.id, { title: value });
    refreshList();
    ElMessage.success(t("meta.prompt.success") + value);
  } catch {
    ElMessage.info(t("meta.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteMeta(item.id);
    refreshList();
    ElMessage.success(t("meta.confirm.success"));
  } catch {
    ElMessage.info(t("meta.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped>
.root {
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
