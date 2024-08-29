<template>
  <div>
    <mr-p-p-upload
      dir="polygen"
      :file-type="fileType"
      @save-resource="savePolygen"
    >
      <div>{{ $t("polygen.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { postPolygen } from "@/api/resources/index";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";

// 定义允许的文件类型
const fileType = ref(".glb");
const router = useRouter();

// 模型保存
const savePolygen = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postPolygen({ name, file_id });
    // 跳转到图片查看页面，并传递图片 ID
    router.push({
      path: "/resource/polygen/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.error(err);
  }
  callback();
};
</script>
