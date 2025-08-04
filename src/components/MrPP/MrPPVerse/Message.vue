<template>
  <div id="Message">
    <el-divider v-if="tagsMap && message && message.messageTags" content-position="left">
    </el-divider>
    <el-dialog v-model="dialog" width="70%">
      <template #header>
        <span>{{ $t("verse.view.message.header") }}</span>
      </template>
      <mr-p-p-message-from ref="editor" :data="message!" @post="changeMessage"></mr-p-p-message-from>
    </el-dialog>
    <br />
    <el-card>
      <template #header>
        <div class="clearfix">
          <span v-if="!message">{{ $t("verse.view.message.loading") }}</span>
          <span v-else>
            <h4 style="display: inline; color: #676767">{{ message.title }}</h4>
          </span>

          <el-button-group v-if="message && tagsMap" style="float: right" :inline="true">
            <el-button v-if="canUpdate(message)" size="" style="padding: 0 0 0 10px; color: #2190ac" link
              @click="dialog = true">
              {{ $t("verse.view.message.update") }}
            </el-button>
            <el-button v-if="canDelete(message)" size="" style="padding: 0 0 0 10px; color: #2190ac" link
              @click="confirmDeletion(message.id!)">
              {{ $t("verse.view.message.delete") }}
            </el-button>
          </el-button-group>
        </div>
      </template>

      <el-skeleton v-if="!message" :rows="6" animated></el-skeleton>
      <div v-else style="min-height: 100px; font-size: 15px; margin-bottom: 30px" :innerHTML="sanitizedHtml"></div>
      <el-row>
        <el-col :span="14">
          <el-button v-if="message" size="small" :type="message.like ? 'primary' : ''"
            @click="toggleLike(message.like!)">
            <font-awesome-icon icon="fa-solid fa-thumbs-up" style="margin-right: 5px"></font-awesome-icon>
            {{ $t("verse.view.message.like") }}
            <span v-if="message.likesCount != 0">{{ message.likesCount }}</span>
          </el-button>
        </el-col>
        <el-col :span="10" align="right">
          <small v-if="message" style="color: #494949">
            {{ message.author?.nickname || message.author?.username }}
            {{ $t("verse.view.message.edit") }}
            {{ convertToLocalTime(message.updated_at!) }}
          </small>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
  getMessage,
  deleteMessage,
  putMessage,
  MessageType,
  Like,
} from "@/api/v1/message";
import { postLike, removeLike } from "@/api/v1/like";
import MrPPMessageFrom from "@/components/MrPP/MrPPVerse/MrPPMessageFrom.vue";
import { useRouter } from "@/router";
import { useTagsStore } from "@/store/modules/tags";
import { useUserStore } from "@/store/modules/user";
import DOMPurify from "dompurify";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const props = defineProps<{ messageId: number | undefined }>();
const emit = defineEmits<{
  (e: "setMessage", data: MessageType | null): void;
}>();
const router = useRouter();
const tagsStore = useTagsStore();
const userStore = useUserStore();
const dialog = ref(false);
const message = ref<MessageType>();
const { t } = useI18n();
const tagsMap = computed(() => tagsStore.tagsMap);
const userInfo = computed(() => userStore.userInfo);

const canDelete = (message: MessageType) => {
  let managed = 0;
  message!.messageTags!.forEach((item) => {
    const tag = tagsMap.value!.get(item.tag_id);
    if (tag?.managed !== 0) {
      managed |= 1;
      return;
    }
  });
  return message?.author_id === userInfo.value?.id;
};

const canUpdate = (message: MessageType) => {
  let managed = 0;
  message!.messageTags!.forEach((item) => {
    const tag = tagsMap.value!.get(item.tag_id);
    if (tag && tag.managed !== 0) {
      managed |= 1;
    }
  });
  return message?.author_id === userInfo.value?.id;
};

const refresh = async () => {
  if (props.messageId) {
    const response = await getMessage(props.messageId);
    message.value = response.data;
  }
};

const refreshTags = async () => {
  await tagsStore.refreshTags();
};

const toggleLike = async (like: Like) => {
  try {
    if (like) {
      await removeLike(props.messageId!);
      ElMessage.success(t("verse.view.message.message1"));
    } else {
      await postLike(props.messageId!);
      ElMessage.success(t("verse.view.message.message2"));
    }
  } catch (error) {
    console.error(error);
  }
  await refresh();
};

const confirmDeletion = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.message.confirm.message1"),
      t("verse.view.message.confirm.message2"),
      {
        confirmButtonText: t("verse.view.message.confirm.confirm"),
        cancelButtonText: t("verse.view.message.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteMessage(id);
    ElMessage.success(t("verse.view.message.confirm.success"));
    message.value = null;
    router.push({ path: "/community/index" });
  } catch {
    ElMessage.info(t("verse.view.message.confirm.info"));
  }
};

const changeMessage = async (data: any) => {
  if (props.messageId === undefined) return;
  await putMessage(props.messageId, data);
  await refresh();
  dialog.value = false;
};

const sanitizedHtml = computed(() => {
  if (message.value) {
    const updatedHtml = message.value.body.replace(
      /color: rgb\(13, 13, 13\);/g,
      "color: rgb(135, 144, 167);"
    );
    return DOMPurify.sanitize(updatedHtml);
  }
  return "";
});

onMounted(() => {
  if (!tagsMap.value) {
    refreshTags();
  }
  refresh();
});
</script>
