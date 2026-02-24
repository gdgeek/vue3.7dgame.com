<template>
  <TransitionWrapper>
    <div class="prefab-edit">
      <edit @get-item="getPrefabData" @put-item="putPrefabData"></edit>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import Edit from "@/components/Meta/Edit.vue";
import { getPrefab, putPrefab } from "@/api/v1/prefab";
import type { PrefabData, UpdatePrefabRequest } from "@/api/v1/types/prefab";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const getPrefabData = async (
  id: number,
  expand: string,
  callback: (data: PrefabData) => void
) => {
  try {
    const response = await getPrefab(id, expand);
    logger.log("response:", response);
    callback(response.data);
  } catch (error) {
    logger.error(error);
  }
};

const putPrefabData = async (
  id: number,
  data: UpdatePrefabRequest,
  callback: (data: PrefabData) => void
) => {
  try {
    const response = await putPrefab(id, data);
    callback(response.data);
  } catch (error) {
    logger.error(error);
  }
};
</script>
