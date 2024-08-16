<!-- <template>
  <div v-if="env.canDocument()">
    <Book v-if="env.mrpp()" :items="mrpp"></Book>
    <Book v-if="env.mrcn()" :items="mrcn"></Book>
    <el-tabs v-if="env.local()" type="border-card" lazy>
      <el-tab-pane :label="informationStore.title">
        <LocalPage></LocalPage>
      </el-tab-pane>
    </el-tabs>
  </div>
</template> -->
<template>
  <div>
    <!-- <Book v-if="env.mrpp()" :items="mrpp"></Book> -->
    <Book :items="mrcn"></Book>
    <el-tabs v-if="env.local()" type="border-card" lazy>
      <el-tab-pane :label="informationStore.title">
        <LocalPage></LocalPage>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useInfomationStore } from "@/store/modules/information";
import environment from "@/environment.js";
import Document from "@/components/Document.vue";
import Book from "@/components/Home/Book.vue";
import DocumentList from "@/components/Home/DocumentList.vue";
import LocalPage from "@/components/Home/LocalPage.vue";

const props = defineProps<{}>();

const informationStore = useInfomationStore();
console.log("informationStore", informationStore.description);

// 处理 environment 对象
const env = computed(() => environment);

// 定义 data 属性
const mrpp = ref([
  { label: "首页", type: "document", id: 999 },
  { label: "新闻", type: "category", id: 74 },
  { label: "相关下载", type: "category", id: 77 },
  { label: "案例教程", type: "category", id: 79 },
]);

const mrcn = ref([
  { label: "首页", type: "document", id: 999 },
  { label: "新闻", type: "category", id: 74 },
  { label: "相关下载", type: "category", id: 84 },
  { label: "案例教程", type: "category", id: 79 },
]);
</script>
