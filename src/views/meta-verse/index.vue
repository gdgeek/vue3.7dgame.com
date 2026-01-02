<template>
  <TransitionWrapper>
    <div class="verse-index">
      <Page @loaded="loaded" :created="true"></Page>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import Page from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import { getVerses } from "@/api/v1/verse";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const loaded = async (data: any, result: Function) => {
  try {
    const response = await getVerses({
      sort: data.sorted,
      search: data.searched,
      page: data.current,
      expand: "image,author",
      tags: data.tags,
    });

    //console.error(response.data)
    const pagination = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };
    result({ data: response.data, pagination: pagination });
  } catch (error) {
    console.error(error);
  }
};
</script>

<style scoped>
.verse-index {
  padding: 20px;
}
</style>
