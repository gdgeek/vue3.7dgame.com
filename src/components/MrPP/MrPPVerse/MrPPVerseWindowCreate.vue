<template>
  <el-dialog v-model="dialogVisible" append-to-body :close-on-click-modal="false" width="70%"
    @keydown.enter="submitForm">
    <template #header>
      {{ dialogTitle }}
    </template>
    <el-form ref="formRef" :rules="rules" :model="info" label-width="auto">
      <el-form-item :label="$t('verse.page.form.picture')">
        <mr-p-p-cropper ref="image" :image-url="info.url || null" :file-name="'verse.picture'"
          @save-file="saveFile"></mr-p-p-cropper>
      </el-form-item>
      <el-form-item prop="name" :label="$t('verse.page.form.name')">
        <el-input v-model="info.name"></el-input>
      </el-form-item>

      <el-form-item :label="$t('verse.page.form.description')">
        <el-input v-model="info.description" type="textarea"></el-input>
      </el-form-item>

      <el-form-item v-if="isManager" :label="$t('verse.page.form.course')">
        <el-input v-model="info.course" type="number"></el-input>
      </el-form-item>

      <!-- 载入截图组件 -->
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">{{
          $t("verse.page.form.cancel")
          }}</el-button>
        <el-button type="primary" @click="submitForm">
          {{ props.dialogSubmit }}
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

const { t } = useI18n();
const props = defineProps({
  dialogTitle: String,
  dialogSubmit: String,
});

const dialogTitle = computed(
  () => props.dialogTitle || t("verse.page.form.dialogTitle")
);
const dialogSubmit = computed(
  () => props.dialogSubmit || t("verse.page.form.dialogSubmit")
);

const emit = defineEmits(["submit"]);

const dialogVisible = ref(false);
// const imageUrl = ref<string | null>(null);
const imageId = ref<number | null>(null);
const item = ref<VerseData>();

const isManager = computed(
  () => {
    const userInfo = useUserStore().userInfo;
    if (userInfo === null || userInfo.roles === null) {
      return false;
    }
    return (userInfo.roles.includes("manager") ||
      userInfo.roles.includes("admin") ||
      userInfo.roles.includes("root"))
  }
);

const info = ref({
  url: "",
  name: "",
  description: "",
  course: -1,
});

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

// 监听item变化，更新info
watchEffect(() => {
  if (item.value) {
    info.value.name = item.value.name;
    info.value.url = item.value.image?.url;
    const parsedInfo = JSON.parse(item.value.info!);
    if (parsedInfo !== null) {
      info.value.description = parsedInfo.description;
      info.value.course = parsedInfo.course;
    }
  }
});

const formRef = ref<FormInstance>();
const submitForm = async () => {
  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      emit("submit", info.value, imageId.value);
    } else {
      ElMessage.error(t("verse.page.form.error"));
    }
  });
};

const show = (selectedItem: any) => {
  item.value = selectedItem;
  console.log("selectedItem", selectedItem);
  if (item.value?.image) {
    setTimeout(() => {
      const imageComponent = ref<any>(null);
      imageComponent.value = item.value?.image.url;
    }, 0);
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
