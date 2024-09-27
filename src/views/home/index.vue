<template>
  <div>
    <Book v-if="env.mrpp()" :items="mrpp"></Book>
    <Book v-if="env.mrcn()" :items="mrcn"></Book>
    <el-tabs v-if="env.local()" type="border-card" lazy>
      <el-tab-pane :label="informationStore.title">
        <LocalPage></LocalPage>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useInfomationStore } from "@/store/modules/information";
import environment from "@/environment.js";
import Book from "@/components/Home/Book.vue";
import LocalPage from "@/components/Home/LocalPage.vue";

const informationStore = useInfomationStore();
const env = computed(() => environment);
const { t } = useI18n();

const mrpp = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 999 },
    { label: t("homepage.news"), type: "category", id: 74 },
    { label: t("homepage.relatedDownload"), type: "category", id: 77 },
    { label: t("homepage.caseCourse"), type: "category", id: 79 },
  ];
});

const mrcn = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 999 },
    { label: t("homepage.news"), type: "category", id: 74 },
    { label: t("homepage.relatedDownload"), type: "category", id: 84 },
    { label: t("homepage.caseCourse"), type: "category", id: 79 },
  ];
});
</script>
