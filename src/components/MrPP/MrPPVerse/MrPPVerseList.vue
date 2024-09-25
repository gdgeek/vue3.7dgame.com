<template>
  <el-card style="width: 100%">
    <waterfall
      v-if="viewCards.length > 0"
      :width="320"
      :gutter="10"
      :hasAroundGutter="false"
      :breakpoints="{ 640: { rowPerView: 1 } }"
      :list="viewCards"
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

// 监听 props.items 的变化并更新 newItems
watch(
  () => props.items,
  (updatedItems: VerseData[]) => {
    newItems.value = updatedItems;
  },
  { immediate: true }
);

// 瀑布流数据类型转换
const transformToViewCard = (items: VerseData[]) =>
  items.map((item) => ({
    src: item.image?.url,
    id: item.id ? item.id.toString() : undefined,
    name: item.name,
    info: item.info,
    uuid: item.uuid,
    image: item.image,
    author: item.author,
    editable: item.editable,
    verseRelease: item.verseRelease,
  }));

// 计算 viewCards 数据
const viewCards = computed(() => transformToViewCard(newItems.value));

// 刷新操作
const refresh = () => {
  emit("refresh");
};
</script>

<style scoped></style>
