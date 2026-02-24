<template>
  <MrPPCard :item="item" type="场景" color="#2980b9" :showActions="false">
    <InfoContent v-if="item" :verse="item"></InfoContent>
    <template #enter>
      <el-button-group>
        <el-button type="primary" @click="openDetail" size="small">{{
          $t("common.open")
        }}</el-button>
      </el-button-group>

      <VerseToolbar
        :verse="item"
        @deleted="emit('deleted')"
        @changed="emit('changed')"
      ></VerseToolbar>
    </template>
  </MrPPCard>

  <el-dialog
    v-model="detailVisible"
    :title="$t('verse.view.header')"
    width="80%"
    append-to-body
    destroy-on-close
  >
    <VerseDetail
      :verseId="item.id"
      @changed="handleDetailChanged"
      @deleted="handleDetailDeleted"
    ></VerseDetail>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
// @ts-nocheck
import { ref } from "vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import VerseDetail from "@/components/MrPP/MrPPVerse/VerseDetail.vue";
import { VerseData } from "@/api/v1/verse";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";

defineProps<{ item: VerseData }>();
const emit = defineEmits(["changed", "deleted"]);

const detailVisible = ref(false);

const openDetail = () => {
  detailVisible.value = true;
};

const handleDetailChanged = () => {
  emit("changed");
};

const handleDetailDeleted = () => {
  detailVisible.value = false;
  emit("deleted");
};
</script>

<style scoped></style>
