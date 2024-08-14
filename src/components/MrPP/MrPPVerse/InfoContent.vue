<template>
  <div>
    <el-descriptions
      label-class-name="info-content-label"
      :column="1"
      size="mini"
      border
    >
      <el-descriptions-item v-if="author">
        <template #label>
          <font-awesome-icon class="icon" icon="user"></font-awesome-icon>
          作者
        </template>
        kooriookami
      </el-descriptions-item>

      <el-descriptions-item v-if="course?.title">
        <template #label>
          <font-awesome-icon class="icon" icon="book"></font-awesome-icon>
          学习
        </template>
        <router-link target="_blank" :to="`/home/document?id=${course.id}`">
          <el-link target="_blank" v-html="course.title.rendered">
            默认链接
          </el-link>
        </router-link>
      </el-descriptions-item>

      <el-descriptions-item v-if="info.description">
        <template #label>
          <font-awesome-icon class="icon" icon="info"></font-awesome-icon>
          说明
        </template>
        {{ info.description }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Post } from "@/api/wordpress";
import DOMPurify from "dompurify";

interface Info {
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
  author: Record<string, unknown> | null;
}>();

const course = ref<Course | null>(null);

onMounted(async () => {
  if (props.info?.course && props.info.course !== -1) {
    try {
      const r = await Post(props.info.course);
      course.value = r.data;
    } catch (e) {
      console.error(e);
    }
  }
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
