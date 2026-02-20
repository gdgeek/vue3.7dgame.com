<template>
  <div class="document-wrapper">
    <!-- 文章不存在 -->
    <el-empty v-if="state === 'not-found'" description="文章不存在" />

    <!-- 通用错误 + 重试按钮 -->
    <el-empty v-else-if="state === 'error'" :description="errorMessage || '加载失败，请重试'">
      <el-button type="primary" @click="retry">重试</el-button>
    </el-empty>

    <!-- 正常内容 -->
    <el-card v-else-if="data" shadow="never" class="document-card">
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

    <!-- 加载骨架屏 -->
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
import { AxiosError } from "axios";

type LoadState = "loading" | "success" | "not-found" | "error";

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
const state = ref<LoadState>("loading");
const errorMessage = ref<string | null>(null);
const categoryPath = computed(() => props.categoryPath ?? "/home/category");
const category = computed(() => props.category ?? true);

/**
 * 判断错误是否为 404 Not Found
 * 兼容 AxiosError 和 wp.ts 拦截器返回的 response 对象
 */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 404;
  }
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 404;
  }
  return false;
}

// 获取文章数据
const refresh = async () => {
  state.value = "loading";
  errorMessage.value = null;
  data.value = null;

  try {
    const res = await Article(props.postId);
    data.value = res.data;
    state.value = "success";
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      state.value = "not-found";
    } else {
      state.value = "error";
      errorMessage.value = "加载失败，请重试";
    }
  }
};

// 重试
const retry = () => {
  refresh();
};

onMounted(() => {
  refresh();
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
