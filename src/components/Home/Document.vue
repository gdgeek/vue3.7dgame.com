<template>
  <div>
    <el-card v-if="data" shadow="never">
      <template #header>
        <div>
          <h2 id="title" v-html="data.title.rendered"></h2>
          <span v-if="category">
            <router-link
              v-for="(item, index) in data._embedded['wp:term'][0]"
              :key="index"
              :to="`${categoryPath}?id=${item.id}`"
              style="margin-right: 10px"
            >
              <el-tag size="mini">{{ item.name }}</el-tag>
            </router-link>
          </span>
        </div>
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
        <div>
          <el-skeleton :rows="1"></el-skeleton>
        </div>
      </template>
      <el-skeleton :rows="20"></el-skeleton>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
// import { useStore } from "vuex";
import moment from "moment";
import { Article } from "@/api/home/wordpress";

moment.locale("zh-cn");

const props = defineProps<{
  postId: number;
  categoryPath?: string;
  category?: boolean;
}>();

const data = ref<any>(null);

// const store = useStore();

const dateTime = (date: string) => moment(date).format("YYYY-MM-DD HH:mm:ss");

onMounted(async () => {
  try {
    const response = await Article(props.postId);
    data.value = response.data;
  } catch (error) {
    console.error("Failed to fetch article:", error);
  }
});

const categoryPath = props.categoryPath ?? "/home/category";
const category = props.category ?? true;
</script>
