<template>
  <TransitionWrapper>
    <div class="meta-edit">
      <Edit @get-item="getMetaData" @put-item="putMetaData"></Edit>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import Edit from "@/components/Meta/Edit.vue";
import { getMeta, putMeta } from "@/api/v1/meta";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { UpdateMetaRequest } from "@/api/v1/types/meta";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const getMetaData = async (
  id: number,
  params: Record<string, unknown>,
  callback: (data: MetaInfo) => void
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
  data: UpdateMetaRequest,
  callback: (data: MetaInfo) => void
) => {
  try {
    const response = await putMeta(id, data);
    callback(response.data);
  } catch (error) {
    logger.error(error);
  }
};
</script>
