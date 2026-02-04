<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchPolygens" wrapper-class="polygen-index"
      @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
            <span class="hidden-sm-and-down">{{
              $t("polygen.uploadPolygen")
              }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card :item="item" type="模型" color="#2ecc71" @named="namedWindow" @deleted="deletedWindow">
          <template #info>
            <PolygenView :file="item.file" @progress="progress"></PolygenView>
            <el-progress v-if="percentage === 100" :percentage="100" status="success"></el-progress>
            <el-progress v-else :percentage="percentage"></el-progress>
          </template>
          <template #enter>
            <el-button-group :inline="true">
              <el-button v-if="item.info === null" type="warning" size="small" @click="openViewDialog(item.id)">
                {{ $t("polygen.initializePolygenData") }}
              </el-button>
              <el-button v-else type="primary" size="small" @click="openViewDialog(item.id)">
                {{ $t("polygen.viewPolygen") }}
              </el-button>
            </el-button-group>
          </template>
        </mr-p-p-card>
      </template>

      <template #dialogs>
        <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="polygen" :file-type="fileType" :max-size="100"
          @save-resource="savePolygen" @success="handleUploadSuccess">
          {{ $t("polygen.uploadFile") }}
        </mr-p-p-upload-dialog>

        <PolygenDialog v-model="viewDialogVisible" :id="currentPolygenId" @refresh="refreshList" @deleted="refreshList">
        </PolygenDialog>
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
import PolygenDialog from "@/components/MrPP/PolygenDialog.vue";
import PolygenView from "@/components/PolygenView.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getPolygens,
  putPolygen,
  deletePolygen,
  postPolygen,
} from "@/api/v1/resources/index";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const uploadDialogVisible = ref(false);
const fileType = ref(".glb, .gltf, .obj, .fbx");
const viewDialogVisible = ref(false);
const currentPolygenId = ref<number | null>(null);
const percentage = ref(0);

const fetchPolygens = async (params: FetchParams): Promise<FetchResponse> => {
  return await getPolygens(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const openViewDialog = (id: number) => {
  currentPolygenId.value = id;
  viewDialogVisible.value = true;
};

const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;
  refreshList();
};

const progress = (value: number) => {
  percentage.value = value;
};

const savePolygen = async (
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
    const response = await postPolygen(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save polygen:", err);
    callback(-1);
  }
};

const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("polygen.prompt.message1"),
      t("polygen.prompt.message2"),
      {
        confirmButtonText: t("polygen.prompt.confirm"),
        cancelButtonText: t("polygen.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await putPolygen(item.id, { name: value });
    refreshList();
    ElMessage.success(t("polygen.prompt.success") + value);
  } catch {
    ElMessage.info(t("polygen.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("polygen.confirm.message1"),
      t("polygen.confirm.message2"),
      {
        confirmButtonText: t("polygen.confirm.confirm"),
        cancelButtonText: t("polygen.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePolygen(item.id);
    refreshList();
    ElMessage.success(t("polygen.confirm.success"));
  } catch {
    ElMessage.info(t("polygen.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped lang="scss">
.polygen-index {
  padding: 20px;
}
</style>
