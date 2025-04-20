<template>
  <div class="verse-view">


    <resource-dialog :multiple="false" @selected="selected" ref="resourceDialog"></resource-dialog>
    <br />
    <el-row :gutter="20" style="margin: 0px 18px 0">
      <el-col :sm="16">
        <el-card v-if="item" class="box-card">
          <template #header>
            <el-form ref="itemForm" :rules="rules" v-if="item" :model="item" label-width="80px">
              <el-form-item :label="$t('meta.metaEdit.form.title')" prop="title">
                <el-input v-model="item.title" @change="onSubmit"></el-input>
              </el-form-item>
              <el-form-item :label="$t('meta.metaEdit.form.picture')" prop="title">
                <div class="box-item" style="width: 100%; text-align: center" @click="showImageSelectDialog">
                  <el-image fit="contain" style="width: 100%; height: 300px" :src="image"></el-image>
                </div>
              </el-form-item>
              <el-form-item v-if="prefab" label="Info" prop="title">
                <el-input v-model="jsonInfo" type="textarea" @change="onSubmit"></el-input>
              </el-form-item>
            </el-form>
          </template>

        </el-card>
        <br />
        <el-card v-if="item !== null" class="box-card">
          <!-- <el-button-group style="float: right; padding: 3px 0"> -->

          <el-button v-if="item.viewable" @click="editor" icon="Edit" type="primary" size="small" style="width: 100%">
            {{ $t("meta.metaEdit.contentEdit") }}
          </el-button>
          <!-- <el-button @click="onSubmit" icon="CircleCheck" type="success">
              {{ $t("meta.metaEdit.save") }}
            </el-button>-->
          <!-- </el-button-group> -->
          <br />
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <!--
        <el-card class="box-card">
          <div class="box-item">
            <div v-if="events && events.inputs && events.inputs.length > 0" :label="$t('meta.metaEdit.form.input')">
              <el-divider content-position="left">{{
                $t("meta.metaEdit.form.input")
              }}</el-divider>
              <span v-for="(i, index) in events.inputs" :key="index">
                <el-tag size="small">
                  {{ i.title }}
                </el-tag>
                &nbsp;
              </span>
            </div>
            <div v-if="events && events.outputs && events.outputs.length > 0" :label="$t('meta.metaEdit.form.output')">
              <el-divider content-position="left">{{
                $t("meta.metaEdit.form.output")
              }}</el-divider>
              <span v-for="(i, index) in events.outputs" :key="index">
                <el-tag size="small">
                  {{ i.title }}
                </el-tag>
                &nbsp;
              </span>
            </div>
          </div>
          <br />
        </el-card>-->
        <br />
        <br />
        <br />
        <br />
      </el-col>
    </el-row>

    <!-- 选择图片方式的对话框 -->
    <el-dialog v-model="imageSelectDialogVisible" :title="$t('meta.metaEdit.selectImageMethod')" width="30%"
      align-center>
      <div style="display: flex; justify-content: space-around; margin: 10px 0;">
        <el-button-group>
          <el-button type="primary" @click="openResourceDialog">
            {{ $t("meta.metaEdit.selectFromResource") }}
          </el-button>
          <el-button type="success">
            <el-upload action="" :auto-upload="false" :show-file-list="false" :on-change="handleLocalUpload"
              accept="image/jpeg,image/gif,image/png,image/bmp">

              {{ $t("meta.metaEdit.uploadLocal") }}

            </el-upload>
          </el-button>
        </el-button-group>

      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
//import EventDialog from "@/components/Rete/EventDialog.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import type { metaInfo } from "@/api/v1/meta";
import { ViewCard } from "vue-waterfall-plugin-next/dist/types/types/waterfall";
import { translateRouteTitle } from "@/utils/i18n";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import type { UploadFile, UploadFiles } from "element-plus";

const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const item = ref<metaInfo | null>(null);
const { t } = useI18n();
const imageSelectDialogVisible = ref(false);

const rules = {
  title: [
    {
      required: true,
      message: t("meta.metaEdit.rules.message1"),
      trigger: "blur",
    },
    {
      min: 2,
      max: 20,
      message: t("meta.metaEdit.rules.message2"),
      trigger: "blur",
    },
  ],
};
const itemForm = ref<InstanceType<typeof ElForm> | null>(null);
//const dialog = ref<InstanceType<typeof EventDialog> | null>(null);
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>();
const id = computed(() => parseInt(route.query.id as string, 10));
const prefab = computed({
  get: () => item.value?.prefab === 1,
  set: (value: boolean) => {
    if (item.value) {
      item.value.prefab = value ? 1 : 0;
    }
  },
});

