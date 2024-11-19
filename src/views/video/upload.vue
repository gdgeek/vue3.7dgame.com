<template>
  <div>
    <mr-p-p-upload
      dir="video"
      :file-type="fileType"
      @save-resource="saveVideo"
      @all-files-uploaded="handleAllFilesUploaded"
    >
      <div>{{ $t("video.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postVideo } from "@/api/resources/index";

// 定义允许的文件类型
const fileType = ref("video/mp4, video/ogg");
const router = useRouter();

// 记录所有文件的上传结果
const uploadedFileIds: number[] = [];

// 视频保存
const saveVideo = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postVideo({ name, file_id });
    // 将文件 ID 存储到数组中
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
      path: "/resource/video/view",
      query: { id: lastFileId },
    });
  }
};
</script>
