<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchAiRodins" wrapper-class="ai-list" @refresh="handleRefresh">
      <template #header-actions>
        <el-button type="primary" @click="createAI">
          <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
          {{ $t("ai.generation") }}
        </el-button>
      </template>

      <template #card="{ item }">
        <MrPPCard :item="item" :type="$t('ai.title')" color="#3498db" @deleted="deletedWindow">
          <template #enter>
            <el-button type="primary" size="small" @click="view(item.id)">
              {{ $t("meta.enter") }}
            </el-button>
          </template>
        </MrPPCard>
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import CardListPage from "@/components/MrPP/CardListPage/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import aiRodin from "@/api/v1/ai-rodin";
import type { FetchParams, FetchResponse } from "@/components/MrPP/CardListPage/types";

const { t } = useI18n();
const router = useRouter();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const fetchAiRodins = async (params: FetchParams): Promise<FetchResponse> => {
  return await aiRodin.list(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => {
  // console.log("AI list refreshed", data);
};

const createAI = () => {
  router.push("/ai/generation");
};

const view = (id: number) => {
  router.push({ path: "/ai/generation", query: { id } });
};

const deletedWindow = async (item: any, resetLoading: () => void) => {
  try {
    await MessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await aiRodin.del(item.id);
    cardListPageRef.value?.refresh();
    Message.success(t("meta.confirm.success"));
  } catch {
    Message.info(t("meta.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped lang="scss">
.ai-list {
  padding: 20px;
}
</style>
