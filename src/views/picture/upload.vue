<template>
  <div>
    <mr-p-p-upload
      dir="picture"
      :file-type="fileType"
      @save-resource="savePicture"
      @all-files-uploaded="handleAllFilesUploaded"
    >
      <div>{{ $t("picture.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postPicture } from "@/api/resources/index";

const fileType = ref("image/gif, image/jpeg, image/png");
const router = useRouter();

// 记录所有文件的上传结果
const uploadedFileIds = ref<number[]>([]);

// 图片保存
const savePicture = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postPicture({ name, file_id });
    // 将文件 ID 存储到数组中
    uploadedFileIds.value.push(response.data.id);
    console.log("uploadedFileIds.length", uploadedFileIds.value.length);
  } catch (err) {
    console.error("Failed to save picture:", err);
  } finally {
    callback();
  }
};

// 多个文件上传后跳转到最后一个文件的查看页面
const handleAllFilesUploaded = () => {
  if (uploadedFileIds.value.length > 0) {
    console.log("All files uploaded successfully.");
    // 跳转到最后一个文件的查看页面
    const lastFileId = uploadedFileIds.value[uploadedFileIds.value.length - 1];
    router.push({
      path: "/resource/picture/view",
      query: { id: lastFileId },
    });
  }
};
</script>
