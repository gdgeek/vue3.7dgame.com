<template>
  <div id="Reply">
    <el-container>
      <el-main style="padding-left: 40px">
        <div class="block">
          <el-timeline>
            <el-timeline-item
              :timestamp="$t('verse.view.reply.timestamp')"
              placement="top"
            >
              <el-form
                ref="formRef"
                :model="form"
                :rules="rules"
                label-width="auto"
                class="demo-ruleForm"
              >
                <el-form-item label="" prop="body">
                  <vue-editor
                    id="reply-editor"
                    v-model="form.body"
                    :editor-toolbar="customToolbar"
                    style="width: 100%"
                  ></vue-editor>
                </el-form-item>
                <el-form-item style="float: right; margin-right: 10px">
                  <el-button
                    style="padding: 5px 10px"
                    :disabled="isDisabled"
                    @click="submitForm"
                  >
                    <font-awesome-icon
                      icon="edit"
                      style="margin-right: 5px"
                    ></font-awesome-icon>
                    {{ $t("verse.view.reply.title") }}
                  </el-button>
                </el-form-item>
              </el-form>
              <br />
            </el-timeline-item>

            <div v-if="replies === null">
              <el-timeline-item timestamp="loading..." placement="top">
                <el-skeleton :rows="3" animated></el-skeleton>
              </el-timeline-item>
            </div>

            <div v-else>
              <el-timeline-item
                v-for="reply in replies"
                :key="reply.id"
                placement="top"
              >
                <div class="replytitle">
                  <div class="replyicon">
                    <img src="" alt="" />
                    <el-icon>
                      <User></User>
                    </el-icon>
                  </div>
                  <div class="replynickname">{{ reply.author.nickname }}</div>
                </div>
                <el-card :body-style="{ padding: '15px 10px 0px 20px' }">
                  <div
                    style="min-height: 80px"
                    :innerHTML="sanitizedHtml(reply)"
                  ></div>
                  <div
                    style="
                      float: right;
                      padding: 5px 10px 12px 0;
                      color: #8790a7;
                    "
                    class="bottom clearfix"
                  >
                    <span></span>
                    {{ $t("verse.view.reply.publish") }}
                    <time class="time">{{ reply.updated_at }}</time>
                    &nbsp; &nbsp;
                    <el-button
                      v-if="canDelete(reply)"
                      size="small"
                      type="text"
                      @click="deletedWindow(reply.id)"
                      ><el-icon> <Delete></Delete> </el-icon
                    ></el-button>
                  </div>
                </el-card>
              </el-timeline-item>
            </div>

            <el-pagination
              :current-page="pagination.current"
              :page-count="pagination.count"
              :page-size="pagination.size"
              :total="pagination.total"
              layout="prev, pager, next, jumper"
              background
              @current-change="handleCurrentChange"
            ></el-pagination>
          </el-timeline>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { VueEditor } from "vue3-editor";
import { getReplies, postReply, deleteReply, ReplyType } from "@/api/v1/reply";
import moment from "moment";
import { useTagsStore } from "@/store/modules/tags";
import { useUserStore } from "@/store/modules/user";
import { FormInstance } from "element-plus";
import DOMPurify from "dompurify";

moment.locale("zh-cn");

const props = defineProps<{ messageId: number }>();

const tagsStore = useTagsStore();
const userStore = useUserStore();

const { t } = useI18n();

const pagination = ref({ current: 1, count: 1, size: 20, total: 20 });
const isDisabled = ref(false);
const form = ref<{ body: string }>({ body: "" });
const formRef = ref<FormInstance>();
const replies = ref<ReplyType[]>([]);

const customToolbar = [
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["code-block"],
];

const rules = {
  body: [
    {
      required: true,
      message: t("verse.view.reply.rules.message1"),
      trigger: "blur",
    },
    { min: 10, message: t("verse.view.reply.rules.message2"), trigger: "blur" },
  ],
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const refresh = async () => {
  const response = await getReplies(
    props.messageId,
    "-created_at",
    pagination.value.current
  );
  pagination.value = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
  replies.value = response.data;
};

const canDelete = (item: any) => {
  return userStore.userInfo.data.id === item.author_id;
};
const deletedWindow = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.reply.confirm.message1"),
      t("verse.view.reply.confirm.message2"),
      {
        confirmButtonText: t("verse.view.reply.confirm.confirm"),
        cancelButtonText: t("verse.view.reply.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleteReply(id);
    replies.value = replies.value.filter((reply: any) => reply.id !== id);
    ElMessage({
      type: "success",
      message: t("verse.view.reply.confirm.success"),
    });
  } catch (e) {
    ElMessage({
      type: "info",
      message: t("verse.view.reply.confirm.info"),
    });
  }
};

const resetForm = () => {
  // form.value.body = "";
  formRef.value?.resetFields();
};

const submitForm = async () => {
  isDisabled.value = true;
  setTimeout(() => {
    isDisabled.value = false; // 点击一次时隔三秒后才能再次点击
  }, 3000);

  const valid = await formRef.value?.validate();
  if (valid) {
    const response = await postReply({
      body: form.value.body,
      message_id: props.messageId,
    });

    resetForm();
    if (!replies.value) replies.value = [];
    replies.value.unshift(response.data);

    ElMessage({
      message: t("verse.view.reply.success"),
      type: "success",
    });
  } else {
    console.log("error submit!!");
  }
};

// 返回清理后的 HTML
const sanitizedHtml = (reply: ReplyType) => {
  return reply ? DOMPurify.sanitize(reply.body) : "";
};

onMounted(() => {
  refresh();
});
</script>

<style lang="scss" scoped>
.postheader {
  width: 100%;
  height: 100%;
  padding-left: 40px;
  line-height: 60px;
  font-weight: 500;
  font-size: 18px;
  color: #31829f;
  background-color: #f1f6f3;
}

.replytitle {
  position: relative;
  top: -9px;
  height: 32px;
  min-width: 200px;
}

.replyicon {
  float: left;
  width: 32px;
  height: 32px;
  background-color: rgb(205, 206, 199);
  text-align: center;
  line-height: 32px;
  border-radius: 50%;
}

.replynickname {
  float: left;
  height: 100%;
  line-height: 48px;
  margin-left: 6px;
  color: #444343;
}
</style>
