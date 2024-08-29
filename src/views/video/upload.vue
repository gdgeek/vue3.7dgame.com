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
import { postVideo } from "@/api/resources/index";

// 定义允许的文件类型
const fileType = ref("video/mp4, video/ogg");

const router = useRouter();

// 视频保存
const saveVideo = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postVideo({ name, file_id });
    // 跳转到视频查看页面，并传递视频 ID
    router.push({
      path: "/resource/video/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.error(err);
  }
  callback();
};
</script>
