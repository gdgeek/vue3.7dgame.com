<template>
  <el-dialog
    :title="props.dialogTitle"
    v-model:visible="dialogVisible"
    :close-on-click-modal="false"
    width="70%"
  >
    <el-form ref="info" :rules="rules" :model="info" label-width="80px">
      <el-form-item label="封面图片">
        <mr-p-p-cropper
          ref="image"
          :image-url="imageUrl"
          :file-name="'verse.picture'"
          @save-file="saveFile"
        ></mr-p-p-cropper>
      </el-form-item>
      <el-form-item prop="name" label="名称">
        <el-input v-model="info.name"></el-input>
      </el-form-item>

      <el-form-item label="内容说明">
        <el-input v-model="info.description" type="textarea"></el-input>
      </el-form-item>

      <el-form-item v-if="isManager" label="绑定教程">
        <el-input v-model="info.course" type="number"></el-input>
      </el-form-item>

      <!-- 载入截图组件 -->
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="submitForm('info')">
          {{ props.dialogSubmit }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import MrPPCropper from "@/components/MrPP/MrPPVerse/MrPPCropper.vue";
import env from "@/environment";
import { useUserStore } from "@/store/modules/user";

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

const emit = defineEmits(["submit"]);

const dialogVisible = ref(false);
const imageUrl = ref<string | null>(null);
const imageId = ref<number | null>(null);
const item = ref<any>(null);

const isManager = computed(() =>
  useUserStore().userInfo.roles.includes("root")
);

const info = ref({
  name: "",
  description: "",
  course: -1,
});

const rules = {
  name: [
    { required: true, message: "请输入活动名称", trigger: "blur" },
    { min: 3, max: 64, message: "长度在 3 到 64 个字符", trigger: "blur" },
  ],
};

const url = computed(() => {
  return imageUrl.value !== null ? env.replaceIP(imageUrl.value) : null;
});

const submitForm = async (formName: string) => {
  const formRef = ref<any>(null);
  formRef.value = formName;

  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      emit("submit", info.value, item.value, imageId.value);
    } else {
      console.log("error submit!!");
      return false;
    }
  });
};

const show = (selectedItem: any = null) => {
  item.value = selectedItem;

  if (item.value) {
    setTimeout(() => {
      const imageComponent = ref<any>(null);
      imageComponent.value = item.value.image.url;
    }, 0);

    info.value.name = item.value.name;

    const parsedInfo = JSON.parse(item.value.info);
    if (parsedInfo !== null) {
      info.value.description = parsedInfo.description;
      info.value.course = parsedInfo.course;
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

// onMounted(() => {
//   emit("show", show);
//   emit("hide", hide);
// });

defineExpose({
  show,
  hide,
});
</script>

<style scoped></style>
