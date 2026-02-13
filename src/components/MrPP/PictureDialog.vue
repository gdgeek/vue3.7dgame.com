<template>
  <el-dialog
    v-model="visible"
    :title="$t('picture.view.title')"
    width="80%"
    append-to-body
    destroy-on-close
    @closed="handleClose"
  >
    <div class="document-index" v-loading="loading">
      <el-row :gutter="20">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <span v-if="pictureData">{{ pictureData.name }}</span>
            </template>
            <div
              class="box-item"
              style="
                text-align: center;
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
              v-loading="imageLoading"
            >
              <img
                v-show="!imageLoading"
                id="image"
                ref="image"
                style="height: 300px; width: auto"
                :src="picture"
                fit="contain"
                @load="onImageLoad"
                @error="onImageError"
              />
            </div>
          </el-card>
          <br />
        </el-col>

        <el-col :sm="8">
          <MrppInfo
            v-if="pictureData"
            :title="$t('picture.view.info.title')"
            titleSuffix=" :"
            :tableData="tableData"
            :itemLabel="$t('picture.view.info.label1')"
            :textLabel="$t('picture.view.info.label2')"
            :downloadText="$t('picture.view.info.download')"
            :renameText="$t('picture.view.info.name')"
            :deleteText="$t('picture.view.info.delete')"
            @download="downloadPicture"
            @rename="namedWindow"
            @delete="deleteWindow"
          ></MrppInfo>
          <br />
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  getPicture,
  putPicture,
  deletePicture,
} from "@/api/v1/resources/index";
import { convertToHttps, printVector2 } from "@/assets/js/helper";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  modelValue: boolean;
  id: number | null;
}>();

const emit = defineEmits(["update:modelValue", "refresh", "deleted"]);

const { t } = useI18n();
const pictureData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const loading = ref(false);
const imageLoading = ref(false);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const prepare = computed(
  () => pictureData.value !== null && pictureData.value.info !== null
);

const tableData = computed(() => {
  if (pictureData.value && prepare.value) {
    return [
      { item: t("picture.view.info.item1"), text: pictureData.value.name },
      {
        item: t("picture.view.info.item2"),
        text:
          pictureData.value.author?.nickname ||
          pictureData.value.author?.username ||
          "—",
      },
      {
        item: t("picture.view.info.item3"),
        text: convertToLocalTime(pictureData.value.created_at),
      },
      {
        item: t("picture.view.info.item5"),
        text: printVector2(JSON.parse(pictureData.value.info).size),
      },
      {
        item: t("picture.view.info.item4"),
        text: formatFileSize(pictureData.value.file.size),
      },
    ];
  }
  return [];
});

const picture = computed(() => (file.value ? convertToHttps(file.value) : ""));

const onImageLoad = () => {
  imageLoading.value = false;
};

const onImageError = () => {
  imageLoading.value = false;
};

const downloadPicture = async () => {
  if (!pictureData.value) return;

  const fileName = pictureData.value.file.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".jpg";
  await downloadResource(
    {
      name: pictureData.value.name || "image",
      file: pictureData.value.file,
    },
    fileExt,
    t,
    "picture.view.download"
  );
};

const loadData = async () => {
  if (!props.id) return;
  loading.value = true;
  imageLoading.value = true;
  try {
    const response = await getPicture(props.id);
    pictureData.value = response.data;
    file.value = response.data.file.url;
  } catch (err) {
    ElMessage.error(String(err));
    imageLoading.value = false;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadData();
    }
  }
);

const handleClose = () => {
  pictureData.value = null;
  file.value = null;
};

const deleteWindow = async () => {
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

    if (pictureData.value) {
      await deletePicture(pictureData.value.id);
      ElMessage.success(t("picture.confirm.success"));
      emit("deleted");
      visible.value = false;
    }
  } catch {
    ElMessage.info(t("picture.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = (await ElMessageBox.prompt(
      t("picture.view.namePrompt.message1"),
      t("picture.view.namePrompt.message2"),
      {
        confirmButtonText: t("picture.view.namePrompt.confirm"),
        cancelButtonText: t("picture.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: pictureData.value!.name,
      }
    )) as { value: string };

    if (value) {
      const response = await putPicture(pictureData.value!.id, { name: value });
      pictureData.value!.name = response.data.name;
      ElMessage.success(t("picture.view.namePrompt.success") + value);
      emit("refresh");
    } else {
      ElMessage.info(t("picture.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("picture.view.namePrompt.info"));
  }
};
</script>

<style lang="scss" scoped>
.document-index {
  padding: 10px;
}
</style>
