<template>
  <div>
    <el-tooltip v-if="category" :content="category.description" placement="top" effect="light">
      <el-tag size="small" style="margin-left: 68px; margin-bottom: 15px">
        {{ category.name }}
      </el-tag>
    </el-tooltip>
    <el-timeline v-if="data" :reverse="reverse">
      <el-timeline-item v-for="(item, index) in data" :key="index" :timestamp="dateTime(new Date(item.date))">
        <el-card :body-style="{ padding: '0px' }" shadow="hover" class="document-box-card">
          <div style="padding: -10px" @click="select(item.id)">
            <img align="left" class="document-list-img" :src="item.jetpack_featured_media_url" fit="cover" />
            <div class="document-list-text">
              <h3 :innerHTML="sanitizedTitle(item)"></h3>
              <div :innerHTML="sanitizedExcerpt(item)"></div>
            </div>
          </div>
        </el-card>
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
    <el-pagination v-if="pagination.count && pagination.count > 1" :current-page="pagination.current"
      :page-count="pagination.count ?? 0" :page-size="pagination.size" :total="pagination.total ?? 0"
      layout="prev, pager, next, jumper" background @current-change="handleCurrentChange"></el-pagination>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import moment from "moment";
import { Posts, getCategory } from "@/api/home/wordpress";
import DOMPurify from "dompurify";

moment.locale("zh-cn");

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
const dateTime = (date: Date) => moment(date).format("YYYY-MM-DD HH:mm:ss");

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
.document-box-card {
  cursor: pointer;
  margin: 0px;
}

.document-list-img {
  height: 100px;
  border-radius: 4px;
  margin: 0px;
  margin-right: 20px;
  margin-left: 20px;
  margin-bottom: 10px;
}

.document-list-text {
  margin: 20px;
  margin-right: 20px;
  margin-left: 20px;
}
</style>
