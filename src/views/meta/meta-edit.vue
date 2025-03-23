<template>
  <TransitionWrapper>
    <div class="meta-edit">
      <Edit @get-item="getMetaData" @put-item="putMetaData"></Edit>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import Edit from "@/components/Meta/Edit.vue";
import { getMeta, putMeta } from "@/api/v1/meta";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

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
