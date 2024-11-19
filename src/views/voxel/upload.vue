<template>
  <div>
    <mr-p-p-upload
      dir="voxel"
      :file-type="fileType"
      @save-resource="saveVoxel"
      @all-files-uploaded="handleAllFilesUploaded"
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

// 记录所有文件的上传结果
const uploadedFileIds: number[] = [];

const saveVoxel = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postVoxel({ name, file_id });
    // 将文件 ID 存储到数组中
    uploadedFileIds.push(response.data.id);
  } catch (err) {
    console.log(err);
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
      path: "/resource/voxel/view",
      query: { id: lastFileId },
    });
  }
};
</script>
