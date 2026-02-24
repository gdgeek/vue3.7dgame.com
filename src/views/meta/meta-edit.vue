<template>
  <TransitionWrapper>
    <div class="meta-edit">
      <Edit @get-item="getMetaData" @put-item="putMetaData"></Edit>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
// @ts-nocheck
import { logger } from "@/utils/logger";
import Edit from "@/components/Meta/Edit.vue";
import { getMeta, putMeta } from "@/api/v1/meta";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const getMetaData = async (
  id: number,
  params: Record<string, unknown>,
  callback: (data: Record<string, unknown>) => void
) => {
  try {
    const response = await getMeta(id, params);
    logger.log("response:", response);
    callback(response.data);
  } catch (error) {
    logger.error(error);
  }
};

const putMetaData = async (
  id: number,
  data: Record<string, unknown>,
  callback: (data: Record<string, unknown>) => void
) => {
  try {
    const response = await putMeta(id, data);
    callback(response.data);
  } catch (error) {
    logger.error(error);
  }
};
</script>
