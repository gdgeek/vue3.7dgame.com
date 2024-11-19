<template>
  <div>
    <mr-p-p-upload
      dir="audio"
      :file-type="fileType"
      @save-resource="saveAudio"
      @all-files-uploaded="handleAllFilesUploaded"
    >
      <div>{{ $t("audio.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postAudio } from "@/api/resources/index";

const fileType = ref("audio/mp3, audio/wav");
const router = useRouter();

// 记录所有文件的上传结果
const uploadedFileIds: number[] = [];

// 音频保存
const saveAudio = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postAudio({ name, file_id });
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
      path: "/resource/audio/view",
      query: { id: lastFileId },
    });
  }
};
</script>
