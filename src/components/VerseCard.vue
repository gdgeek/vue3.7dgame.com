<template>
  <el-card style="width: 300px" class="box-card">
    <template #header>
      <div>
        <el-card shadow="hover" :body-style="{ padding: '0px' }">
          <template #header>
            <span class="mrpp-title">
              <b class="card-title" nowrap>{{ item.name }}</b>
            </span>
          </template>
          <router-link :to="'/verse/view?id=' + item.id">
            <img v-if="!item.image" src="@/assets/image/none.png"
              style="width: 100%; height: 270px; object-fit: contain" />
            <LazyImg v-else :url="item.image.url" style="width: 100%; height: 270px" fit="contain"></LazyImg>
          </router-link>
        </el-card>
        <InfoContent v-if="item" :verse="item"></InfoContent>
      </div>
    </template>
    <div class="clearfix">
      <el-button-group>
        <el-button type="primary" @click="goToDetail(item.id.toString())" size="small">{{ $t("verse.page.list.enter")
          }}</el-button>
        <el-button type="primary" v-if="item.verseRelease" @click="restrain(item)" size="small">
          <font-awesome-icon class="icon" icon="box-open" color="#FFA500"></font-awesome-icon>
        </el-button>
        <!--
        <el-button type="primary" v-else @click="release(item)" size="small">
          <font-awesome-icon class="icon" icon="box"></font-awesome-icon>
        </el-button>-->
      </el-button-group>
      <VerseToolbar :verse="item" @deleted="emit('deleted')" @changed="emit('changed')"></VerseToolbar>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import { LazyImg } from "vue-waterfall-plugin-next";
import { VerseData } from "@/api/v1/verse";
import VerseReleaseApi from "@/api/v1/verse-release";

const props = defineProps<{ item: VerseData }>();
const emit = defineEmits(["changed", "deleted"]);
const { t } = useI18n();
const router = useRouter();

const goToDetail = (id: string) => {
  router.push({ path: "/verse/view", query: { id } });
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
