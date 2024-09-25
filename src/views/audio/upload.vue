<template>
  <div>
    <mr-p-p-upload dir="audio" :file-type="fileType" @save-resource="saveAudio">
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

// 音频保存
const saveAudio = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postAudio({ name, file_id });
    // 跳转到音频查看页面，并传递音频 ID
    router.push({
      path: "/resource/audio/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.error(err);
  }
  callback();
};
</script>
