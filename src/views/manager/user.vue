<template>
  <TransitionWrapper>
    <div class="verse-index">
      <page @loaded="loaded" :created="true"></page>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import Page from "@/components/MrPP/Person/Page.vue";
import { getPerson } from "@/api/v1/person";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const loaded = async (data: any, result: Function) => {
  try {
    const response = await getPerson(
      data.sorted,
      data.searched,
      data.current,
      "roles, avatar"
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
