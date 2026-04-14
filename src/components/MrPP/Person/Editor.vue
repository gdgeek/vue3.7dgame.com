<template>
  <el-dialog v-model="dialogVisible" :close-on-click-modal="false" width="520px">
    <template #header>
      {{ t("manager.editor.title") }}
    </template>
    <el-form ref="formRef" :model="form" label-width="auto">
      <el-form-item :label="t('manager.editor.form.username')">
        <el-input v-model="form.username" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('manager.editor.form.nickname')">
        <el-input v-model="form.nickname"></el-input>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">
        {{ t("manager.editor.form.cancel") }}
      </el-button>
      <el-button type="primary" @click="submitForm">
        {{ t("manager.editor.form.submit") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance } from "element-plus";
import { putPersonNickname } from "@/api/v1/person";

type EditableUser = {
  id: number;
  username: string;
  nickname?: string | null;
};

const emit = defineEmits(["refresh"]);
const { t } = useI18n();

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<EditableUser>({
  id: 0,
  username: "",
  nickname: "",
});

const show = (user: EditableUser) => {
  form.id = user.id;
  form.username = user.username;
  form.nickname = user.nickname ?? "";
  dialogVisible.value = true;
};

const submitForm = async () => {
  const valid = await formRef.value?.validate();
  if (valid === false) return;

  try {
    await putPersonNickname(form.id, {
      nickname: form.nickname?.trim?.() ?? "",
    });
    ElMessage.success(t("common.updateSuccess"));
    dialogVisible.value = false;
    emit("refresh");
  } catch {
    ElMessage.error(t("common.updateFailed"));
  }
};

defineExpose({
  show,
});
</script>
