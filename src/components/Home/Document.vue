<template>
  <div>
    <el-card v-if="data" shadow="never">
      <template #header>
        <h2 id="title" v-html="data.title.rendered"></h2>
        <span v-if="category">
          <router-link
            v-for="(item, index) in data._embedded['wp:term'][0]"
            :key="index"
            :to="`${categoryPath}?id=${item.id}`"
            style="margin-right: 10px"
          >
            <el-tag size="small">{{ item.name }}</el-tag>
          </router-link>
        </span>
      </template>
      <div>
        <main style="margin-top: 15px">
          <p
            id="content"
            class="text-muted well well-sm no-shadow"
            style="margin: 20px"
            v-html="data.content.rendered"
          ></p>
        </main>
      </div>
      <br />
      <small id="date" class="pull-right">{{ dateTime(data.date) }}</small>
    </el-card>

    <el-card v-else shadow="never">
      <template #header>
        <el-skeleton :rows="1"></el-skeleton>
      </template>
      <el-skeleton :rows="20"></el-skeleton>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import moment from "moment";
import { Article } from "@/api/home/wordpress";

moment.locale("zh-cn");

// 定义 Props 类型
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

// 定义 Props
const props = defineProps<{
  postId: number;
  categoryPath?: string;
  category?: boolean;
}>();

// 初始化响应式数据
const data = ref<Data | null>(null);

// 计算属性
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
const dateTime = (date: string) => moment(date).format("YYYY-MM-DD HH:mm:ss");
</script>
