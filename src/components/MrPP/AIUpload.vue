<template>
  <div>
    <div class="document-index">
      <el-card class="box-card-component" style="margin: 18px 18px 0">
        <template #header>
          <div class="box-card-header">
            <h3>create from prompt :</h3>
            declared
          </div>
        </template>
        <div style="position: relative">
          <div v-for="item in data.process" :key="item.name">
            <div class="progress-item">
              <span>{{ item.title }}</span>
              <el-progress :percentage="item.percentage"></el-progress>
            </div>
          </div>

          <el-divider></el-divider>
          {{ data.input }}
          <el-input
            v-model="data.input"
            style="max-width: 600px"
            placeholder="Please input"
            class="input-with-select"
          >
            <template #append
              ><el-button type="primary" @click="create">create</el-button>
            </template>
          </el-input>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import AiRodin from "@/api/v1/ai-rodin";
import { AiRodinResult } from "@/api/v1/ai-rodin";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { FileHandler } from "@/assets/js/file/server";

const { t } = useI18n();
const create = async () => {
  const response = await AiRodin.prompt(data.input);
  console.error(response.data);
  alert(response.data.token);
};
const data = reactive({
  input: "",
  process: [
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
const upload = async () => {};
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
