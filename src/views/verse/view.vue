<template>
  <br>
  <TransitionWrapper>
    <div class="verse-view">
      <el-dialog v-model="dialog" width="70%">
        <template #header> {{ $t("verse.view.header") }} </template>
        <MrPPMessageFrom ref="editor" :data="briefing!" @post="postMessage"></MrPPMessageFrom>
      </el-dialog>

      <el-row :gutter="20" style="margin: 28px 18px 0">
        <el-col :sm="16">
          <el-card v-if="verse" class="box-card">
            <template #header>
              <i v-if="saveable"><el-icon>
                  <EditPen></EditPen>
                </el-icon></i>
              <i v-else>
                <el-icon>
                  <View></View>
                </el-icon>
              </i>
              <b id="title">{{ $t("verse.view.title") }} </b>
              <span>{{ verse.name }}</span>
            </template>
            <template #footer>

              <tags v-if="verse && verse.verseTags" @add="addTags" @remove="removeTags" :verseTags="verse.verseTags" />
            </template>

            <div class="box-item">
              <el-image v-if="!verse.image" fit="contain" style="width: 100%; height: 300px"></el-image>
              <el-image v-else fit="contain" style="width: 100%; height: 300px" :src="verse.image.url"></el-image>
            </div>


          </el-card>

          <br />
          <el-card v-if="verse" class="box-card">
            <el-button style="width: 100%" type="primary" size="small" @click="comeIn">
              <div v-if="saveable">
                <font-awesome-icon icon="edit"></font-awesome-icon>
                &nbsp;{{ $t("verse.view.edit") }}
              </div>
              <div v-else>
                <font-awesome-icon icon="eye"></font-awesome-icon>
                &nbsp;{{ $t("verse.view.eye") }}
              </div>
            </el-button>
            <br />
          </el-card>

          <Message v-if="message" ref="message" :messageId="message.id" @set-message="setMessage"></Message>
          <Reply v-if="message" :messageId="message.id"></Reply>

          <br />
        </el-col>

        <el-col :sm="8">

          <el-card class="box-card">
            <template #header>
              <b>{{ $t("verse.view.info") }}</b>
            </template>
            <div class="box-item">
              <!-- <InfoContent
              v-if="verse"
              :info="JSON.parse(verse.info!)"
              :author="verse.author!"
            ></InfoContent> -->
              <InfoContent v-if="verse" :verse="verse"></InfoContent>
              <aside style="margin-top: 10px; margin-bottom: 30px">
                <el-button-group style="float: right"></el-button-group>
              </aside>
            </div>
            <VerseToolbar v-if="verse" :verse="verse!" @deleted="deleted" @changed="changed"></VerseToolbar>
            <br />
          </el-card>

          <br />
          <!--
        <el-card v-if="saveable" class="box-card">
          <language
            v-if="verse"
            :verseId="verse.id"
            :languages="verse.languages!"
          ></language>
        </el-card>-->

          <br />

          <el-card v-if="can('admin', 'all')">
            <el-button v-if="!verseOpen" style="width: 100%" type="primary" size="small" @click="open">
              <font-awesome-icon icon="eye"></font-awesome-icon>
              &nbsp;{{ $t("verse.view.verseOpen") }}
            </el-button>
            <el-button v-else style="width: 100%" type="primary" size="small" @click="close">
              <font-awesome-icon icon="eye-slash"></font-awesome-icon>
              &nbsp;{{ $t("verse.view.verseClose") }}
            </el-button>
          </el-card>
          <br />

          <Share v-if="saveable" :verse="verse!"></Share>
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import Tags from "@/components/Tags.vue";
import { useRoute, useRouter } from "vue-router";
import MrPPMessageFrom from "@/components/MrPP/MrPPVerse/MrPPMessageFrom.vue";
import Reply from "@/components/MrPP/MrPPVerse/Reply.vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import Message from "@/components/MrPP/MrPPVerse/Message.vue";
import Share from "@/components/MrPP/MrPPVerse/Share.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
//import Language from "@/components/MrPP/MrPPVerse/language.vue";
import { getVerse, VerseData } from "@/api/v1/verse";
import { postVerseOpen, deleteVerseOpen } from "@/api/v1/verse-open";
import { MessageType, postMessageAPI } from "@/api/v1/message";
import { useUserStore } from "@/store/modules/user";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { postVerseTags, removeVerseTags } from "@/api/v1/verse-tags";

const value1 = ref(true);
import { Hide, View } from "@element-plus/icons-vue";
import { useAbility } from "@casl/vue";
const ability = useAbility();
const can = ability.can.bind(ability);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const dialog = ref(false);
const verse = ref<VerseData>();
const briefing = ref<MessageType>();

const id = computed(() => parseInt(route.query.id as string));
const message = computed(() => verse.value?.message ?? null);
const verseOpen = computed(() => verse.value?.verseOpen ?? null);
const removeTags = async (tags: number) => {
  try {
    await ElMessageBox.confirm(
      "确认删除标签?",
      "给场景删除标签",
      {
        confirmButtonText: "OK",
        cancelButtonText: "Cancel",
        type: "warning",
      }
    );
    await removeVerseTags(verse.value!.id, tags);
    await refresh();
    ElMessage.success("删除标签成功");
  } catch (e) {
    ElMessage.error("取消删除标签");
    return;
  }
};
const addTags = async (tags: number) => {

  try {
    await ElMessageBox.confirm(
      '确认增加标签?',
      '给场景增加标签',
      {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );
    await postVerseTags(verse.value!.id, tags);
    await refresh();
    ElMessage.success('增加标签成功');
  } catch (e) {
    ElMessage.error('取消增加标签');
    return;
  }

};

const { t } = useI18n();

const info = computed(() =>
  verse.value?.info ? JSON.parse(verse.value.info) : null
);

const saveable = computed(() => {
  if (!verse.value) return false;
  return verse.value.editable;
});

const refresh = async () => {
  try {
    const response = await getVerse(
      id.value,
      "image,verseOpen,verseShare,author, message,verseTags"
    );
    // alert(JSON.stringify(response.data));
    verse.value = response.data;
  } catch (error) {
    console.error("Failed to fetch verse data:", error);
    // 处理错误逻辑，如显示错误消息
    return;
  }

  briefing.value = message.value
    ? message.value
    : {
      title: t("verse.view.messageTitle") + `${verse.value?.name || ""}`,
      body: info.value.description || "",
    };
};

const deleted = () => {
  router.push({ path: "/verse/index" });
};

const changed = () => {
  refresh();
};

const setMessage = (message: any) => {
  verse.value!.message = message;
};

const postMessage = async (data: any) => {
  const info = { target: { type: "verse", id: id.value } };
  data.info = JSON.stringify(info);
  const response = await postMessageAPI(data);
  verse.value!.message = response.data;

  const res = await postVerseOpen({
    verse_id: id.value,
    message_id: message.value!.id,
  });
  verse.value!.verseOpen = res.data;
  dialog.value = false;
  ElMessage.success(t("verse.view.success4"));
};

const open = () => {
  dialog.value = true;
};

const close = async () => {
  await deleteVerseOpen(verseOpen.value!.id);
  verse.value!.verseOpen = null;
  verse.value!.message = null;
  ElMessage.success(t("verse.view.success5"));
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
  //Form.value.language = "zh"; // 默认中文zh
  refresh();
});
</script>

<style scoped></style>
