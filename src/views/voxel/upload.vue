<template>
  <div>
    <mr-p-p-upload dir="voxel" :file-type="fileType" @save-resource="saveVoxel">
      <div>选择模型（.vox文件），并上传</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postVoxel } from "@/api/resources/index";

const fileType = ref(".vox");
const router = useRouter();

const saveVoxel = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postVoxel({ name, file_id });
    router.push({
      path: "/ResourceAdmin/voxel/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.error(err);
  }
  callback();
};
</script>
