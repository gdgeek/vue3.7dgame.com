<template>
  <div class="verse-index">
    <page @loaded="loaded" :created="true"></page>
  </div>
</template>

<script setup lang="ts">
import Page from "@/components/MrPP/Person/Page.vue";
import { getPerson } from "@/api/v1/person";

const loaded = async (data: any, result: Function) => {
  try {
    console.log("测试", data);
    const response = await getPerson(
      data.sorted,
      data.searched,
      data.current,
      "roles, avatar"
    );
    console.log("loaded", response);
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
