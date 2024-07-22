<template>
  <div v-if="env.canDocument()">
    <Book
      v-if="env.mrpp()"
      :items="mrpp"
      :document-path="'/home/document'"
      :category-path="'/home/category'"
      :category="true"
    ></Book>
    <Book
      v-if="env.mrcn()"
      :items="mrcn"
      :document-path="'/home/document'"
      :category-path="'/home/category'"
      :category="false"
    ></Book>
    <el-tabs v-if="env.local()" type="border-card" lazy>
      <el-tab-pane :label="information.data.title">
        <!-- <LocalPage></LocalPage> -->
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import environment from "@/environment.js";
import Book from "@/components/Home/Book.vue";
// import LocalPage from "@/components/Home/LocalPage.vue";

// Define `env` as a computed property if it's coming from environment
const env = environment;

// Define `information` if you're using Vuex or other state management
const information = computed(() => {
  // Replace this with actual state management logic
  // return store.state.information
  return { data: { title: "Title" } }; // Example static data
});

const mrpp = [
  { label: "首页", type: "document", id: 999 },
  { label: "新闻", type: "category", id: 74 },
  { label: "相关下载", type: "category", id: 77 },
  { label: "案例教程", type: "category", id: 79 },
];

const mrcn = [
  { label: "首页", type: "document", id: 999 },
  { label: "新闻", type: "category", id: 74 },
  { label: "相关下载", type: "category", id: 84 },
  { label: "案例教程", type: "category", id: 79 },
];
</script>
