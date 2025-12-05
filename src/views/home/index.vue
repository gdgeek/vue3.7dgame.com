<template>
  <TransitionWrapper>
    <div>1112
      <Book :items="list"></Book>
      <el-tabs v-if="env.local()" type="border-card" lazy>
        <el-tab-pane :label="informationStore.title">
          <LocalPage></LocalPage>
        </el-tab-pane>
      </el-tabs>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useInfomationStore } from "@/store/modules/information";
import environment from "@/environment";
import Book from "@/components/Home/Book.vue";
import LocalPage from "@/components/Home/LocalPage.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getDomainInfo } from "@/api/v1/domain";

const informationStore = useInfomationStore();
const env = computed(() => environment);
const { t } = useI18n();

/*
const mrpp = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 999 },
    { label: t("homepage.news"), type: "category", id: 74 },
    { label: t("homepage.relatedDownload"), type: "category", id: 77 },
    { label: t("homepage.caseCourse"), type: "category", id: 79 },
  ];
});*/

const list = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 1455 },
    { label: t("homepage.news"), type: "category", id: 74 },
  ];
});
</script>
