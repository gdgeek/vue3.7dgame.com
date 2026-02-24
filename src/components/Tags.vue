<template>
  <div v-if="classify" class="flex gap-2">
    <el-tag
      v-for="tag in tags"
      :type="tag.type === 'Classify' ? 'primary' : 'success'"
      :key="tag.name"
      :closable="props.editable"
      @close="close(tag.id)"
    >
      {{ tag.name }}
    </el-tag>
    <el-select-v2
      v-if="props.editable"
      @change="handleChange"
      v-model="value"
      size="small"
      :options="classify"
      :placeholder="t('verse.listPage.addTag')"
      style="width: 108px"
    ></el-select-v2>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { getTags } from "@/api/v1/tags";

type VerseTagLink = {
  tags_id: number;
};

type TagRecord = {
  id: number;
  name: string;
  type: string;
  key?: string | number;
};

const props = withDefaults(
  defineProps<{
    verseTags: VerseTagLink[];
    editable?: boolean;
  }>(),
  {
    editable: false,
  }
);

const emit = defineEmits(["add", "remove"]);
const { t } = useI18n();
const value = ref<number | null>(null);
const close = (id: number) => {
  console.log("删除标签:", id);
  emit("remove", id);
};
const data = computed(() => {
  return props.verseTags.map((item) => {
    return item.tags_id;
  });
});

const classify = computed(() => {
  if (list.value === null) return [];
  return list.value
    .filter((item) => {
      return !data.value.includes(item.id) && item.type === "Classify";
    })
    .map((item) => {
      return {
        label: item.name,
        value: item.id,
        key: item.key,
      };
    });
});
const tags = computed(() => {
  if (list.value === null) return [];

  return list.value
    .filter((item) => {
      return data.value.includes(item.id) && item.type === "Classify";
    })
    .map((item) => {
      return {
        name: item.name,
        id: item.id,
        type: item.type,
      };
    });
});

const handleChange = (val: number) => {
  console.log("选择完毕，选中的标签:", val);
  emit("add", val);
  value.value = null;
};

const list: Ref<TagRecord[] | null> = ref(null);
onMounted(async () => {
  const res = await getTags();
  list.value = res.data as TagRecord[];
});
</script>
