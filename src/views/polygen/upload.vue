<template>
  <TransitionWrapper>
    <div>
      <mr-p-p-upload dir="polygen" :file-type="fileType" @save-resource="savePolygen">
        <div>{{ $t("polygen.uploadFile") }}</div>
      </mr-p-p-upload>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { postPolygen } from "@/api/v1/resources/index";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const fileType = ref(".glb");
const router = useRouter();

let completedCount = 0;
const savePolygen = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: () => void
) => {
  try {
    const response = await postPolygen({ name, file_id });
    if (response.data.id) {
      completedCount++;
      if (completedCount === totalFiles) {
        handleAllFilesUploaded(response.data.id);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    callback();
  }
};

// 多个文件上传后跳转到最后一个文件的查看页面
const handleAllFilesUploaded = async (lastFileId: number) => {
  await router.push({
    path: "/resource/polygen/view",
    query: { id: lastFileId },
  });
};
</script>
