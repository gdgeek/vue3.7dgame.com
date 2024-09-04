<template>
  <div>
    <el-descriptions
      label-class-name="info-content-label"
      :column="1"
      size="small"
      border
    >
      <el-descriptions-item v-if="author">
        <template #label>
          <font-awesome-icon class="icon" icon="user"></font-awesome-icon>
          {{ $t("verse.page.list.infoContent.author") }}
        </template>
        {{ author.nickname || author.username }}
      </el-descriptions-item>

      <el-descriptions-item v-if="course?.title">
        <template #label>
          <font-awesome-icon class="icon" icon="book"></font-awesome-icon>
          {{ $t("verse.page.list.infoContent.learn") }}
        </template>
        <router-link target="_blank" :to="`/home/document?id=${course.id}`">
          <el-link target="_blank" :innerHTML="sanitizedTitle">
            {{ $t("verse.page.list.infoContent.blank") }}
          </el-link>
        </router-link>
      </el-descriptions-item>

      <el-descriptions-item v-if="info.description">
        <template #label>
          <div style="width: 75px">
            <font-awesome-icon class="icon" icon="info"></font-awesome-icon>
            {{ $t("verse.page.list.infoContent.description") }}
          </div>
        </template>
        {{ info.description }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { Post } from "@/api/home/wordpress";
import type { Author } from "@/api/v1/verse";
import DOMPurify from "dompurify";

interface Info {
  name: string;
  course?: number;
  description?: string;
}

interface Course {
  id: number;
  title: {
    rendered: string;
  };
}

const props = defineProps<{
  info: Info;
  author: Author;
}>();

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
