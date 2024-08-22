<template>
  <div>
    <el-dialog v-model="post.visible" width="30%" :close-on-click-modal="false">
      <template #header> 共享给其他用户 </template>
      <el-form :model="post.form" ref="postRef" label-width="80px">
        <el-form-item
          label="用户名"
          prop="username"
          :rules="[
            { required: true, message: '用户名不能为空', trigger: 'blur' },
          ]"
        >
          <el-input
            type="text"
            v-model="post.form.username"
            placeholder="请输入用户名"
            autocomplete="off"
          ></el-input>
        </el-form-item>

        <el-form-item label="相关信息" prop="content">
          <el-input type="textarea" v-model="post.form.content"></el-input>
        </el-form-item>
        <el-form-item label="编辑权限" prop="editable">
          <el-checkbox
            v-model="post.form.editable"
            label="可编辑"
            border
          ></el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="onPost">
              确 认
            </el-button>

            <el-button size="small" @click="post.visible = false">
              取 消
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog v-model="put.visible" width="30%" :close-on-click-modal="false">
      <template #header> 修改共享信息 </template>
      <el-form :model="put.form" ref="putRef" label-width="80px">
        <el-form-item
          label="用户名"
          prop="username"
          :rules="[
            { required: true, message: '用户名不能为空', trigger: 'blur' },
          ]"
        >
          {{ put.form.username }}
        </el-form-item>

        <el-form-item label="相关信息" prop="content">
          <el-input type="textarea" v-model="put.form.content"></el-input>
        </el-form-item>
        <el-form-item label="编辑权限" prop="editable">
          <el-checkbox
            v-model="put.form.editable"
            label="可编辑"
            border
          ></el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="onPut">
              确 认
            </el-button>

            <el-button size="small" @click="put.visible = false">
              取 消
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-dialog>

    <br />
    <el-card>
      <template #header>
        <div class="clearfix">
          <b>【宇宙】共享</b>
        </div>
      </template>
      <el-collapse v-if="items != null && items.length !== 0" accordion>
        <el-collapse-item v-for="item in items" :key="item.id">
          <template #title>
            <el-tooltip
              class="item"
              effect="light"
              :content="item.user.username"
              placement="top"
            >
              <div
                v-if="item.user.nickname !== '' && item.user.nickname !== null"
              >
                <i class="el-icon-edit" v-if="item.editable === 1"></i>
                <i class="el-icon-view" v-else></i>

                {{ item.user.nickname }}
              </div>
              <div v-else>
                <i class="el-icon-edit" v-if="item.editable === 1"></i>
                <i class="el-icon-view" v-else></i>

                {{ item.user.username }}
              </div>
            </el-tooltip>
          </template>
          <div>
            {{ JSON.parse(item.info).content }}
            <el-divider size="small" content-position="right">
              <el-button-group size="small" v-if="saveable">
                <el-button size="small" @click="setup(item)">
                  <el-icon><EditPen></EditPen></el-icon>
                </el-button>
                <el-button size="small" @click="del(item.id)">
                  <el-icon><Close></Close></el-icon>
                </el-button>
              </el-button-group>
            </el-divider>
          </div>
        </el-collapse-item>
      </el-collapse>

      <br />
      <el-button
        v-if="saveable"
        style="width: 100%"
        @click="open"
        type="primary"
        size="small"
      >
        <font-awesome-icon icon="handshake"></font-awesome-icon>
        &nbsp;共享给好友
      </el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
  postVerseShare,
  getVerseShares,
  deleteVerseShare,
  putVerseShare,
} from "@/api/v1/verse-share";
import { AbilityEditable } from "@/ability/ability";
import { FormInstance } from "element-plus";
import { VerseData } from "@/api/v1/verse";

const props = defineProps<{
  verse: VerseData;
}>();

const items = ref<any[]>([]);

const post = reactive({
  visible: false,
  form: {
    username: "",
    content: null as string | null,
    editable: true,
  },
});

const put = reactive({
  visible: false,
  id: -1,
  form: {
    username: "",
    content: null as string | null,
    editable: true,
  },
});

const postRef = ref<FormInstance>();
const putRef = ref<FormInstance>();

const verseId = computed(() => props.verse.id);

const saveable = computed(() => {
  return props.verse && props.verse.editable;
});

const refresh = async () => {
  try {
    const r = await getVerseShares(verseId.value);
    items.value = r.data;
  } catch (e: any) {
    console.error(e.message);
  }
};

const open = () => {
  post.visible = true;
};

const setup = (item: any) => {
  put.form.username = item.user.username;
  put.id = item.id;
  put.form.content = JSON.parse(item.info).content;
  put.form.editable = item.editable === 1;
  put.visible = true;
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm("是否确认关闭共享？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await deleteVerseShare(id);
    await refresh();
    ElMessage({
      type: "success",
      message: "删除成功!",
    });
  } catch (e) {
    ElMessage({
      type: "info",
      message: "已取消删除",
    });
  }
};

const onPut = async () => {
  if (!putRef.value) return;
  const valid = await putRef.value.validate();
  if (valid) {
    try {
      await putVerseShare(put.id, {
        username: put.form.username,
        verse_id: verseId.value,
        editable: put.form.editable ? 1 : 0,
        info: JSON.stringify({ content: put.form.content }),
      });
      await refresh();
      put.visible = false;
    } catch (e: any) {
      console.error(e.message);
    }
  } else {
    console.log("error submit!!");
    put.visible = false;
  }
};

const onPost = async () => {
  if (!postRef.value) return;
  const valid = await postRef.value.validate();
  if (valid) {
    try {
      await postVerseShare({
        username: post.form.username,
        verse_id: verseId.value,
        editable: post.form.editable ? 1 : 0,
        info: JSON.stringify({ content: post.form.content }),
      });
      await refresh();
      post.visible = false;
    } catch (e: any) {
      console.error(e.message);
    }
  } else {
    console.log("error submit!!");
    post.visible = false;
  }
};

onMounted(() => {
  refresh();
});
</script>

<style lang="scss" scoped>
.info-content-label {
  width: 70px;
}

.icon {
  width: 10px;
}
</style>
