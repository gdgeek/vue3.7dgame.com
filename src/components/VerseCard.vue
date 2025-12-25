<template>
  <MrPPCard :item="item" type="场景" color="#2980b9" :showActions="false">
    <InfoContent v-if="item" :verse="item"></InfoContent>
    <template #enter>
      <el-button-group>
        <el-button type="primary" @click="openDetail" size="small">{{ $t("common.open") }}</el-button>

      </el-button-group>

      <VerseToolbar :verse="item" @deleted="emit('deleted')" @changed="emit('changed')"></VerseToolbar>
    </template>
  </MrPPCard>

  <el-dialog v-model="detailVisible" :title="$t('verse.view.header')" width="80%" append-to-body destroy-on-close>
    <VerseDetail :verseId="item.id" @changed="handleDetailChanged" @deleted="handleDetailDeleted" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import VerseDetail from "@/components/MrPP/MrPPVerse/VerseDetail.vue";
import { VerseData } from "@/api/v1/verse";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";


const props = defineProps<{ item: VerseData }>();
const emit = defineEmits(["changed", "deleted"]);
const { t } = useI18n();
const router = useRouter();

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
