<template>
  <TransitionWrapper>
    <br>
    <div class="verse-view">
      <VerseDetail v-if="id" :verseId="id" @deleted="deleted" @changed="changed" />
    </div>
  </TransitionWrapper>
</template>


<script setup lang="ts">
import { computed } from 'vue';
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { useRoute, useRouter } from "vue-router";
import VerseDetail from "@/components/MrPP/MrPPVerse/VerseDetail.vue";

const route = useRoute();
const router = useRouter();

const id = computed(() => parseInt(route.query.id as string));

const deleted = () => {
  router.push({ path: "/verse/index" });
};

const changed = () => {
  // Optional: refresh logic if needed, but VerseDetail handles its own refresh on id change
};
</script>

<style scoped></style>
