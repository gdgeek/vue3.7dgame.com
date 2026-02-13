<template>
  <div>
    <AIUpload v-loading="loading" v-if="!data"></AIUpload>
    <AIProcess v-else v-loading="loading" :data="data"></AIProcess>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from "vue";
import { useRoute } from "vue-router";
import aiRodin from "@/api/v1/ai-rodin";
const route = useRoute();

interface AiData {
  id: number;
  [key: string]: any;
}

import AIUpload from "@/components/MrPP/AIUpload.vue";
import AIProcess from "@/components/MrPP/AIProcess.vue";
const id: Ref<number | undefined> = computed(() => {
  const queryId = route.query.id as string | undefined;
  return queryId ? parseInt(queryId, 10) : undefined;
});
const loading: Ref<boolean> = ref(false);
//import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
const data = ref<AiData | null>(null);
onMounted(async () => {
  if (id.value) {
    try {
      loading.value = true;
      const response = await aiRodin.get(id.value);
      data.value = response.data;
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  }
});
</script>
