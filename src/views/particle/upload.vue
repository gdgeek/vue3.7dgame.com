<template>
  <TransitionWrapper>
    <div>
      <mr-p-p-upload
        dir="particle"
        :file-type="fileType"
        @save-resource="saveParticle"
      >
        <div>{{ $t("particle.uploadFile") }}</div>
      </mr-p-p-upload>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postParticle } from "@/api/v1/resources/index";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

// 定义允许的文件类型
const fileType = ref(
  "video/mp4, video/mov, video/avi, image/gif, image/jpeg, image/png, image/webp, audio/mp3, audio/wav"
);
const router = useRouter();

let completedCount = 0;

// 视频保存
const saveParticle = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: () => void
) => {
  try {
    const response = await postParticle({ name, file_id });
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
    path: "/resource/particle/view",
    query: { id: lastFileId },
  });
};
</script>
