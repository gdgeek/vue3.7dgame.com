<template>
  <TransitionWrapper>
    <div class="verse-index">
      <mr-p-p-verse-page @loaded="loaded" :created="false"></mr-p-p-verse-page>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import MrPPVersePage from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import { getVerseOpenVerses } from "@/api/v1/verse-open";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const loaded = async (data: any, result: Function) => {
  try {
    const response = await getVerseOpenVerses(
      data.sorted,
      data.searched,
      data.current,
      "image,author,share"
    );

    const pagination = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };
    const items = response.data;

    result({ data: items, pagination: pagination });
  } catch (error) {
    console.error(error);
  }
};
</script>
