<template>

  <el-card style="width: 100%">
    <waterfall
      v-if="items.length > 0"
      :width="320"
      :gutter="10"
      :hasAroundGutter="false"
      :breakpoints="{ 640: { rowPerView: 1 } }"
      :list="items"
      :column-count="3"
      :backgroundColor="'rgba(255, 255, 255, .05)'"
    >
      <template #default="{ item }">
   
        <VerseCard
          :item="item"
          @changed="refresh"
          @deleted="refresh"
        ></VerseCard>
      </template>
    </waterfall>
  </el-card>
</template>

<script setup lang="ts">
import { VerseData } from "@/api/v1/verse";
import VerseCard from "@/components/VerseCard.vue"; // 新的 VerseCard 组件
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const props = defineProps<{ items: VerseData[] }>();
const emit = defineEmits<{ (e: "refresh"): void }>();

const newItems = ref<VerseData[]>([]);

// 刷新操作
const refresh = () => {
  emit("refresh");
};
</script>

<style scoped></style>
