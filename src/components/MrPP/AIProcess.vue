<template>
  <div class="document-index">
    {{ data }}
    <el-card class="box-card-component" style="margin: 18px 18px 0">
      <template #header>
        <div class="box-card-header">
          <h3>Process Model from AI (Rodin) :{{ data.name }}</h3>
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
        label-width="auto"
      >
        <el-form-item v-if="imageUrl" label="Image" prop="image">
          <el-image style="max-width: 300px" :src="imageUrl">
            <template #placeholder>
              <div class="image-slot">Loading<span class="dot">...</span></div>
            </template>
          </el-image>
        </el-form-item>
        <el-form-item
          v-if="props.data.query.prompt"
          label="Prompt"
          prop="prompt"
        >
          {{ props.data.query.prompt }}
        </el-form-item>

        <div>
          <el-button style="width: 100%" type="primary" @click="process()"
            >Generation</el-button
          >
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import AiRodin from "@/api/v1/ai-rodin";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import FileApi from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";
import { useI18n } from "vue-i18n";
import { sleep } from "@/assets/js/helper";

const props = defineProps<{ data: any | undefined }>();

import {
  Check,
  Delete,
  Edit,
  Message,
  Search,
  Star,
} from "@element-plus/icons-vue";
const { t } = useI18n();
const loading = ref(false);
const dialog = ref();
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

import { getPicture } from "@/api/resources/index";

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
  progress.value.percentage = 0;
  progress.value.title = "AI Generation";
  let data = props.data;
  if (step === 1) {
    //const prompt: string | undefined = data.query?.prompt;
    //const resource_id: number | undefined = data.query?.resource_id;
    const response = await AiRodin.rodin({
      id: data.id,
    });
    data = response.data;
  }
  progress.value.percentage = 10;
  if (step <= 2) {
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
  }
  progress.value.percentage = 80;
  if (step <= 3) {
    await AiRodin.download(data.id);
  }
  progress.value.percentage = 90;
  if (step <= 4) {
    const response4 = await AiRodin.file(data.id);
    progress.value.percentage = 100;
    return response4.data;
  }
};

const process = async () => {
  try {
    loading.value = true;
    await rodin(props.data.step);
  } catch (e: any) {
    ElMessage.error(e.message);
  }
  loading.value = false;
};
onMounted(async () => {
  if (props.data.query.resource_id) {
    const response = await getPicture(props.data.query.resource_id);
    resource.value = response.data;
    // alert(1);
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
