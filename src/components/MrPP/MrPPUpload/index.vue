<template>
  <div>
    <div class="document-index">
      <el-card class="box-card-component" style="margin: 18px 18px 0">
        <template #header>
          <div class="box-card-header">
            <h3>{{ title }}:</h3>
            {{ declared }}
          </div>
        </template>
        <div style="position: relative">
          <div v-for="item in data" :key="item.name">
            <div class="progress-item">
              <span>{{ item.title }}</span>
              <el-progress :percentage="item.percentage"></el-progress>
            </div>
          </div>

          <el-divider></el-divider>
          <el-button type="primary" :disabled="isDisabled" @click="select">
            <slot>11</slot>
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    fileType: string;
    dir: string | null;
    advanced?: boolean;
  }>(),
  {
    fileType: "*",
    dir: null,
    advanced: false,
  }
);

const emit = defineEmits([
  "saveResource",
  "allFilesUploaded",
  "singleFileUploaded",
]);
const fileStore = useFileStore();

const data = computed(() => [
  {
    name: "md5",
    title: t("upload.item1.title"),
    failed: t("upload.item1.failed"),
    declared: t("upload.item1.declared"),
    percentage: 0,
    status: "",
  },
  {
    name: "upload",
    title: t("upload.item2.title"),
    failed: t("upload.item2.failed"),
    declared: t("upload.item2.declared"),
    percentage: 0,
    status: "",
  },
  {
    name: "save",
    title: t("upload.item3.title"),
    failed: t("upload.item3.failed"),
    declared: t("upload.item3.declared"),
    percentage: 0,
    status: "",
  },
]);

// 默认
const defaultTitle = computed(() => t("upload.title"));
const defaultDeclared = computed(() => t("upload.declared"));
// 自定义
const changeTitle = ref<string | null>(null);
const changeDeclared = ref<string | null>(null);

const title = computed(() => changeTitle.value ?? defaultTitle.value);
const declared = computed(() => changeDeclared.value ?? defaultDeclared.value);

const isDisabled = ref(false);

// 更新标题和声明信息
const step = (idx: number) => {
  const item = data.value[idx];
  changeTitle.value = item.title;
  changeDeclared.value = item.declared;
};

// 更新进度条
const progress = (p: number, idx: number) => {
  step(idx);
  data.value[idx].status = p >= 1 ? "success" : "";
  data.value[idx].percentage = Math.round(Math.min(p, 1) * 100);
};

const saveFile = async (
  md5: string,
  extension: string,
  file: File,
  handler: FileHandler
) => {
  const data = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, props.dir || ""),
  };

  progress(1, 1);

  try {
    const response = await postFile(data);
    emit("saveResource", data.filename, response.data.id, () => {
      progress(2, 1);
    });
  } catch (err) {
    console.error(err);
  }
};

// 选择文件并上传
const select = async () => {
  try {
    const files = await fileStore.store.fileOpen(props.fileType, true);
    isDisabled.value = true; // 禁用按钮

    let completedCount = 0; // 已完成文件计数
    const totalFiles = files.length; // 总文件数
    console.log("总文件数", totalFiles);

    for (const file of files) {
      try {
        const md5 = await fileStore.store.fileMD5(file, (p: number) =>
          progress(p, 0)
        );
        const handler = await fileStore.store.publicHandler();
        const has = await fileStore.store.fileHas(
          md5,
          file.extension!,
          handler,
          props.dir!
        );

        if (!has) {
          await fileStore.store.fileUpload(
            md5,
            file.extension!,
            file,
            (p: number) => progress(p, 1),
            handler,
            props.dir!
          );
        }

        await saveFile(md5, file.extension!, file, handler);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      } finally {
        completedCount++;
        console.log("已完成", completedCount, "个文件");
        // 如果是多文件上传，且所有文件处理完成
        if (completedCount === totalFiles) {
          console.log("多文件上传");
          emit("allFilesUploaded");
          isDisabled.value = false;
        }
      }
    }
  } catch (error) {
    console.error("Error in select function:", error);
    isDisabled.value = false;
  }
};
</script>

<style scoped>
.document-index {
  padding: 20px;
}

.box-card-component {
  margin-bottom: 20px;
}

.box-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-item {
  margin-bottom: 10px;
}
</style>
