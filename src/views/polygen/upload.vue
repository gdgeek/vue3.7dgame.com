<template>
  <div>
    <mr-p-p-upload
      dir="polygen"
      :file-type="fileType"
      @save-resource="savePolygen"
      @all-files-uploaded="handleAllFilesUploaded"
    >
      <div>{{ $t("polygen.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { postPolygen } from "@/api/resources/index";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";

const fileType = ref(".glb");
const router = useRouter();

// 记录所有文件的上传结果
const uploadedFileIds: number[] = [];

const savePolygen = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postPolygen({ name, file_id });
    uploadedFileIds.push(response.data.id);
  } catch (err) {
    console.error(err);
  } finally {
    callback();
  }
};

// 监听所有文件上传完成事件
const handleAllFilesUploaded = () => {
  if (uploadedFileIds.length > 0) {
    // 跳转到最后一个文件的查看页面
    const lastFileId = uploadedFileIds[uploadedFileIds.length - 1];
    router.push({
      path: "/resource/polygen/view",
      query: { id: lastFileId },
    });
  }
};
</script>
