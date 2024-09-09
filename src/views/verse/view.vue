<template>
  <div class="verse-view">
    <el-dialog v-model="dialog" width="70%">
      <template #header> {{ $t("verse.view.header") }} </template>
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
              ><el-icon> <EditPen></EditPen> </el-icon
            ></i>
            <i v-else>
              <el-icon>
                <View></View>
              </el-icon>
            </i>
            <b id="title">{{ $t("verse.view.title") }} </b>
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

        <!-- <el-card>
          <el-form
            :model="Form"
            :rules="rules"
            ref="FormRef"
            label-width="auto"
          >
            <el-form-item :label="$t('verse.view.form.label1')" prop="language">
              <el-select
                v-model="Form.language"
                :placeholder="$t('verse.view.form.placeholder1')"
                style="width: 25%"
              >
                <el-option label="zh" value="zh"></el-option>
                <el-option label="en" value="en"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('verse.view.form.label2')" prop="name">
              <el-input
                v-model="Form.name"
                :placeholder="$t('verse.view.form.placeholder2')"
              ></el-input>
            </el-form-item>
            <el-form-item
              :label="$t('verse.view.form.label3')"
              prop="description"
            >
              <el-input
                v-model="Form.description"
                type="textarea"
                :placeholder="$t('verse.view.form.placeholder3')"
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
              >{{ $t("verse.view.form.submit") }}</el-button
            >
            <el-button @click="del" size="small" type="danger"
              ><el-icon style="margin-right: 5px"><Delete></Delete></el-icon
              >{{ $t("verse.view.form.delete") }}</el-button
            >
          </span>
        </el-card> -->

        <el-card v-if="saveable" class="box-card">
          <language
            v-if="verse"
            :verseId="verse.id"
            :languages="verse.languages!"
          ></language>
        </el-card>

        <br />
        <el-card v-if="verse" class="box-card">
          <el-button
            style="width: 100%"
            type="primary"
            size="small"
            @click="comeIn"
          >
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
            <b>{{ $t("verse.view.info") }}</b>
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
            v-if="verse"
            :verse="verse!"
            @deleted="deleted"
            @changed="changed"
          ></VerseToolbar>
          <br />
        </el-card>
        <br />

        <el-card v-if="can('admin', 'all')">
          <el-button
            v-if="!verseOpen"
            style="width: 100%"
            type="primary"
            size="small"
            @click="open"
          >
            <font-awesome-icon icon="eye"></font-awesome-icon>
            &nbsp;{{ $t("verse.view.verseOpen") }}
          </el-button>
          <el-button
            v-else
            style="width: 100%"
            type="primary"
            size="small"
            @click="close"
          >
            <font-awesome-icon icon="eye-slash"></font-awesome-icon>
            &nbsp;{{ $t("verse.view.verseClose") }}
          </el-button>
        </el-card>
        <br />
        <!--
        <el-card v-if="$can('root')">
          <el-button
            v-if="verseOpen === null"
            style="width: 100%"
            type="primary"
            size="small"
            @click="open()"
          >
            <font-awesome-icon icon="eye" />
            &nbsp;开放【宇宙】
          </el-button>

          <el-button
            v-else
            style="width: 100%"
            type="primary"
            size="small"
            @click="close()"
          >
            <font-awesome-icon icon="eye-slash" />
            &nbsp;关闭【宇宙】
          </el-button>
        </el-card>
-->
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
import Language from "@/components/MrPP/MrPPVerse/language.vue";
import { getVerse, VerseData } from "@/api/v1/verse";
import { postVerseOpen, deleteVerseOpen } from "@/api/v1/verse-open";
import { MessageType, postMessageAPI } from "@/api/v1/message";
import { useUserStore } from "@/store/modules/user";
import { FormInstance } from "element-plus";
import { useAbility } from "@casl/vue";
const ability = useAbility();
const can = ability.can.bind(ability);
import {
  dellanguages,
  getlanguages,
  postlanguages,
  putlanguages,
} from "@/api/v1/multilanguage-verses";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const dialog = ref(false);
const verse = ref<VerseData>();
const briefing = ref<MessageType>();

const id = computed(() => parseInt(route.query.id as string));
const message = computed(() => verse.value?.message ?? null);
const verseOpen = computed(() => verse.value?.verseOpen ?? null);

const Form = ref({
  language: "",
  name: "",
  description: "",
});

const FormRef = ref<FormInstance>();

const { t } = useI18n();

const rules = {
  language: [
    {
      required: true,
      message: t("verse.view.form.rules.message1"),
      trigger: "blur",
    },
  ],
  name: [
    {
      required: true,
      message: t("verse.view.form.rules.message2"),
      trigger: "blur",
    },
    {
      min: 2,
      max: 50,
      message: t("verse.view.form.rules.message3"),
      trigger: "blur",
    },
  ],
  description: [
    {
      required: false,
      message: t("verse.view.form.rules.message4"),
      trigger: "blur",
    },
  ],
};

watch(
  () => Form.value.language,
  (newLanguage: any) => {
    // 切换不同的语言时，自动更新表单
    const selectedLanguage = verse.value?.languages!.find(
      (lang: any) => lang.language === newLanguage
    );
    if (selectedLanguage) {
      Form.value.name = selectedLanguage.name;
      Form.value.description = selectedLanguage.description;
    } else {
      Form.value.name = "";
      Form.value.description = "";
    }
  },
  { immediate: true }
);

const submit = () => {
  FormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      const selectedLanguage = verse.value?.languages!.find(
        (lang: any) => lang.language === Form.value.language
      );

      if (selectedLanguage) {
        // 有数据则为修改
        await putlanguages(selectedLanguage.id, {
          name: Form.value.name,
          description: Form.value.description,
        });
        ElMessage.success(t("verse.view.success1"));
      } else {
        // 没有是数据则为提交
        await postlanguages({
          verse_id: verse.value!.id,
          language: Form.value.language,
          name: Form.value.name,
          description: Form.value.description,
        });
        ElMessage.success(t("verse.view.success2"));
      }

      await getlanguages(verse.value!.id);
    } else {
      ElMessage.error(t("verse.view.error2"));
    }
  });
};

const del = async () => {
  await dellanguages(
    verse.value!.languages![verse.value!.languages!.length - 1].id
  );
  await getlanguages(verse.value!.id);
  FormRef.value?.resetFields();
  await refresh();
  ElMessage.success(t("verse.view.success3"));
};

const info = computed(() =>
  verse.value?.info ? JSON.parse(verse.value.info) : null
);

const saveable = computed(() => {
  if (!verse.value) return false;
  return verse.value.editable;
});

const refresh = async () => {
  const res = await getVerse(
    id.value,
    "image,verseOpen,verseShare,author, message, languages"
  );
  verse.value = res.data;

  const selectedLanguage = verse.value?.languages!.find(
    (lang: any) => lang.language === Form.value.language
  );
  if (selectedLanguage) {
    Form.value.name = selectedLanguage.name;
    Form.value.description = selectedLanguage.description;
  }

  briefing.value = message.value
    ? message.value
    : {
        title: t("verse.view.messageTitle") + `${verse.value!.name}`,
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
  Form.value.language = "zh"; // 默认中文zh
  refresh();
});
</script>

<style scoped></style>
