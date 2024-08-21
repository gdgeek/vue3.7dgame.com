<template>
  <div class="verse-index">
    <mr-p-p-verse-page @loaded="loaded" :created="false"></mr-p-p-verse-page>
  </div>
</template>

<script setup lang="ts">
import MrPPVersePage from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import { getVerseShareVerses } from "@/api/v1/verse-share";

const loaded = async (data: any, result: Function) => {
  try {
    const response = await getVerseShareVerses(
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
  } catch (e: any) {
    alert(JSON.stringify(e.message));
  }
};
</script>

<style lang="scss" scoped>
.info-content-label {
  width: 60px;
}

.icon {
  width: 10px;
}
</style>
