<template>
  <div class="meta-edit">
    <Edit @get-item="getMetaData" @put-item="putMetaData"></Edit>
  </div>
</template>

<script setup lang="ts">
import { defineComponent } from "vue";
import Edit from "@/components/Meta/Edit.vue";
import { getMeta, putMeta } from "@/api/v1/meta";

const getMetaData = async (
  id: number,
  expand: string,
  callback: (data: any) => void
) => {
  try {
    const response = await getMeta(id, expand);
    console.log("response:", response);
    callback(response.data);
  } catch (error) {
    console.error(error);
  }
};

const putMetaData = async (
  id: number,
  data: any,
  callback: (data: any) => void
) => {
  try {
    const response = await putMeta(id, data);
    callback(response.data);
  } catch (error) {
    console.error(error);
  }
};
</script>
