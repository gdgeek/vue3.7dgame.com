<template>
  <div class="verse-view">
    <el-dialog :title="'修改信息'" v-model="dialog" width="70%">
      <MrPPMessageFrom
        ref="editor"
        :data="briefing!"
        @post="postMessage"
      ></MrPPMessageFrom>
    </el-dialog>

    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card v-if="verse" class="box-card">
          <template #header>
            <i v-if="saveable" class="el-icon-edit"></i>
            <i v-else class="el-icon-view"></i>
            <b id="title">【宇宙】名称：</b>
            <span>{{ verse.name }}</span>
          </template>

          <div class="box-item">
            <el-image
              v-if="!verse.image"
              fit="contain"
              style="width: 100%; height: 300px"
            ></el-image>
            <el-image
              v-else
              fit="contain"
              style="width: 100%; height: 300px"
              :src="verse.image.url"
            ></el-image>
          </div>
        </el-card>
        <br />

        <el-card>
          <el-form :model="Form" label-width="auto">
            <el-form-item label="多语言">
              <el-select v-model="Form.language" placeholder="请选择语言">
                <el-option label="zh" value="zh"></el-option>
                <el-option label="en" value="en"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="名字">
              <el-input v-model="Form.name"></el-input>
            </el-form-item>
            <el-form-item label="介绍">
              <el-input v-model="Form.description"></el-input>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card v-if="verse" class="box-card">
          <el-button
            style="width: 100%"
            type="primary"
            size="small"
            @click="comeIn"
          >
            <div v-if="saveable">
              <font-awesome-icon icon="edit"></font-awesome-icon>
              &nbsp;编辑【宇宙】
            </div>
            <div v-else>
              <font-awesome-icon icon="eye"></font-awesome-icon>
              &nbsp;查看【宇宙】
            </div>
          </el-button>
          <br />
        </el-card>

        <Message
          v-if="message"
          ref="message"
          :messageId="message.id!"
          @set-message="setMessage"
        ></Message>
        <Reply v-if="message" :messageId="message.id!"></Reply>
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <b>【宇宙】信息</b>
          </template>
          <div class="box-item">
            <InfoContent
              v-if="verse"
              :info="JSON.parse(verse.info!)"
              :author="verse.author!"
            ></InfoContent>
            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right"></el-button-group>
            </aside>
          </div>
          <VerseToolbar
            :verse="verse!"
            @deleted="deleted"
            @changed="changed"
          ></VerseToolbar>
          <br />
        </el-card>
        <br />

        <el-card v-if="isRoot">
          <el-button
            v-if="!verseOpen"
            style="width: 100%"
            type="primary"
            size="small"
            @click="open"
          >
            <font-awesome-icon icon="eye"></font-awesome-icon>
            &nbsp;开放【宇宙】
          </el-button>
          <el-button
            v-else
            style="width: 100%"
            type="primary"
            size="small"
            @click="close"
          >
            <font-awesome-icon icon="eye-slash"></font-awesome-icon>
            &nbsp;关闭【宇宙】
          </el-button>
        </el-card>
        <Share v-if="saveable" :verse="verse!"></Share>
        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import MrPPMessageFrom from "@/components/MrPP/MrPPVerse/MrPPMessageFrom.vue";
import Reply from "@/components/MrPP/MrPPVerse/Reply.vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import Message from "@/components/MrPP/MrPPVerse/Message.vue";
import Share from "@/components/MrPP/MrPPVerse/Share.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import { getVerse, VerseData } from "@/api/v1/verse";
import { postVerseOpen, deleteVerseOpen } from "@/api/v1/verse-open";
import { MessageType, postMessageAPI } from "@/api/v1/message";
import { useUserStore } from "@/store/modules/user";
import { useTagsStore } from "@/store/modules/tags";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const tagsStore = useTagsStore();

const dialog = ref(false);
const verse = ref<VerseData>();
const briefing = ref<MessageType>();

const tagsMap = computed(() => tagsStore.tagsMap);
const id = computed(() => parseInt(route.query.id as string));
const message = computed(() => verse.value?.message ?? null);
const verseOpen = computed(() => verse.value?.verseOpen ?? null);

const Form = ref({
  language: verse.value?.languages.language,
  name: verse.value?.languages.name,
  description: verse.value?.languages.description,
});

const info = computed(() =>
  verse.value?.info ? JSON.parse(verse.value.info) : null
);

const saveable = computed(() => {
  if (!verse.value) return false;
  return verse.value.editable;
});

const isRoot = computed(() => userStore.userInfo.roles.includes("manager"));

const refresh = async () => {
  const res = await getVerse(
    id.value,
    "image,verseOpen,verseShare,author, message, languages"
  );
  verse.value = res.data;
  briefing.value = message.value
    ? message.value
    : {
        title: `【宇宙】名称：${verse.value!.name}`,
        body: info.value.description,
      };
};

const deleted = () => {
  router.push({ path: "/meta-verse/index" });
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
  ElMessage.success("分享成功");
};

const open = () => {
  dialog.value = true;
};

const close = async () => {
  await deleteVerseOpen(verseOpen.value!.id);
  verse.value!.verseOpen = null;
  verse.value!.message = null;
  ElMessage.success("停止共享");
};

const comeIn = () => {
  router.push({ path: "/verse/scene", query: { id: id.value } });
};

onMounted(async () => {
  await refresh();
  if (!tagsMap.value) {
    // store.dispatch("tags/refreshTags");
    await tagsStore.refreshTags();
  }

  // store.commit("breadcrumb/setBreadcrumbs", {
  //   list: [
  //     { path: "/", meta: { title: "元宇宙实景编程平台" } },
  //     { path: "/meta-verse", meta: { title: "宇宙" } },
  //     { path: ".", meta: { title: "【宇宙】" } },
  //   ],
  // });
});
</script>

<style scoped></style>
