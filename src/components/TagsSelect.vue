<template>
  <PageFilter
    v-model="value"
    :label="$t('ui.filter')"
    :options="options"
    :placeholder="$t('ui.filter')"
    @change="handleChange"
  ></PageFilter>
</template>

<script lang="ts" setup>
import { logger } from "@/utils/logger";
import { ref, onMounted } from "vue";
import { PageFilter } from "@/components/StandardPage";
import { getTags } from "@/api/v1/tags";

const emit = defineEmits(["tagsChange"]);

const value = ref<(string | number)[]>([]);
const options = ref<{ label: string; value: string | number }[]>([]);
type TagRecord = { id: number; name: string };

const handleChange = (val: (string | number)[]) => {
  logger.log("选择完毕，选中的标签:", val);
  emit("tagsChange", val);
};

onMounted(() => {
  getTags().then((res) => {
    options.value = (res.data as TagRecord[]).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  });
});
</script>
