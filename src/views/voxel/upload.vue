<template>
  <div>
    <mr-p-p-upload dir="voxel" :file-type="fileType" @save-resource="saveVoxel">
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

const saveVoxel = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postVoxel({ name, file_id });
    console.log(response.data);
    router.push({
      path: "/resource/voxel/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.log(err);
  } finally {
    callback();
  }
};
</script>
