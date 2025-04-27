<template>
  <TransitionWrapper>
    <div>
      <mr-p-p-upload dir="picture" :file-type="fileType" @save-resource="savePicture">
        <div>{{ $t("picture.uploadFile") }}</div>
      </mr-p-p-upload>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postPicture } from "@/api/v1/resources/index";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const fileType = ref("image/gif, image/jpeg, image/png");
const router = useRouter();

let completedCount = 0;
// 图片保存
const savePicture = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: () => void
) => {
  try {
    const response = await postPicture({ name, file_id });
    if (response.data.id) {
      completedCount++;
      if (completedCount === totalFiles) {
        handleAllFilesUploaded(response.data.id);
      }
    }
  } catch (err) {
    console.error("Failed to save picture:", err);
  } finally {
    callback();
  }
};

// 多个文件上传后跳转到最后一个文件的查看页面
const handleAllFilesUploaded = async (lastFileId: number) => {
  await router.push({
    path: "/resource/picture/view",
    query: { id: lastFileId },
  });
};
</script>
