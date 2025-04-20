<template>
  <el-dialog v-model="dialogVisible" append-to-body :close-on-click-modal="closeOnClickModal" width="70%"
    @keydown.enter="submitForm">
    <template #header>
      {{ dialogTitle }}
    </template>
    <el-form ref="formRef" :rules="rules" :model="item" label-width="auto">
      <el-form-item :label="$t('verse.page.form.picture')">
        <mr-p-p-cropper ref="image" :image-url="item.image?.url || null" :file-name="'verse.picture'"
          @save-file="saveFile"></mr-p-p-cropper>
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
import MrPPCropper from "@/components/MrPP/MrPPVerse/MrPPCropper.vue";
import { useUserStore } from "@/store/modules/user";
import { FormInstance } from "element-plus";
import { ref, computed, defineProps, defineEmits } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
  dialogTitle: String,
  dialogSubmit: String,
  closeOnClickModal: {
    type: Boolean,
    default: false
  }
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
    if (item.value?.image) {
      setTimeout(() => {
        const imageComponent = ref<any>(null);
        imageComponent.value = item.value?.image.url;
      }, 0);
    }
  }
  dialogVisible.value = true;
};

const hide = () => {
  dialogVisible.value = false;
};

const saveFile = (newImageId: number) => {
  imageId.value = newImageId;
};

defineExpose({
  show,
  hide,
});
</script>

<style scoped></style>
