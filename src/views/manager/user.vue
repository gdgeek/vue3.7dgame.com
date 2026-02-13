<template>
  <PersonPage :created="true" @loaded="handleLoaded"></PersonPage>
</template>

<script setup lang="ts">
import PersonPage from "@/components/MrPP/Person/Page.vue";
import { getPerson } from "@/api/v1/person";

interface LoadedParams {
  sorted: string;
  searched: string;
  current: number;
}

interface LoadedResponse {
  data: any[];
  pagination: {
    current: number;
    count: number;
    size: number;
    total: number;
  };
}

const handleLoaded = async (
  params: LoadedParams,
  callback: (val: LoadedResponse) => void
) => {
  try {
    const response = await getPerson(
      params.sorted,
      params.searched,
      params.current,
      "avatar,roles"
    );
    callback({
      data: response.data,
      pagination: {
        current: parseInt(response.headers["x-pagination-current-page"] || "1"),
        count: parseInt(response.headers["x-pagination-page-count"] || "1"),
        size: parseInt(response.headers["x-pagination-per-page"] || "20"),
        total: parseInt(response.headers["x-pagination-total-count"] || "0"),
      },
    });
  } catch (error) {
    console.error("Failed to load users:", error);
    callback({
      data: [],
      pagination: { current: 1, count: 0, size: 20, total: 0 },
    });
  }
};
</script>

<style scoped></style>
