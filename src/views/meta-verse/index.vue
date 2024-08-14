<template>
  <div class="verse-index">
    <Page @loaded="loaded" :created="true"></Page>
  </div>
</template>

<script setup lang="ts">
import Page from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import { getVerses } from "@/api/v1/verse";

const loaded = async (data: any, result: any) => {
  try {
    const response = await getVerses(
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
    result({ data: response.data, pagination });
  } catch (error) {
    console.log(error);
  }
};
</script>

<style lang="scss" scoped></style>
