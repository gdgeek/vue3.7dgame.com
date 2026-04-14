<template>
  <PersonPage :created="true" @loaded="handleLoaded"></PersonPage>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import PersonPage from "@/components/MrPP/Person/Page.vue";
import { getPerson } from "@/api/v1/person";
import type { userData } from "@/api/v1/person";

interface LoadedParams {
  sorted: string;
  searched: string;
  current: number;
}

interface LoadedResponse {
  data: userData[];
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
      "avatar,roles,organizations"
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
    logger.error("Failed to load users:", error);
    callback({
      data: [],
      pagination: { current: 1, count: 0, size: 20, total: 0 },
    });
  }
};
</script>

<style scoped></style>
