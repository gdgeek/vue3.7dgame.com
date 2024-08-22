<template>
  <div id="Message">
    <el-divider
      v-if="tagsMap && message && message.messageTags"
      content-position="left"
    >
      <!-- <mr-p-p-tags
        v-if="message && tagsMap"
        :tags-map="tagsMap"
        :message="message"
      ></mr-p-p-tags> -->
    </el-divider>
    <el-dialog v-model="dialog" width="70%">
      <template #header>
        <span>修改内容</span>
      </template>
      <mr-p-p-message-from
        ref="editor"
        :data="message!"
        @post="changeMessage"
      ></mr-p-p-message-from>
    </el-dialog>
    <br />
    <el-card>
      <template #header>
        <div class="clearfix">
          <span v-if="!message">载入...</span>
          <span v-else>
            <h4 style="display: inline; color: #494949">{{ message.title }}</h4>
          </span>

          <el-button-group
            v-if="message && tagsMap"
            style="float: right"
            :inline="true"
          >
            <el-button
              v-if="canUpdate(message)"
              size=""
              style="padding: 0 0 0 10px; color: #2190ac"
              type="text"
              @click="dialog = true"
            >
              修改内容
            </el-button>
            <el-button
              v-if="canDelete(message)"
              size=""
              style="padding: 0 0 0 10px; color: #2190ac"
              type="text"
              @click="confirmDeletion(message.id!)"
            >
              删除帖子
            </el-button>
          </el-button-group>
        </div>
      </template>

      <el-skeleton v-if="!message" :rows="6" animated></el-skeleton>
      <div
        v-else
        style="min-height: 100px; font-size: 15px; margin-bottom: 30px"
        :innerHTML="sanitizedHtml"
      ></div>
      <el-row>
        <el-col :span="14">
          <el-button
            v-if="message"
            size="small"
            :type="message.like ? 'primary' : ''"
            @click="toggleLike(message.like!)"
          >
            <font-awesome-icon icon="fa-solid fa-thumbs-up"></font-awesome-icon>
            赞同
            <span v-if="message.likesCount != 0">{{ message.likesCount }}</span>
          </el-button>
        </el-col>
        <el-col :span="10" align="right">
          <small v-if="message" style="color: #8790a7">
            {{ userInfo.data.nickname }} 编辑于 {{ message.updated_at }}
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
import { AbilityMessage } from "@/ability/ability";
// import MrPPTags from "@/components/MrPP/MrPPTags.vue";
import MrPPMessageFrom from "@/components/MrPP/MrPPVerse/MrPPMessageFrom.vue";
import router from "@/router";
import { useTagsStore } from "@/store/modules/tags";
import { useUserStore } from "@/store/modules/user";
import DOMPurify from "dompurify";

const props = defineProps<{ messageId: number }>();
const emit = defineEmits<{
  (e: "setMessage", data: MessageType | null): void;
}>();

const tagsStore = useTagsStore();
const userStore = useUserStore();
const dialog = ref(false);
const message = ref<MessageType>();

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
  return message?.author_id === userInfo.value.data.id;
};

const canUpdate = (message: MessageType) => {
  let managed = 0;
  message!.messageTags!.forEach((item) => {
    const tag = tagsMap.value!.get(item.tag_id);
    if (tag && tag.managed !== 0) {
      managed |= 1;
    }
  });
  return message?.author_id === userInfo.value.data.id;
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
      await removeLike(props.messageId);
      ElMessage({ type: "success", message: "已撤销" });
    } else {
      await postLike(props.messageId);
      ElMessage({ type: "success", message: "已点赞" });
    }
  } catch (error) {
    console.error(error);
  }
  await refresh();
};

const confirmDeletion = async (id: number) => {
  try {
    await ElMessageBox.confirm("是否确定删除?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      closeOnClickModal: false,
      type: "warning",
    });
    await deleteMessage(id);
    ElMessage({ type: "success", message: "删除成功!" });
    message.value = null;
    router.push({ path: "/community/index" });
  } catch {
    ElMessage({ type: "info", message: "已取消删除" });
  }
};

const changeMessage = async (data: any) => {
  await putMessage(props.messageId, data);
  await refresh();
  dialog.value = false;
};

const sanitizedHtml = computed(() => {
  return message.value ? DOMPurify.sanitize(message.value?.body) : "";
});

onMounted(() => {
  if (!tagsMap.value) {
    refreshTags();
  }
  refresh();
});
</script>
