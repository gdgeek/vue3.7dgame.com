<template>
  <div>
    <AIUpload />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import AIUpload from "@/components/MrPP/AIUpload.vue";
//import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postAudio } from "@/api/resources/index";
import AiRodin from "@/api/v1/ai-rodin";
import { AiRodinResult } from "@/api/v1/ai-rodin";

const fileType = ref("audio/mp3, audio/wav");
const router = useRouter();

onMounted(async () => {
  //const response = await aiRodin.list();
  //console.error(response.data);
  //ai.getAiRodin();
});
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
