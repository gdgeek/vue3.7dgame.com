<template>
  <el-card style="width: 100%; min-height: 400px">
    <Waterfall
      v-if="items"
      :list="items"
      :width="320"
      :gutter="20"
      :backgroundColor="'rgba(255, 255, 255, .05)'"
    >
      <template #default="{ item }">
        <VerseCard
          :item="item"
          @changed="refresh"
          @deleted="refresh"
        ></VerseCard>
      </template>
    </Waterfall>
    <el-skeleton v-else :rows="8" animated></el-skeleton>
  </el-card>
</template>

<script setup lang="ts">
import { VerseData } from "@/api/v1/verse";
import VerseCard from "@/components/VerseCard.vue"; // 新的 VerseCard 组件
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const props = defineProps<{ items: VerseData[] | null }>();
const emit = defineEmits<{ (e: "refresh"): void }>();

//const newItems = ref<VerseData[]>([]);

// 刷新操作
const refresh = () => {
  emit("refresh");
};
</script>

<style scoped></style>
