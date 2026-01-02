<template>
  <div>
    <el-descriptions
      label-class-name="info-content-label"
      :column="1"
      size="small"
      border
    >
      <!-- <el-descriptions-item v-for="(item, index) in props.list" :key="index">
        <template #label>
          <font-awesome-icon class="icon" :icon="item.icon"></font-awesome-icon>
          item.label
        </template>
        item.label.value
      </el-descriptions-item> -->
      <el-descriptions-item v-if="author">
        <template #label>
          <el-tooltip
            :content="$t('verse.page.list.infoContent.author')"
            placement="top"
            effect="light"
          >
            <font-awesome-icon class="icon" icon="user"></font-awesome-icon
          ></el-tooltip>
        </template>
        {{ author.nickname || author.username }}
      </el-descriptions-item>

      <el-descriptions-item v-if="verse.description">
        <template #label>
          <el-tooltip
            :content="$t('verse.page.list.infoContent.description')"
            placement="top"
            effect="light"
          >
            <font-awesome-icon class="icon" icon="info"></font-awesome-icon
          ></el-tooltip>
        </template>

        {{ verse.description }}
      </el-descriptions-item>

      <el-descriptions-item v-if="props.verse && props.verse.verseRelease">
        <template #label>
          <el-tooltip :content="'code'" placement="top" effect="light">
            <font-awesome-icon class="icon" icon="box-open"></font-awesome-icon
          ></el-tooltip>
        </template>
        <b>{{ props.verse.verseRelease.code }}</b>
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import type { Author, VerseData } from "@/api/v1/verse";
import DOMPurify from "dompurify";

interface Course {
  id: number;
  title: {
    rendered: string;
  };
}
interface Item {
  icon: string;
  label: string;
  value: string;
}

const props = defineProps<{
  verse: VerseData;
}>();
const author = computed(() => {
  return props.verse?.author;
});

const course = ref<Course | null>(null);

// 返回清理后的 HTML
const sanitizedTitle = computed(() => {
  return course.value ? DOMPurify.sanitize(course.value.title.rendered) : "";
});

onMounted(async () => {
  /*
  if (props.info?.course && props.info.course !== -1) {
    try {
      const r = await Post(props.info.course);
      course.value = r.data;
    } catch (e) {
      console.error(e);
    }
  }*/
});
</script>

<style lang="scss" scoped>
.info-content-label {
  width: 60px;
}

.icon {
  width: 10px;
}
</style>
