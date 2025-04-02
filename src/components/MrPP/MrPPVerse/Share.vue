<template>
  <div>
    <el-dialog v-model="post.visible" width="30%" :close-on-click-modal="false">
      <template #header> {{ $t("verse.view.share.header1") }} </template>
      <el-form :model="post.form" ref="postRef" label-width="auto">
        <el-form-item :label="$t('verse.view.share.form.label1')" prop="username" :rules="[
          {
            required: true,
            message: $t('verse.view.share.form.ruleMessage'),
            trigger: 'blur',
          },
        ]">
          <el-input type="text" v-model="post.form.username" :placeholder="$t('verse.view.share.form.placeholder')"
            autocomplete="off"></el-input>
        </el-form-item>

        <el-form-item :label="$t('verse.view.share.form.label2')" prop="content">
          <el-input type="textarea" v-model="post.form.content"></el-input>
        </el-form-item>
        <el-form-item :label="$t('verse.view.share.form.label3')" prop="editable">
          <el-checkbox v-model="post.form.editable" :value="$t('verse.view.share.form.label4')" border></el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="onPost">
              {{ $t("verse.view.share.form.confirm") }}
            </el-button>

            <el-button size="small" @click="post.visible = false">
              {{ $t("verse.view.share.form.cancel") }}
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog v-model="put.visible" width="30%" :close-on-click-modal="false">
      <template #header> {{ $t("verse.view.share.header1") }} </template>
      <el-form :model="put.form" ref="putRef" label-width="auto">
        <el-form-item :label="$t('verse.view.share.form.label1')" prop="username" :rules="[
          {
            required: true,
            message: $t('verse.view.share.form.ruleMessage'),
            trigger: 'blur',
          },
        ]">
          {{ put.form.username }}
        </el-form-item>

        <el-form-item :label="$t('verse.view.share.form.label2')" prop="content">
          <el-input type="textarea" v-model="put.form.content"></el-input>
        </el-form-item>
        <el-form-item :label="$t('verse.view.share.form.label3')" prop="editable">
          <el-checkbox v-model="put.form.editable" :value="$t('verse.view.share.form.label4')" border></el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="onPut">
              {{ $t("verse.view.share.form.confirm") }}
            </el-button>

            <el-button size="small" @click="put.visible = false">
              {{ $t("verse.view.share.form.cancel") }}
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-dialog>
    <br />
    <el-card>
      <template #header>
        <div class="clearfix">
          <b>{{ $t("verse.view.share.title1") }}</b>
        </div>
      </template>
      <el-collapse v-if="items != null && items.length !== 0" accordion>
        <el-collapse-item v-for="item in items" :key="item.id">
          <template #title>
            <el-tooltip class="item" effect="light" :content="item.user.username" placement="top">
              <div v-if="item.user.nickname !== '' && item.user.nickname !== null">
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
                <el-button size="small" @click="_setup(item)">
                  <el-icon>
                    <EditPen></EditPen>
                  </el-icon>
                </el-button>
                <el-button size="small" @click="del(item.id)">
                  <el-icon>
                    <Close></Close>
                  </el-icon>
                </el-button>
              </el-button-group>
            </el-divider>
          </div>
        </el-collapse-item>
      </el-collapse>

      <br />
      <el-button v-if="saveable" style="width: 100%" @click="open" type="primary" size="small">
        <font-awesome-icon icon="handshake"></font-awesome-icon>
        &nbsp;{{ $t("verse.view.share.title2") }}
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
import { AbilityEditable, UpdateAbility } from "@/utils/ability";
import { FormInstance } from "element-plus";
import { VerseData } from "@/api/v1/verse";
import { useAbility } from "@casl/vue";

const ability = useAbility();
// 绑定 `can` 方法，确保上下文正确
const can = ability.can.bind(ability);

const props = defineProps<{
  verse: VerseData | null;
}>();

const items = ref<any[]>([]);

const { t } = useI18n();

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

const verseId = computed(() => props.verse?.id);

const saveable = computed(() => {
  return props.verse && props.verse.editable;
});

const refresh = async () => {
  try {
    // 添加检查确保verseId.value存在
    if (verseId.value === undefined) {
      console.warn('无法刷新分享列表：verse ID 未定义');
      return;
    }

    const r = await getVerseShares(verseId.value);
    items.value = r.data;
  } catch (e: any) {
    console.error(e.message);
  }
};

const open = () => {
  post.visible = true;
};

const _setup = (item: any) => {
  put.form.username = item.user.username;
  put.id = item.id;
  put.form.content = JSON.parse(item.info).content;
  put.form.editable = item.editable === 1;
  put.visible = true;
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.share.confirm.message1"),
      t("verse.view.share.confirm.message2"),
      {
        confirmButtonText: t("verse.view.share.confirm.confirm"),
        cancelButtonText: t("verse.view.share.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteVerseShare(id);
    await refresh();
    ElMessage({
      type: "success",
      message: t("verse.view.share.confirm.success"),
    });
  } catch (e) {
    ElMessage({
      type: "info",
      message: t("verse.view.share.confirm.info"),
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
