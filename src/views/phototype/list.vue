<template>
  <TransitionWrapper>
    <CardListPage
      ref="cardListPageRef"
      :fetch-data="fetchPhototypes"
      wrapper-class="phototype-list"
      @refresh="handleRefresh"
    >
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
            <span class="hidden-sm-and-down">{{
              $t("phototype.fromModel")
            }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <mr-p-p-card
          :item="item"
          type="预制体"
          color="#8e44ad"
          @named="namedWindow"
          @deleted="deletedWindow"
        >
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

    <!-- Edit Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      :title="$t('common.edit') || 'Edit'"
      width="500px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item :label="$t('phototype.prompt.message2') || 'Name'">
          <el-input
            v-model="editForm.title"
            :placeholder="$t('phototype.prompt.message1')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('resource.type.picture') || 'Image'">
          <ImageSelector
            :item-id="Number(editForm.id) || null"
            :image-url="editForm.image_url"
            @image-selected="handleEditImageSelected"
            @image-upload-success="handleEditImageSelected"
          ></ImageSelector>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">{{
            $t("common.cancel") || "Cancel"
          }}</el-button>
          <el-button type="primary" @click="saveEdit">{{
            $t("common.confirm") || "Confirm"
          }}</el-button>
        </span>
      </template>
    </el-dialog>
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
import {
  getPhototypes,
  postPhototype,
  deletePhototype,
  putPhototype,
} from "@/api/v1/phototype";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import type { PhototypeType } from "@/api/v1/phototype";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();
const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const fetchPhototypes = async (params: FetchParams): Promise<FetchResponse> => {
  return await getPhototypes(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => {};

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const edit = (id: number) => {
  router.push({ path: "/phototype/edit", query: { id } });
};

const addPrefab = () => {
  router.push("/phototype/edit");
};

const addPrefabFromPolygen = () => {
  router.push("/phototype/fromModel");
};

const editDialogVisible = ref(false);
const editForm = ref({
  id: "",
  title: "",
  image_id: 0,
  image_url: "",
});

const namedWindow = (item: any) => {
  editForm.value = {
    id: item.id,
    title: item.title || item.name,
    image_id: item.image?.id || 0,
    image_url: item.image?.url || "",
  };
  editDialogVisible.value = true;
};

const handleEditImageSelected = (data: {
  imageId: number;
  imageUrl?: string;
}) => {
  editForm.value.image_id = data.imageId;
  if (data.imageUrl) {
    editForm.value.image_url = data.imageUrl;
  }
};

const saveEdit = async () => {
  try {
    if (!editForm.value.title) {
      ElMessage.warning(t("phototype.prompt.error1")); // Name cannot be empty
      return;
    }

    const updateData: any = {
      title: editForm.value.title,
    };

    if (editForm.value.image_id) {
      updateData.image_id = editForm.value.image_id;
    }

    await putPhototype(editForm.value.id, updateData);

    ElMessage.success(t("common.updateSuccess") || "Update Successful");
    editDialogVisible.value = false;
    refreshList();
  } catch (error) {
    console.error("Failed to update:", error);
    ElMessage.error(t("common.updateFailed") || "Update Failed");
  }
};

const deletedWindow = async (
  item: { id: string },
  resetLoading: () => void
) => {
  try {
    await ElMessageBox.confirm(
      t("phototype.confirm.message1"),
      t("phototype.confirm.message2"),
      {
        confirmButtonText: t("phototype.confirm.confirm"),
        cancelButtonText: t("phototype.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePhototype(item.id);
    refreshList();
    ElMessage.success(t("phototype.confirm.success"));
  } catch {
    ElMessage.info(t("phototype.confirm.info"));
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
