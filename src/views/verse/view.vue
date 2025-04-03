<template>
  <TransitionWrapper>
    <br>
    <div class="verse-view">
      <el-dialog v-model="dialog" width="70%"> <!-- 这里依赖 dialog 变量 -->
        <template #header>{{ $t("verse.view.header") }}</template>
      </el-dialog>

      <el-row :gutter="20" style="margin: 28px 18px 0">
        <el-col :sm="16">
          <el-card v-if="verse" class="box-card">
            <template #header>
              <i v-if="saveable">
                <el-icon>
                  <EditPen />
                </el-icon>
              </i>
              <i v-else>
                <el-icon>
                  <View />
                </el-icon>
              </i>
              <b id="title">{{ $t("verse.view.title") }}</b>
              <span>{{ verse.name }}</span>
            </template>

            <template #footer>
              <tags v-if="verse && verse.verseTags" :editable="verse.editable" @add="addTags" @remove="removeTags"
                :verseTags="verse.verseTags" />
            </template>

            <div class="box-item">
              <el-image fit="contain" style="width: 100%; height: 300px"
                :src="verse.image ? verse.image.url : ''"></el-image>
            </div>
          </el-card>

          <br />

          <!-- 操作按钮卡片 -->
          <el-card v-if="verse" class="box-card">
            <el-button style="width: 100%" type="primary" size="small" @click="comeIn">
              <div v-if="saveable">
                <font-awesome-icon icon="edit" />
                &nbsp;{{ $t("verse.view.edit") }}
              </div>
              <div v-else>
                <font-awesome-icon icon="eye" />
                &nbsp;{{ $t("verse.view.eye") }}
              </div>
            </el-button>
          </el-card>

          <br />
          <!--
          <Message v-if="message" ref="message" :messageId="message.id" @set-message="setMessage"></Message>
          <Reply v-if="message" :messageId="message.id"></Reply>

          <br />
          -->
        </el-col>

        <el-col :sm="8">
          <el-card class="box-card">
            <template #header>
              <b>{{ $t("verse.view.info") }}</b>
            </template>
            <div class="box-item">
              <InfoContent v-if="verse" :verse="verse"></InfoContent>
              <aside style="margin-top: 10px; margin-bottom: 30px">
                <el-button-group style="float: right"></el-button-group>
              </aside>
            </div>
            <VerseToolbar v-if="verse" :verse="verse" @deleted="deleted" @changed="changed"></VerseToolbar>
            <br />
          </el-card>

          <br />

          <!-- 管理员操作区域 
          <el-card v-if="can('admin', 'all')">
            <el-button style="width: 100%" type="primary" size="small" @click="verseOpen ? close : open">
              <font-awesome-icon :icon="verseOpen ? 'eye-slash' : 'eye'" />
              &nbsp;{{ $t(verseOpen ? "verse.view.verseClose" : "verse.view.verseOpen") }}
            </el-button>
          </el-card>

          <br />

          <Share v-if="saveable && verse" :verse="verse" />
-->
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'; // 确保引入 ref
// 组件导入
import Tags from "@/components/Tags.vue";
import Reply from "@/components/MrPP/MrPPVerse/Reply.vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getVerse, VerseData } from "@/api/v1/verse";
import { postVerseTags, removeVerseTags } from "@/api/v1/verse-tags";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { useAbility } from "@casl/vue";
import { useI18n } from "vue-i18n";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const ability = useAbility();
const can = ability.can.bind(ability);
const { t } = useI18n();


const dialog = ref(false);
const verse = ref<VerseData | null>(null);

const id = computed(() => parseInt(route.query.id as string));
const info = computed(() => verse.value?.info ? JSON.parse(verse.value.info) : null);
const saveable = computed(() => verse.value ? verse.value.editable : false);

const refresh = async () => {
  try {
    const response = await getVerse(
      id.value,
      "image,author,verseTags"
    );
    verse.value = response.data;
  } catch (error) {
    console.error("Failed to fetch verse data:", error);
    return;
  }

};

const deleted = () => {
  router.push({ path: "/verse/index" });
};

const changed = () => {
  refresh();
};

const removeTags = async (tags: number) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.tags.confirmRemove.message"),
      t("verse.view.tags.confirmRemove.title"),
      {
        confirmButtonText: t("verse.view.tags.confirmRemove.confirm"),
        cancelButtonText: t("verse.view.tags.confirmRemove.cancel"),
        type: "warning",
      }
    );
    await removeVerseTags(verse.value!.id, tags);
    await refresh();
    ElMessage.success(t("verse.view.tags.confirmRemove.success"));
  } catch (e) {
    ElMessage.error(t("verse.view.tags.confirmRemove.error"));
  }
};

const addTags = async (tags: number) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.tags.confirmAdd.message"),
      t("verse.view.tags.confirmAdd.title"),
      {
        confirmButtonText: t("verse.view.tags.confirmAdd.confirm"),
        cancelButtonText: t("verse.view.tags.confirmAdd.cancel"),
        type: "warning",
      }
    );
    await postVerseTags(verse.value!.id, tags);
    await refresh();
    ElMessage.success(t("verse.view.tags.confirmAdd.success"));
  } catch (e) {
    ElMessage.info(t("verse.view.tags.confirmAdd.error"));
  }
};

const comeIn = () => {
  router.push({
    path: "/verse/scene",
    query: {
      id: id.value,
      title: t("verse.view.scene") + "【" + verse.value?.name + "】",
    },
  });
};

onMounted(() => {
  refresh();
});
</script>

<style scoped></style>
