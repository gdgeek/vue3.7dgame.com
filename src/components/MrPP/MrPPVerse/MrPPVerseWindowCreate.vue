<template>
  <el-dialog
    v-model="dialogVisible"
    append-to-body
    :close-on-click-modal="closeOnClickModal"
    width="70%"
    @keydown.enter="submitForm"
  >
    <template #header>
      {{ dialogTitle }}
    </template>
    <el-form ref="formRef" :rules="rules" :model="item" label-width="auto">
      <el-form-item :label="$t('verse.page.form.picture')">
        <ImageSelector
          :item-id="item.id"
          :image-url="item.image?.url"
          @image-selected="handleImageSelected"
          @image-upload-success="handleImageSelected"
        ></ImageSelector>
      </el-form-item>
      <el-form-item prop="name" :label="$t('verse.page.form.name')">
        <el-input v-model="item.name"></el-input>
      </el-form-item>

      <el-form-item :label="$t('verse.page.form.description')">
        <el-input v-model="item.description" type="textarea"></el-input>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">{{
          $t("verse.page.form.cancel")
        }}</el-button>
        <el-button type="primary" @click="submitForm">
          {{ dialogSubmit }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { VerseData } from "@/api/v1/verse";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { useUserStore } from "@/store/modules/user";
import { FormInstance, ElMessage } from "element-plus";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps({
  dialogTitle: String,
  dialogSubmit: String,
  closeOnClickModal: {
    type: Boolean,
    default: false,
  },
});

const dialogTitle = computed(
  () => props.dialogTitle || t("verse.page.form.dialogTitle")
);
const dialogSubmit = computed(
  () => props.dialogSubmit || t("verse.page.form.dialogSubmit")
);

const emit = defineEmits(["submit"]);

const dialogVisible = ref(false);
const imageId = ref<number | null>(null);

const item = ref<VerseData>({} as VerseData);

const rules = {
  name: [
    {
      required: true,
      message: t("verse.page.form.rules.message1"),
      trigger: "blur",
    },
    {
      min: 3,
      max: 64,
      message: t("verse.page.form.rules.message2"),
      trigger: "blur",
    },
  ],
};

const formRef = ref<FormInstance>();

const generateDefaultName = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${t("verse.create.defaultName")}_${dateStr}_${timeStr}`;
};

const submitForm = async () => {
  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      emit("submit", item.value, imageId.value);
    } else {
      ElMessage.error(t("verse.page.form.error"));
    }
  });
};

const show = (selected: VerseData | null = null) => {
  if (selected) {
    item.value = selected;
    // Reset imageId when opening dialog
    imageId.value = null;
  } else {
    // Creating new verse, set default name
    item.value = {
      name: generateDefaultName(),
      description: "",
    } as VerseData;
    imageId.value = null;
  }
  dialogVisible.value = true;
};

const hide = () => {
  dialogVisible.value = false;
};

const handleImageSelected = (data: {
  imageId: number;
  itemId: number | null;
  imageUrl?: string;
}) => {
  imageId.value = data.imageId;
  // Optionally update item.image.url for immediate feedback if needed,
  // but ImageSelector handles its own display.
  // Updating item.image ensures consistency if the dialog is reopened without saving?
  // Actually show() resets item from props, so this local update is just for current session.
  if (item.value && data.imageUrl) {
    if (!item.value.image) {
      item.value.image = { url: data.imageUrl, id: data.imageId } as any;
    } else {
      item.value.image.url = data.imageUrl;
      item.value.image.id = data.imageId;
    }
  }
};

defineExpose({
  show,
  hide,
});
</script>

<style scoped></style>
