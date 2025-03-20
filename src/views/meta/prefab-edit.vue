<template>
  <TransitionWrapper>
    <div class="prefab-edit">
      <edit @get-item="getPrefabData" @put-item="putPrefabData"></edit>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import Edit from "@/components/Meta/Edit.vue";
import { getPrefab, putPrefab } from "@/api/v1/prefab";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const getPrefabData = async (
  id: number,
  expand: string,
  callback: (data: any) => void
) => {
  try {
    const response = await getPrefab(id, expand);
    console.log("response:", response);
    callback(response.data);
  } catch (error) {
    console.error(error);
  }
};

const putPrefabData = async (
  id: number,
  data: any,
  callback: (data: any) => void
) => {
  try {
    const response = await putPrefab(id, data);
    callback(response.data);
  } catch (error) {
    console.error(error);
  }
};
</script>
