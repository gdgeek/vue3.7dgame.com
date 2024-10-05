<template>
  <div>
    <AIUpload v-loading="loading" v-if="!data" />
    <AIProcess v-else v-loading="loading" :data="data" />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import aiRodin from "@/api/v1/ai-rodin";
const route = useRoute();

import AIUpload from "@/components/MrPP/AIUpload.vue";
import AIProcess from "@/components/MrPP/AIProcess.vue";
const id: Ref<number | undefined> = computed(() => {
  const queryId = route.query.id as string | undefined;
  return queryId ? parseInt(queryId, 10) : undefined;
});
const loading: Ref<boolean> = ref(false);
//import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
const data = ref<any>(null);
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
