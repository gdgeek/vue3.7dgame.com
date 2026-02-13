<template>
  <PageFilter v-model="value" label="标签筛选" :options="options" placeholder="标签筛选" @change="handleChange" />
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { PageFilter } from "@/components/StandardPage";
import { getTags } from "@/api/v1/tags";

const emit = defineEmits(["tagsChange"]);

const value = ref<(string | number)[]>([]);
const options = ref<{ label: string; value: string | number }[]>([]);

const handleChange = (val: (string | number)[]) => {
  console.log("选择完毕，选中的标签:", val);
  emit("tagsChange", val);
};

onMounted(() => {
  getTags().then((res) => {
    options.value = res.data.map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
  });
});
</script>
