<template>
  <div class="document-list-wrapper">
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
    <el-timeline v-if="data" :reverse="reverse" class="document-timeline">
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
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { formatDateTime } from "@/utils/dayjs";
import { Posts, getCategory } from "@/api/home/wordpress";
import DOMPurify from "dompurify";

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

// 初始化响应式数据
const reverse = ref(false);
const category = ref<Category | null>(null);
const data = ref<Item[] | null>(null);
const pagination = ref<Pagination>({
  current: 1,
  count: null,
  size: 10,
  total: null,
});

// 获取分类数据和文章数据
const refresh = async () => {
  try {
    const categoryResponse = await getCategory(props.categoryId);
    category.value = categoryResponse.data;

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
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
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
  margin-left: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary-color);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.document-timeline {
  :deep(.el-timeline-item__node) {
    background: var(--primary-color);
  }

  :deep(.el-timeline-item__tail) {
    border-left-color: var(--border-color);
  }

  :deep(.el-timeline-item__timestamp) {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
  }
}

.document-box-card {
  cursor: pointer;
  display: flex;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-sm);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--primary-color);
  }
}

.document-list-img {
  width: 120px;
  min-height: 100px;
  object-fit: cover;
  flex-shrink: 0;
  border-radius: 0;
}

.document-list-text {
  padding: var(--spacing-md);
  flex: 1;
  min-width: 0;
}

.document-list-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.document-list-excerpt {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
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
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      color: var(--text-secondary);
      border: var(--border-width) solid var(--border-color);
    }

    .el-pager li.is-active {
      background: var(--primary-color);
      color: var(--text-inverse);
      border-color: var(--primary-color);
    }
  }
}
</style>
