<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="100px"
    class="demo-ruleForm"
  >
    <el-form-item label="标题" prop="title">
      <el-input v-model="form.title"></el-input>
    </el-form-item>

    <el-form-item label="内容" prop="body">
      <vue-editor
        id="edit"
        v-model="form.body"
        :editor-toolbar="customToolbar"
        style="width: 100%"
      ></vue-editor>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" :disabled="isDisabled" @click="submitForm"
        >提交</el-button
      >
      <el-button @click="resetForm">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { MessageType } from "@/api/v1/message";
import { FormInstance } from "element-plus";
import { VueEditor } from "vue3-editor";

const props = defineProps<{ data: MessageType | null }>();
const emit = defineEmits<{
  (e: "post", data: { title: string; body: string }): void;
}>();

const formRef = ref<FormInstance>();
const isDisabled = ref(false);

const customToolbar = [
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["code-block"],
];

const form = ref({
  title: "",
  body: "",
});

const rules = {
  title: [
    { required: true, message: "请输入标题", trigger: "blur" },
    { min: 3, max: 100, message: "长度在 3 到 100 个字符", trigger: "blur" },
  ],
  body: [
    { required: true, message: "请填写内容", trigger: "blur" },
    { min: 10, message: "长度至少10个字符", trigger: "blur" },
  ],
};

onMounted(() => {
  if (props.data !== null) {
    form.value.title = props.data.title;
    form.value.body = props.data.body;
  }
});

const submitForm = async () => {
  isDisabled.value = true;
  await new Promise((resolve) => setTimeout(resolve, 3000)); // 点击后等待3秒后才能再次点击

  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      emit("post", form.value);
      ElMessage({
        message: "发帖成功",
        type: "success",
      });
    } else {
      console.log("error submit!!");
    }
    isDisabled.value = false;
  });
};

const resetForm = () => {
  formRef.value?.resetFields();
};
</script>
