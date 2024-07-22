<template>
  <div>
    <el-tooltip
      v-if="category"
      :content="category.description"
      placement="top"
      effect="light"
    >
      <el-tag size="mini" style="margin-left: 68px; margin-bottom: 15px">
        {{ category.name }}
      </el-tag>
    </el-tooltip>
    <el-timeline v-if="data" :reverse="reverse">
      <el-timeline-item
        v-for="(item, index) in data"
        :key="index"
        :timestamp="dateTime(new Date(item.date))"
      >
        <el-card
          :body-style="{ padding: '0px' }"
          shadow="hover"
          class="document-box-card"
        >
          <div style="padding: -10px" @click="select(item.id)">
            <img
              align="left"
              class="document-list-img"
              style=""
              :src="item.jetpack_featured_media_url"
              fit="cover"
            />
            <div class="document-list-text">
              <h3>{{ sanitizeHtml(item.title.rendered) }}</h3>
              <div>{{ sanitizeHtml(item.excerpt.rendered) }}</div>
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
    <el-pagination
      v-if="pagination.count && pagination.count > 1"
      :current-page="pagination.current"
      :page-count="pagination.count"
      :page-size="pagination.size"
      :total="pagination.total"
      layout="prev, pager, next, jumper"
      background
      @current-change="handleCurrentChange"
    ></el-pagination>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import moment from "moment";
import DOMPurify from "dompurify";
import { Posts, getCategory } from "@/api/home/wordpress";

moment.locale("zh-cn");

const route = useRoute();
const router = useRouter();

const categoryId = ref(parseInt(route.query.id as string));
const reverse = ref(false);
const category = ref<any>(null);
const data = ref<any>(null);

interface Pagination {
  current: number;
  count: number | null;
  size: number;
  total: number | null;
}

const pagination = ref<Pagination>({
  current: 1,
  count: null,
  size: 10,
  total: null,
});

const refresh = async () => {
  const categoryData = await getCategory(categoryId.value);
  category.value = categoryData.data;
  const postsData = await Posts(
    categoryId.value,
    pagination.value.size,
    pagination.value.current
  );
  data.value = postsData.data;
  pagination.value = {
    current: pagination.value.current,
    count: parseInt(postsData.headers["x-wp-totalpages"]),
    size: pagination.value.size,
    total: parseInt(postsData.headers["x-wp-total"]),
  };
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const dateTime = (date: Date) => {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
};

const select = (id: number) => {
  router.push({ path: "/home/document", query: { id } });
};

// 输入数据进行适当的消毒, 防止 xss 攻击
const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html);
};

onMounted(refresh);
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
