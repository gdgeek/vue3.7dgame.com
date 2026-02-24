<template>
  <resource-dialog
    :multiple="false"
    ref="resourceDialog"
    @selected="handleSelected"
  ></resource-dialog>

  <div v-if="props.resource">
    <el-card class="box-card">
      <!-- 强制刷新 polygen-view，当 file 改变时 -->
      <polygen-view
        ref="three"
        :file="props.resource.file"
        :key="props.resource.uuid"
      ></polygen-view>
      <br />

      <el-button
        icon="box"
        @click="selecteModel"
        size="small"
        style="width: 100%"
      >
        选择模型
      </el-button>
    </el-card>
  </div>
  <div v-else>
    <el-card class="box-card">
      <el-button
        icon="box"
        @click="selecteModel"
        size="small"
        style="width: 100%"
      >
        选择模型
      </el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>(null);
import { logger } from "@/utils/logger";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import PolygenView from "./PolygenView.vue";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { CardInfo } from "@/utils/types";
const props = defineProps<{
  resource: ResourceInfo | null;
}>();
const handleSelected = (data: CardInfo, _replace: boolean) => {
  emit("selected", data.context as ResourceInfo);
};

const emit = defineEmits<{
  (e: "selected", data: ResourceInfo): void;
}>();
const selecteModel = () => {
  resourceDialog.value?.openIt({ type: "polygen" });
  logger.log("selecteModel");
};
</script>
