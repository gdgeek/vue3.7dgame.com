<template>
  <div class="document-index">
    <resource-dialog
      @selected="selected"
      @cancel="cancel"
      ref="dialog"
    ></resource-dialog>
    <el-card class="box-card-component" style="margin: 18px 18px 0">
      <template #header>
        <div class="box-card-header">
          <h3>{{ $t("ai.generation.title") }}</h3>
          <span style="font-style: italic; color: #b0b0b0">{{
            $t("ai.generation.declare")
          }}</span>
        </div>
      </template>

      <template #footer>
        <div class="progress-item">
          <el-progress
            v-if="progress.percentage === 100"
            :percentage="100"
            status="success"
          ></el-progress>
          <el-progress v-else :percentage="progress.percentage"></el-progress>
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
        <el-form-item :label="$t('ai.generation.form.image')" prop="image">
          <el-button
            v-if="!imageUrl"
            style="max-width: 300px"
            :icon="Search"
            @click="open"
            round
            >{{ $t("ai.generation.form.select") }}</el-button
          >
          <el-image
            v-else
            style="max-width: 300px"
            @click="open"
            :src="imageUrl"
          >
            <template #placeholder>
              <div class="image-slot">Loading<span class="dot">...</span></div>
            </template>
          </el-image>
        </el-form-item>
        <el-form-item :label="$t('ai.generation.form.prompt')" prop="prompt">
          <el-input v-model="form.prompt"></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('ai.generation.form.quality.title')"
          prop="prompt"
        >
          <el-radio-group v-model="form.quality">
            <el-radio :value="'high'">{{
              $t("ai.generation.form.quality.value1")
            }}</el-radio>
            <el-radio :value="'medium'">{{
              $t("ai.generation.form.quality.value2")
            }}</el-radio>
            <el-radio :value="'low'">{{
              $t("ai.generation.form.quality.value3")
            }}</el-radio>
            <el-radio :value="'extra-low'">{{
              $t("ai.generation.form.quality.value4")
            }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <div>
          <el-button
            style="width: 100%"
            type="primary"
            @click="generation(formRef)"
            >{{ $t("ai.generation.form.submit") }}</el-button
          >
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import AiRodin from "@/api/v1/ai-rodin";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { useI18n } from "vue-i18n";
import { sleep } from "@/assets/js/helper";
import { Search } from "@element-plus/icons-vue";
import type { FormInstance, FormRules, FormItemRule } from "element-plus";
import { useRouter } from "vue-router";

import type { CardInfo } from "@/utils/types";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { AiRodinQuality } from "@/types/ai-rodin";
const { t } = useI18n();
const loading = ref(false);
const dialog = ref<InstanceType<typeof ResourceDialog> | null>(null);
const router = useRouter();

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
const open = () => {
  dialog.value?.openIt({
    type: "picture",
  });
};
const resource: Ref<ResourceInfo | null> = ref(null);
const imageUrl = computed<string | undefined>(() => {
  return resource.value?.image?.url;
});

//const src: Ref<string | undefined> = ref<string | undefined>(undefined);
const selected = (data: CardInfo) => {
  if (isResourceInfo(data.context)) {
    resource.value = data.context;
  } else {
    resource.value = null;
  }
};
const cancel = () => {
  resource.value = null;
};
const rodin = async () => {
  progress.value.percentage = 0;
  progress.value.title = "AI Generating";
  const query: Record<string, string | number> = {};
  if (form.prompt) {
    query.prompt = form.prompt;
  }
  query.quality = form.quality;
  if (resource.value?.id) {
    query.resource_id = resource.value?.id;
  }
  const response = await AiRodin.rodin(query);

  progress.value.percentage = 10;
  const data = response.data;
  let schedule = 0;
  do {
    await sleep(10000);
    const response2 = await AiRodin.check(data.id);
    logger.log(response2.data.check);
    schedule = AiRodin.schedule(response2.data.check.jobs);
    progress.value.percentage = 10 + 70 * schedule;
  } while (schedule !== 1);

  await AiRodin.download(data.id);
  progress.value.percentage = 90;
  const response4 = await AiRodin.file(data.id);
  progress.value.percentage = 100;

  return response4.data;
};

const generation = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async (valid, fields) => {
    if (valid) {
      try {
        loading.value = true;
        const data = await rodin();
        if (data.resource_id) {
          router.push({
            path: "/resource/polygen/view",
            query: { id: data.resource_id },
          });
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        ElMessage.error(message);
      }
      loading.value = false;
    } else {
      logger.log("error submit!", fields);
    }
  });
};
interface RuleForm {
  image_id: number | null;
  prompt: string;
  quality: AiRodinQuality;
}
const formRef = ref<FormInstance>();
const form = reactive<RuleForm>({
  image_id: null,
  prompt: "",
  quality: "medium",
});
const validatePrompt: FormItemRule["validator"] = (_rule, _value, callback) => {
  if (
    (resource.value === null || resource.value === undefined) &&
    !form.prompt
  ) {
    callback(new Error(t("ai.generation.form.error")));
  } else {
    callback();
  }
};
const rules = reactive<FormRules<RuleForm>>({
  prompt: [
    { required: true, validator: validatePrompt, trigger: "blur" },
    {
      min: 4,
      max: 50,
      message: t("ai.generation.form.message"),
      trigger: "blur",
    },
  ],
});

const isResourceInfo = (value: unknown): value is ResourceInfo => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "file" in value
  );
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
