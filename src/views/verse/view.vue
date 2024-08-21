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
            <i v-if="saveable"
              ><el-icon><EditPen></EditPen></el-icon
            ></i>
            <i v-else>
              <el-icon><View></View></el-icon>
            </i>
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
          <el-form
            :model="Form"
            :rules="rules"
            ref="FormRef"
            label-width="auto"
          >
            <el-form-item label="多语言" prop="language">
              <el-select
                v-model="Form.language"
                placeholder="请选择语言"
                style="width: 25%"
              >
                <el-option label="zh" value="zh"></el-option>
                <el-option label="en" value="en"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="名字" prop="name">
              <el-input v-model="Form.name" placeholder="请输入名称"></el-input>
            </el-form-item>
            <el-form-item label="介绍" prop="description">
              <el-input
                v-model="Form.description"
                type="textarea"
                placeholder="请输入介绍"
              ></el-input>
            </el-form-item>
          </el-form>
          <span>
            <el-button
              @click="submit"
              size="small"
              type="primary"
              style="margin-left: 65px"
            >
              <el-icon style="margin-right: 5px"><Check></Check></el-icon
              >提交</el-button
            >
            <el-button @click="del" size="small" type="danger"
              ><el-icon style="margin-right: 5px"><Delete></Delete></el-icon
              >删除</el-button
            >
          </span>
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
import { FormInstance } from "element-plus";
import {
  dellanguages,
  getlanguages,
  postlanguages,
  putlanguages,
} from "@/api/v1/multilanguage-verses";

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
  language: "",
  name: "",
  description: "",
});

const FormRef = ref<FormInstance>();

const rules = {
  language: [{ required: true, message: "请选择语言", trigger: "blur" }],
  name: [
    { required: true, message: "请输入名称", trigger: "blur" },
    { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
  ],
  description: [{ required: false, message: "请输入介绍", trigger: "blur" }],
};

watchEffect(() => {
  if (verse.value?.languages?.length) {
    const lastLanguage =
      verse.value.languages[verse.value.languages.length - 1];
    if (
      lastLanguage?.language &&
      lastLanguage?.name &&
      lastLanguage?.description
    ) {
      Form.value!.language = lastLanguage.language;
      Form.value.name = lastLanguage.name;
      Form.value.description = lastLanguage.description;
    }
  }
});

const submit = () => {
  FormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (
        Form.value.language &&
        Form.value.language ===
          verse.value?.languages[verse.value.languages.length - 1]?.language
      ) {
        await putlanguages(
          verse.value?.languages[verse.value.languages.length - 1].id,
          {
            name: Form.value.name,
            description: Form.value.description,
          }
        );
        ElMessage.success("修改成功");
      } else {
        await postlanguages({
          verse_id: verse.value!.id,
          language: Form.value.language,
          name: Form.value.name,
          description: Form.value.description,
        });
      }
      await getlanguages(verse.value!.id);
      ElMessage.success("提交成功");
    } else {
      ElMessage.error("表单验证失败");
    }
  });
};

const del = async () => {
  await dellanguages(
    verse.value!.languages[verse.value!.languages.length - 1].id
  );
  await getlanguages(verse.value!.id);
  FormRef.value?.resetFields();
  await refresh();
  ElMessage.success("删除成功");
};

const info = computed(() =>
  verse.value?.info ? JSON.parse(verse.value.info) : null
);

const saveable = computed(() => {
  if (!verse.value) return false;
  return verse.value.editable;
});

const isRoot = computed(() => userStore.userInfo.roles.includes("root"));

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
