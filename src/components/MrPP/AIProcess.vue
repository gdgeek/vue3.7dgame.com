<template>
  <div class="document-index">
    <el-card class="box-card-component" style="margin: 18px 18px 0">
      <template #header>
        <div class="box-card-header">
          <h3>{{ $t("ai.generation.title") }}{{ data.name }}</h3>
        </div>
      </template>
      <template #footer>
        <div class="progress-item">
          <el-progress :percentage="progress.percentage"></el-progress>
        </div>
      </template>

      <el-form v-loading="loading" :element-loading-text="progress.title" label-width="auto">
        <el-form-item v-if="imageUrl" :label="$t('ai.generation.form.image')" prop="image">
          <el-image style="max-width: 300px" :src="imageUrl">
            <template #placeholder>
              <div class="image-slot">Loading<span class="dot">...</span></div>
            </template>
          </el-image>
        </el-form-item>
        <el-form-item v-if="props.data.query.prompt" :label="$t('ai.generation.form.prompt')" prop="prompt">
          {{ props.data.query.prompt }}
        </el-form-item>

        <el-form-item v-if="props.data.query.quality" :label="$t('ai.generation.form.quality.title')" prop="quality">
          <el-radio v-model="localData.query.quality" disabled value="high">
            {{ $t("ai.generation.form.quality.value1") }}
          </el-radio>
          <el-radio v-model="localData.query.quality" disabled value="medium">
            {{ $t("ai.generation.form.quality.value2") }}
          </el-radio>
          <el-radio v-model="localData.query.quality" disabled value="low">
            {{ $t("ai.generation.form.quality.value3") }}
          </el-radio>
          <el-radio v-model="localData.query.quality" disabled value="extra-low">
            {{ $t("ai.generation.form.quality.value4") }}</el-radio>
        </el-form-item>

        <div>
          <el-button style="width: 100%" type="primary" @click="process()">{{
            $t("ai.generation.form.submit")
            }}</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import AiRodin from "@/api/v1/ai-rodin";
import { useI18n } from "vue-i18n";
import { sleep } from "@/assets/js/helper";
import { getPicture } from "@/api/v1/resources/index";
import { useRouter } from "vue-router";

const props = defineProps<{ data: any | undefined }>();
const localData = ref({ ...props.data });
const { t } = useI18n();
const loading = ref(false);
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
const resource: Ref<any> = ref<any>(null);
const imageUrl = computed<string | undefined>(() => {
  if (resource.value) {
    return resource.value.image.url;
  }
  return undefined;
});

const rodin = async (step: number) => {
  progress.value.percentage = 5;
  progress.value.title = "AI Generating";
  let data = props.data;
  if (step === 1) {
    const response = await AiRodin.rodin({
      id: data.id,
    });
    data = response.data;
  }
  progress.value.percentage = 10;
  if (step <= 3) {
    let schedule = 0;
    do {
      const response2 = await AiRodin.check(data.id);
      //console.log(response2.data.check);
      schedule = AiRodin.schedule(response2.data.check.jobs);
      progress.value.percentage = 10 + 70 * schedule;
      if (schedule !== 1) {
        await sleep(10000);
      }
    } while (schedule !== 1);
    progress.value.percentage = 80;
    await AiRodin.download(data.id);
  }
  progress.value.percentage = 90;
  if (step <= 4) {
    const response4 = await AiRodin.file(data.id);
    progress.value.percentage = 100;
    return response4.data;
  }
  return props.data;
};

const process = async () => {
  try {
    loading.value = true;
    const data = await rodin(props.data.step);

    if (data.resource_id) {
      router.push({
        path: "/resource/polygen/view",
        query: { id: data.resource_id },
      });
    }
    //if(data.)
  } catch (e: any) {
    ElMessage.error(e.message);
  }
  loading.value = false;
};

onMounted(async () => {
  if (localData.value.query.resource_id) {
    const response = await getPicture(props.data.query.resource_id);
    resource.value = response.data;
    await process();
  }
});
// do not use same name with ref
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
