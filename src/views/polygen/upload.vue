<template>
  <div>
    <mr-p-p-upload
      dir="polygen"
      :file-type="fileType"
      @save-resource="savePolygen"
    >
      <div>{{ $t("polygen.uploadFile") }}</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { postPolygen } from "@/api/resources/index";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";

const fileType = ref(".glb");
const router = useRouter();

const savePolygen = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postPolygen({ name, file_id });
    router.push({
      path: "/resource/polygen/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    console.error(err);
  }
  callback();
};
</script>
