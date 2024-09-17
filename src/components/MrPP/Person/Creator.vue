<template>
  <el-dialog v-model="dialogVisible" :close-on-click-modal="false" width="70%">
    <template #header>
      {{ props.dialogTitle }}
    </template>
    <el-form
      ref="formRef"
      :rules="rules"
      :model="form"
      class="signup-form"
      label-width="auto"
    >
      <el-form-item
        :label="$t('manager.creator.form.label1')"
        prop="username"
        style="margin-bottom: 26px"
      >
        <el-input v-model="form.username" suffix-icon="el-icon-user"></el-input>
      </el-form-item>
      <el-form-item
        :label="$t('manager.creator.form.label2')"
        prop="password"
        style="margin-bottom: 26px"
      >
        <el-input
          v-model="form.password"
          autocomplete="off"
          suffix-icon="el-icon-lock"
          type="password"
        ></el-input>
      </el-form-item>
      <el-form-item
        :label="$t('manager.creator.form.label3')"
        prop="checkPassword"
        style="margin-bottom: 26px"
      >
        <el-input
          v-model="form.checkPassword"
          type="password"
          autocomplete="off"
          suffix-icon="el-icon-view"
        ></el-input>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">{{
        $t("manager.creator.form.cancel")
      }}</el-button>
      <el-button type="primary" @click="submitForm">{{
        $t("manager.creator.form.submit")
      }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { FormInstance } from "element-plus";
import { postPerson } from "@/api/v1/person";

const props = defineProps({
  dialogTitle: {
    type: String,
    default: "",
  },
  dialogSubmit: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["refresh"]);
const { t } = useI18n();

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  username: "",
  password: "",
  checkPassword: "",
});

const checkUsername = (rule: any, value: string, callback: any) => {
  form.username = value.replace(/[\u4E00-\u9FA5]/g, "");
  callback();
};

const validatePassword = (rule: any, value: string, callback: any) => {
  if (value === "") {
    callback(new Error(t("manager.creator.form.error1")));
  } else {
    if (form.checkPassword !== "") {
      formRef.value?.validateField("checkPassword");
    }
    callback();
  }
};

const checkPassword = (rule: any, value: string, callback: any) => {
  if (value === "") {
    callback(new Error(t("manager.creator.form.error2")));
  } else if (value !== form.password) {
    callback(new Error(t("manager.creator.form.error3")));
  } else {
    callback();
  }
};

const rules = {
  username: [
    {
      required: true,
      message: t("manager.creator.form.message1"),
      trigger: "blur",
    },
    { min: 5, message: t("manager.creator.form.message2"), trigger: "blur" },
    {
      validator: checkUsername,
      message: t("manager.creator.form.message3"),
      trigger: "change",
    },
  ],
  password: [
    {
      required: true,
      message: t("manager.creator.form.message4"),
      trigger: "blur",
    },
    { min: 6, message: t("manager.creator.form.message5"), trigger: "blur" },
    { validator: validatePassword, trigger: "blur" },
  ],
  checkPassword: [
    {
      required: true,
      message: t("manager.creator.form.message6"),
      trigger: "blur",
    },
    { validator: checkPassword, trigger: "blur" },
  ],
};

const submitForm = async () => {
  try {
    const valid = await formRef.value?.validate();
    if (valid) {
      await postPerson(form);
      emit("refresh");
      dialogVisible.value = false;
    } else {
      ElMessage.error(t("manager.creator.form.error4"));
    }
  } catch (error) {
    console.error("error submit:", error);
  }
};

const show = () => {
  dialogVisible.value = true;
};

const hide = () => {
  dialogVisible.value = false;
};

// onMounted(() => {
//   show();
// });

defineExpose({
  show,
});
</script>

<style scoped></style>
