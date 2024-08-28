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
      label-width="80px"
    >
      <el-form-item label="用户名" prop="username" style="margin-bottom: 26px">
        <el-input v-model="form.username" suffix-icon="el-icon-user"></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password" style="margin-bottom: 26px">
        <el-input
          v-model="form.password"
          autocomplete="off"
          suffix-icon="el-icon-lock"
          type="password"
        ></el-input>
      </el-form-item>
      <el-form-item
        label="确认密码"
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
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="submitForm">注册账号</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { FormInstance } from "element-plus";
import { postPerson } from "@/api/v1/person";

const props = defineProps({
  dialogTitle: {
    type: String,
    default: "选择文件",
  },
  dialogSubmit: {
    type: String,
    default: "确定",
  },
});

const emit = defineEmits(["refresh"]);

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
    callback(new Error("请输入密码"));
  } else {
    if (form.checkPassword !== "") {
      formRef.value?.validateField("checkPassword");
    }
    callback();
  }
};

const checkPassword = (rule: any, value: string, callback: any) => {
  if (value === "") {
    callback(new Error("请再次输入密码"));
  } else if (value !== form.password) {
    callback(new Error("两次输入密码不一致!"));
  } else {
    callback();
  }
};

const rules = {
  username: [
    { required: true, message: "请输入用户名称", trigger: "blur" },
    { min: 5, message: "用户名称长度应该大于5", trigger: "blur" },
    {
      validator: checkUsername,
      message: "用户名请避免使用中文",
      trigger: "change",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度应该大于6", trigger: "blur" },
    { validator: validatePassword, trigger: "blur" },
  ],
  checkPassword: [
    { required: true, message: "请输入校验密码", trigger: "blur" },
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
      ElMessage.error("表单校验失败");
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

onMounted(() => {
  show();
});

defineExpose({
  show,
});
</script>

<style scoped></style>
