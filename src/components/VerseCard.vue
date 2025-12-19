<template>
  <MrPPCard :item="item" color="#2980b9" :showActions="false">
    <InfoContent v-if="item" :verse="item"></InfoContent>
    <template #enter>
      <el-button-group>
        <el-button type="primary" @click="openDetail" size="small">{{ $t("common.open") }}</el-button>
        <el-button type="primary" v-if="item.verseRelease" @click="restrain(item)" size="small">
          <font-awesome-icon class="icon" icon="box-open" color="#FFA500"></font-awesome-icon>
        </el-button>
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
import VerseReleaseApi from "@/api/v1/verse-release";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import { ElMessage, ElMessageBox } from "element-plus";

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

// 发布操作
const release = async (item: VerseData) => {
  try {
    await ElMessageBox.confirm(
      t("verse.page.list.releaseConfirm.message1"),
      t("verse.page.list.releaseConfirm.message2"),
      {
        confirmButtonText: t("verse.page.list.releaseConfirm.confirm"),
        cancelButtonText: t("verse.page.list.releaseConfirm.cancel"),
        type: "warning",
      }
    );
    // 示例：发送发布请求
    const response = await VerseReleaseApi.post({ verse_id: item.id });
    // 处理发布成功后的逻辑
    item.verseRelease = response.data;
    ElMessage.success(t("verse.page.list.releaseConfirm.success"));
    emit("changed");
  } catch {
    ElMessage.info(t("verse.page.list.releaseConfirm.info"));
  }
};

// 撤销操作
const restrain = async (item: VerseData) => {
  try {
    if (!item.verseRelease) {
      throw new Error("No verse release");
    }
    await ElMessageBox.confirm(
      t("verse.page.list.restrainConfirm.message1"),
      t("verse.page.list.restrainConfirm.message2"),
      {
        confirmButtonText: t("verse.page.list.restrainConfirm.confirm"),
        cancelButtonText: t("verse.page.list.restrainConfirm.cancel"),
        type: "warning",
      }
    );
    // 示例：发送撤销请求
    const response = await VerseReleaseApi.remove(item.verseRelease.id);
    // 处理撤销成功后的逻辑
    item.verseRelease = null;
    ElMessage.success(t("verse.page.list.restrainConfirm.success"));
    emit("changed");
  } catch {
    ElMessage.info(t("verse.page.list.restrainConfirm.info"));
  }
};
</script>

<style scoped></style>
