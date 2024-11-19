<template>
  <div>
    <mr-p-p-upload
      dir="voxel"
      :file-type="fileType"
      @save-resource="saveVoxel"
    >
      <div>{{ $t("voxel.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postVoxel } from "@/api/resources/index";

const fileType = ref(".vox");
const router = useRouter();


let completedCount = 0;
const saveVoxel = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: () => void
) => {
  try {
    const response = await postVoxel({ name, file_id });
    if (response.data.id) {
      completedCount++;
      if (completedCount === totalFiles) {
        handleAllFilesUploaded(response.data.id);
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    callback();
  }
};

// 多个文件上传后跳转到最后一个文件的查看页面
const handleAllFilesUploaded = async (lastFileId: number) => {
    await router.push({
      path: "/resource/voxel/view",
      query: { id: lastFileId },
    });
};
</script>