const emit = defineEmits(["getItem", "putItem"]);
/*
const custome = computed({
  get() {
    return item.value?.custome !== false;
  },
  set(value: boolean) {
    if (item.value) {
      item.value.custome = value ? true : false;
    }
  },
});*/
/*
type Event = {
  title: string;
  uuid: string;
};

const events = computed(() => {
  if (item.value) {
    return item.value.events!;
  }
  return { inputs: [], outputs: [] };
});
*/
const image = computed(() => {
  if (item.value && item.value.image) {
    return item.value.image.url;
  }
  return "";
});

const jsonInfo = computed({
  get() {
    // 将 item.info 解析为对象后格式化为 JSON 字符串
    return JSON.stringify(JSON.parse(item.value!.info!), null, 2);
  },
  set(value: string) {
    try {
      // 将输入的字符串解析为对象并赋值给 item.info
      item.value!.info = JSON.stringify(JSON.parse(value));
    } catch (error) {
      console.error("Invalid JSON format", error);
    }
  },
});

const refresh = async () => {
  const data = await getItem(id.value, { expand: "image,author" });
  item.value = data;
};

const getItem = async (id: number, params: any) => {

  return new Promise<metaInfo>((resolve, reject) => {
    try {
      emit("getItem", id, params, (data: metaInfo) => {
        resolve(data);
      });
    } catch (e) {
      reject(e);
    }
  });
};

const putItem = async (id: number, data: metaInfo) => {
  return new Promise<metaInfo>((resolve, reject) => {
    try {
      emit("putItem", id, data, (ret: metaInfo) => {
        resolve(ret);
      });
    } catch (e) {
      reject(e);
    }
  });
};

const editor = () => {
  if (item.value) {
    // 查找路径 `/meta/scene` 的路由对象
    const sceneRoute = router
      .getRoutes()
      .find((route) => route.path === "/meta/scene");
    // 如果找到了路由对象并且它有 meta.title，就进行拼接
    if (sceneRoute && sceneRoute.meta.title) {
      const metaTitle = translateRouteTitle(
        sceneRoute.meta.title
      ).toLowerCase();
      router.push({
        path: "/meta/scene",
        query: {
          id: id.value,
          title: metaTitle + "【" + item.value.title + "】",
        },
      });
    }
  }
};

const showImageSelectDialog = () => {
  imageSelectDialogVisible.value = true;
};

const openResourceDialog = () => {
  if (resourceDialog.value) {
    imageSelectDialogVisible.value = false;
    resourceDialog.value.openIt({
      type: "picture",
    });
  }
};

const handleLocalUpload = async (file: UploadFile, fileList: UploadFiles) => {
  imageSelectDialogVisible.value = false;

  const selectedFile = file.raw;
  if (!selectedFile) {
    ElMessage.error(t("meta.metaEdit.uploadError"));
    return;
  }

  const isValidImage = [
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/gif",
  ].includes(selectedFile.type);
  const isLt2M = selectedFile.size / 1024 / 1024 < 2;

  if (!isValidImage) {
    ElMessage.error(t("meta.metaEdit.invalidImageType"));
    return;
  }
  if (!isLt2M) {
    ElMessage.error(t("meta.metaEdit.imageTooLarge"));
    return;
  }

  try {
    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(selectedFile);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("meta.metaEdit.handlerError"));
      return;
    }

    // 检查文件是否已存在
    const extension = selectedFile.name.split(".").pop() || "";
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      "backup"
    );

    // 如果文件不存在，上传文件
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        selectedFile,
        (p: any) => { },
        handler,
        "backup"
      );
    }

    // 保存图片信息
    await saveLocalImage(md5, extension, selectedFile, handler);
  } catch (error) {
    console.error("上传图片失败:", error);
    ElMessage.error(t("meta.metaEdit.uploadFailed"));
  }
};

const saveLocalImage = async (
  md5: string,
  extension: string,
  file: File,
  handler: any
) => {
  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
  };

  try {
    const post = await postFile(data);

    if (item.value) {
      item.value.image_id = post.data.id;
      await putItem(id.value, item.value);
      ElMessage.success(t("meta.metaEdit.success"));
      await refresh();
    }
  } catch (err) {
    console.error("保存图片信息失败:", err);
    ElMessage.error(t("meta.metaEdit.saveFailed"));
  }
};

const selected = async (data: ViewCard) => {
  if (item.value) {
    item.value.image_id = data.image_id;
    await putItem(id.value, item.value);
    ElMessage.success(t("meta.metaEdit.success"));
    await refresh();
  }
};

const onSubmit = async () => {
  const valid = await itemForm.value!.validate();
  if (valid && item.value) {
    item.value.prefab = item.value.prefab ? 1 : 0;
    await putItem(id.value, item.value);
    ElMessage.success(t("meta.metaEdit.success"));
    await refresh();
  } else {
    console.error("error submit!!");
    ElMessage.error(t("verse.view.error2"));
  }
};

onMounted(refresh);
</script>

<style scoped>
.box-item {
  cursor: pointer;
}
</style>
