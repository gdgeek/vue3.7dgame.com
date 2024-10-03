<template>
  <div class="document-index">
    <el-card class="box-card-component" style="margin: 18px 18px 0">
      <template #header>
        <div class="box-card-header">
          <h3>create from prompt :</h3>
          {{ progress.declared }}
        </div>
      </template>

      <template #footer
        ><div class="progress-item">
          <el-progress :percentage="progress.percentage"></el-progress>
        </div>
      </template>
      <el-form
        v-loading="loading"
        :element-loading-text="progress.title"
        ref="formRef"
        :rules="rules"
        :model="form"
        label-width="auto"
      >
        <el-form-item label="Prompt" prop="prompt">
          <el-input v-model="form.prompt" />
        </el-form-item>

        <div>
          <el-button
            style="width: 100%"
            type="primary"
            @click="generation(formRef)"
            >Generation</el-button
          >
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import AiRodin from "@/api/v1/ai-rodin";
import { AiRodinResult } from "@/api/v1/ai-rodin";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import FileApi from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";
import { useI18n } from "vue-i18n";
import { sleep } from "@/assets/js/helper";
const { t } = useI18n();
const loading = ref(false);
import type { FormInstance, FormRules } from "element-plus";

export type ProgressType = {
  title: string;
  percentage: number;
  declared: string;
};
const progress = ref<ProgressType>({
  title: "generative",
  percentage: 0,
  declared: "declared",
});
const rodin = async (prompt: string) => {
  progress.value.percentage = 0;
  progress.value.title = "AI Generation";
  const response = await AiRodin.prompt(prompt);

  progress.value.percentage = 10;
  const data = response.data;
  let schedule = 0;
  do {
    await sleep(10000);
    const response2 = await AiRodin.check(data.id);
    console.log(response2.data.check);
    schedule = AiRodin.schedule(response2.data.check.jobs);
    progress.value.percentage = 10 + 80 * schedule;
  } while (schedule !== 1);

  await AiRodin.download(data.id);
  const response4 = await AiRodin.file(data.id);
  const fileData = {
    filename: prompt + ".glb",
    md5: response4.data.ETag,
    key: response4.data.Location,
    url: response4.data.Location,
  };
  FileApi.post(fileData);
  return response4.data.file.Location;
};

const save = async (url: string) => {
  return true;
};
const generation = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async (valid, fields) => {
    if (valid) {
      try {
        loading.value = true;
        const url = await rodin(form.prompt);
        const data = await save(url);
      } catch (e: any) {
        ElMessage.error(e.message);
      }
      loading.value = false;
    } else {
      console.log("error submit!", fields);
    }
  });
};
const data = reactive({
  process: [
    {
      name: "generative",
      title: "generative",
      failed: t("upload.item0.failed"),
      declared: t("upload.item0.declared"),
      percentage: 0,
      status: "",
    },
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
  ],
});
interface RuleForm {
  prompt: string;
}
const formRef = ref<FormInstance>();
// do not use same name with ref
const form = reactive<RuleForm>({
  prompt: "",
});

const rules = reactive<FormRules<RuleForm>>({
  prompt: [
    { required: true, message: "Please input Prompt name", trigger: "blur" },
    { min: 4, max: 50, message: "Length should be 4 to 50", trigger: "blur" },
  ],
});
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
.el-col {
  border-radius: 4px;
}

.grid-content {
  border-radius: 4px;
  min-height: 36px;
}

:root {
  --ep-c-bg-row: #f9fafc;
  --ep-c-bg-purple: #d3dce6;
  --ep-c-bg-purple-dark: #99a9bf;
  --ep-c-bg-purple-light: #e5e9f2;
}

.dark {
  --ep-c-bg-row: #18191a;
  --ep-c-bg-purple: #46494d;
  --ep-c-bg-purple-dark: #242526;
  --ep-c-bg-purple-light: #667180;
}

.row-bg {
  padding: 10px 0;
  background-color: #f9fafc;
}

.ep-bg-purple-dark {
  background: #99a9bf;
}

.ep-bg-purple {
  background: #d3dce6;
}

.ep-bg-purple-light {
  background: #e5e9f2;
}
</style>
