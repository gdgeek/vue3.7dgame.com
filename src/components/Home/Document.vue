<template>
  <div class="document-wrapper">
    <el-card v-if="data" shadow="never" class="document-card">
      <template #header>
        <h2 class="document-title" :innerHTML="sanitizedTitle"></h2>
        <div v-if="category" class="document-tags">
          <router-link v-for="(item, index) in data._embedded['wp:term'][0]" :key="index"
            :to="`${categoryPath}?id=${item.id}`" class="document-tag-link">
            <span class="document-tag">{{ item.name }}</span>
          </router-link>
        </div>
      </template>
      <div>
        <main class="document-content">
          <div class="document-body" :innerHTML="sanitizedContent"></div>
        </main>
      </div>
      <div class="document-footer">
        <small class="document-date">{{ dateTime(data.date) }}</small>
      </div>
    </el-card>

    <el-card v-else shadow="never" class="document-card">
      <template #header>
        <el-skeleton :rows="1"></el-skeleton>
      </template>
      <el-skeleton :rows="20"></el-skeleton>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from "@/utils/dayjs";
import { Article } from "@/api/home/wordpress";
import DOMPurify from "dompurify";

interface Item {
  id: number;
  name: string;
}

interface Data {
  title: { rendered: string };
  content: { rendered: string };
  date: string;
  _embedded: {
    "wp:term": Item[][];
  };
}

const props = defineProps<{
  postId: number;
  categoryPath?: string;
  category?: boolean;
}>();

const data = ref<Data | null>(null);
const categoryPath = computed(() => props.categoryPath ?? "/home/category");
const category = computed(() => props.category ?? true);

// 获取文章数据
onMounted(async () => {
  try {
    const res = await Article(props.postId);
    data.value = res.data;
  } catch (error) {
    console.error("Failed to fetch article:", error);
  }
});

// 格式化日期
const dateTime = (date: string) => formatDateTime(date);

const sanitizedTitle = computed(() => {
  return data.value ? DOMPurify.sanitize(data.value.title.rendered) : "";
});

const sanitizedContent = computed(() => {
  return data.value ? DOMPurify.sanitize(data.value.content.rendered) : "";
});
</script>

<style lang="scss" scoped>
.document-wrapper {
  width: 100%;
}

.document-card {
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;

  :deep(.el-card__header) {
    padding: var(--spacing-lg);
    border-bottom: var(--border-width) solid var(--border-color);
    background: var(--bg-hover);
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

.document-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.document-tag-link {
  text-decoration: none;
}

.document-tag {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary-color);
  font-size: var(--font-size-xs);
  font-weight: 500;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--primary-color);
    color: var(--text-inverse);
  }
}

.document-content {
  padding: var(--spacing-lg);
}

.document-body {
  color: var(--text-primary);
  font-size: var(--font-size-md);
  line-height: 1.8;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    color: var(--text-primary);
    font-weight: 600;
    margin: var(--spacing-lg) 0 var(--spacing-sm) 0;
  }

  :deep(p) {
    margin: var(--spacing-sm) 0;
    color: var(--text-primary);
  }

  :deep(a) {
    color: var(--primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-sm);
    margin: var(--spacing-md) 0;
  }

  :deep(blockquote) {
    border-left: 3px solid var(--primary-color);
    padding-left: var(--spacing-md);
    margin: var(--spacing-md) 0;
    color: var(--text-secondary);
  }
}

.document-footer {
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-md);
  text-align: right;
}

.document-date {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
</style>
