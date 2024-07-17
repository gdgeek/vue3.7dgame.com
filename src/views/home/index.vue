<template>
  <div v-if="env.canDocument()">
    <book v-if="env.mrpp()" :items="mrpp"></book>
    <book v-if="env.mrcn()" :items="mrcn"></book>
    <el-tabs v-if="env.local()" type="border-card" lazy>
      <el-tab-pane :label="information.data.title">
        <local-page></local-page>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script>
import { mapState } from "vuex";
import environment from "@/environment.js";
// import Document from "@/components/Document.vue";
import Book from "@/components/Book.vue";
// import DocumentList from "@/components/Home/DocumentList.vue";
import LocalPage from "@/components/Home/LocalPage.vue";
export default {
  name: "DocumentIndex",
  components: {
    // Document,
    // DocumentList,
    LocalPage,
    Book,
  },
  data() {
    return {
      mrpp: [
        { label: "首页", type: "document", id: 999 },
        { label: "新闻", type: "category", id: 74 },
        { label: "相关下载", type: "category", id: 77 },
        { label: "案例教程", type: "category", id: 79 },
      ],
      mrcn: [
        { label: "首页", type: "document", id: 999 },
        { label: "新闻", type: "category", id: 74 },
        { label: "相关下载", type: "category", id: 84 },
        { label: "案例教程", type: "category", id: 79 },
      ],
    };
  },
  computed: {
    env() {
      return environment;
    },
    ...mapState({
      information: (state) => state.information,
    }),
  },
};
</script>
