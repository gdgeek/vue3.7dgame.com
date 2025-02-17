<template>
  <div>
    <mr-p-p-upload dir="video" :file-type="fileType" @save-resource="saveVideo">
      <div>{{ $t("video.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postVideo } from "@/api/v1/resources/index";

// 定义允许的文件类型
const fileType = ref("video/mp4, video/ogg");
const router = useRouter();

let completedCount = 0;

// 视频保存
const saveVideo = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: () => void
) => {
  try {
    const response = await postVideo({ name, file_id });
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
    path: "/resource/video/view",
    query: { id: lastFileId },
  });
};
</script>
