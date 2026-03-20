<template>
  <div class="document-list-wrapper">
    <!-- 分类不存在 -->
    <el-empty
      v-if="categoryState === 'not-found'"
      description="分类不存在"
    ></el-empty>

    <!-- 分类加载错误 -->
    <el-empty
      v-else-if="categoryState === 'error'"
      :description="errorMessage || '加载失败，请重试'"
    >
      <el-button type="primary" @click="retry">重试</el-button>
    </el-empty>

    <!-- 文章列表为空（404） -->
    <el-empty
      v-else-if="postsState === 'not-found'"
      description="暂无文章"
    ></el-empty>

    <!-- 文章加载错误 -->
    <el-empty
      v-else-if="postsState === 'error'"
      :description="errorMessage || '加载失败，请重试'"
    >
      <el-button type="primary" @click="retry">重试</el-button>
    </el-empty>

    <!-- 正常内容 -->
    <template v-else>
      <el-tooltip
        v-if="category"
        :content="category.description"
        placement="top"
        effect="light"
      >
        <span class="document-list-category-tag">
          {{ category.name }}
        </span>
      </el-tooltip>
      <el-timeline v-if="data" class="document-timeline">
        <el-timeline-item
          v-for="(item, index) in data"
          :key="index"
          :timestamp="dateTime(new Date(item.date))"
        >
          <div class="document-box-card" @click="select(item.id)">
            <img
              v-if="item.jetpack_featured_media_url"
              align="left"
              class="document-list-img"
              :src="item.jetpack_featured_media_url"
              fit="cover"
            />
            <div class="document-list-text">
              <h3
                class="document-list-title"
                :innerHTML="sanitizedTitle(item)"
              ></h3>
              <div
                class="document-list-excerpt"
                :innerHTML="sanitizedExcerpt(item)"
              ></div>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-timeline v-else>
        <el-timeline-item>
          <el-skeleton :rows="3"></el-skeleton>
        </el-timeline-item>
        <el-timeline-item>
          <el-skeleton :rows="3"></el-skeleton>
        </el-timeline-item>
      </el-timeline>
      <div
        v-if="pagination.count && pagination.count > 1"
        class="document-pagination"
      >
        <el-pagination
          :current-page="pagination.current"
          :page-count="pagination.count ?? 0"
          :page-size="pagination.size"
          :total="pagination.total ?? 0"
          layout="prev, pager, next, jumper"
          background
          @current-change="handleCurrentChange"
        ></el-pagination>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { formatDateTime } from "@/utils/dayjs";
import { Posts, getCategory } from "@/api/home/wordpress";
import DOMPurify from "dompurify";
import { AxiosError } from "axios";

type LoadState = "loading" | "success" | "not-found" | "error";

const router = useRouter();

interface Item {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  jetpack_featured_media_url: string;
}

interface Category {
  description: string;
  name: string;
}

interface Pagination {
  current: number;
  count: number | null;
  size: number;
  total: number | null;
}

const props = withDefaults(
  defineProps<{
    categoryId: number;
    documentPath?: string;
  }>(),
  {
    documentPath: "/home/document",
  }
);

// 状态管理
const categoryState = ref<LoadState>("loading");
const postsState = ref<LoadState>("loading");
const errorMessage = ref<string | null>(null);

// 初始化响应式数据

const category = ref<Category | null>(null);
const data = ref<Item[] | null>(null);
const pagination = ref<Pagination>({
  current: 1,
  count: null,
  size: 10,
  total: null,
});

/**
 * 判断错误是否为 404 Not Found
 * 兼容 AxiosError 和 wp.ts 拦截器返回的 response 对象
 */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 404;
  }
  // wp.ts 响应拦截器在 HTTP 错误时 reject(response)，response 有 status 属性
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 404;
  }
  return false;
}

// 获取分类数据和文章数据
const refresh = async () => {
  categoryState.value = "loading";
  postsState.value = "loading";
  errorMessage.value = null;
  data.value = null;
  category.value = null;

  // 获取分类
  try {
    const categoryResponse = await getCategory(props.categoryId);
    category.value = categoryResponse.data;
    categoryState.value = "success";
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      categoryState.value = "not-found";
    } else {
      categoryState.value = "error";
      errorMessage.value = "加载失败，请重试";
    }
    return; // 分类失败则不继续加载文章
  }

  // 获取文章列表
  try {
    const postsResponse = await Posts(
      props.categoryId,
      pagination.value.size,
      pagination.value.current
    );

    data.value = postsResponse.data;
    pagination.value = {
      current: pagination.value.current,
      count: parseInt(postsResponse.headers["x-wp-totalpages"]),
      size: pagination.value.size,
      total: parseInt(postsResponse.headers["x-wp-total"]),
    };
    postsState.value = "success";
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      postsState.value = "not-found";
    } else {
      postsState.value = "error";
      errorMessage.value = "加载失败，请重试";
    }
  }
};

// 重试
const retry = () => {
  pagination.value.current = 1;
  refresh();
};

onMounted(() => {
  refresh();
});

// 计算日期时间
const dateTime = (date: Date) => formatDateTime(date);

// 处理分页变化
const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

// 选择项目
const select = (id: number) => {
  router.push({ path: props.documentPath, query: { id } });
};

const sanitizedTitle = (item: Item) => {
  return item ? DOMPurify.sanitize(item.title.rendered) : "";
};

const sanitizedExcerpt = (item: Item) => {
  return item ? DOMPurify.sanitize(item.excerpt.rendered) : "";
};
</script>

<style lang="scss" scoped>
.document-list-wrapper {
  width: 100%;
}

.document-list-category-tag {
  display: inline-block;
  padding: 4px var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  margin-left: var(--spacing-xl);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--primary-color);
  background: var(--primary-light);
  border-radius: var(--radius-full);
}

.document-timeline {
  :deep(.el-timeline-item__node) {
    background: var(--primary-color);
  }

  :deep(.el-timeline-item__tail) {
    border-left-color: var(--border-color);
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }
}

.document-box-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);

  &:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}

.document-list-img {
  flex-shrink: 0;
  width: 120px;
  min-height: 100px;
  object-fit: cover;
  border-radius: 0;
}

.document-list-text {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-md);
}

.document-list-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.document-list-excerpt {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--text-secondary);
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;

  :deep(p) {
    margin: 0;
  }
}

.document-pagination {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg) 0;

  :deep(.el-pagination) {
    .btn-prev,
    .btn-next,
    .el-pager li {
      color: var(--text-secondary);
      background: var(--bg-card);
      border: var(--border-width) solid var(--border-color);
      border-radius: var(--radius-sm);
    }

    .el-pager li.is-active {
      color: var(--text-inverse);
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
  }
}
</style>
