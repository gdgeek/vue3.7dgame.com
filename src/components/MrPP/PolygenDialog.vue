<template>
  <el-dialog
    v-model="visible"
    :title="$t('polygen.view.title')"
    width="80%"
    append-to-body
    destroy-on-close
    @closed="handleClose"
  >
    <div class="document-index" v-loading="loading">
      <el-row :gutter="20">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <span v-if="polygenData">{{ polygenData.name }}</span>
            </template>
            <div class="box-item">
              <div v-if="polygenData">
                <polygen-view
                  ref="three"
                  :file="polygenData.file"
                  @loaded="loaded"
                  @progress="progress"
                ></polygen-view>
                <el-progress
                  style="width: 100%"
                  :stroke-width="18"
                  v-if="percentage !== 100"
                  :text-inside="true"
                  :percentage="percentage"
                >
                </el-progress>
              </div>
              <el-card v-else>
                <el-skeleton :rows="7"></el-skeleton>
              </el-card>
            </div>
          </el-card>
          <br />
        </el-col>

        <el-col :sm="8">
          <MrppInfo
            v-if="polygenData"
            :title="$t('polygen.view.info.title')"
            titleSuffix=" :"
            :tableData="tableData"
            :itemLabel="$t('polygen.view.info.label1')"
            :textLabel="$t('polygen.view.info.label2')"
            :downloadText="$t('polygen.view.info.download')"
            :renameText="$t('polygen.view.info.name')"
            :deleteText="$t('polygen.view.info.delete')"
            @download="downloadModel"
            @rename="namedWindow"
            @delete="deleteWindow"
          ></MrppInfo>
          <br />
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import PolygenView from "@/components/PolygenView.vue";
import {
  getPolygen,
  putPolygen,
  deletePolygen,
} from "@/api/v1/resources/index";
import { printVector3 } from "@/assets/js/helper";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  modelValue: boolean;
  id: number | null;
}>();

const emit = defineEmits(["update:modelValue", "refresh", "deleted"]);

const { t } = useI18n();
const loading = ref(false);
const polygenData = ref<any>(null);
const percentage = ref(0);
const three = ref<InstanceType<typeof PolygenView> | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const prepare = computed(
  () => polygenData.value !== null && polygenData.value.info !== null
);

const dataInfo = computed(() =>
  prepare.value ? JSON.parse(polygenData.value.info) : null
);

const tableData = computed(() => {
  if (polygenData.value !== null && prepare.value) {
    return [
      { item: t("polygen.view.info.item1"), text: polygenData.value.name },
      {
        item: t("polygen.view.info.item2"),
        text:
          polygenData.value.author.nickname ||
          polygenData.value.author.username,
      },
      {
        item: t("polygen.view.info.item3"),
        text: convertToLocalTime(polygenData.value.created_at),
      },
      {
        item: t("polygen.view.info.item4"),
        text: formatFileSize(polygenData.value.file.size),
      },
      {
        item: t("polygen.view.info.item5"),
        text: printVector3(dataInfo.value.size),
      },
      {
        item: t("polygen.view.info.item6"),
        text: printVector3(dataInfo.value.center),
      },
    ];
  } else {
    return [];
  }
});

const progress = (progress: number) => {
  percentage.value = progress;
};

const loaded = async (info: any) => {
  // Logic mostly removed as preprocessing handles this now.
  // We can keep it for logging or fallback if needed, but for now just log.
  console.log("Model loaded in dialog:", info);
};

const loadData = async () => {
  if (!props.id) return;
  loading.value = true;
  percentage.value = 0;
  try {
    const response = await getPolygen(props.id);
    polygenData.value = (response as any).data;
  } catch (err) {
    ElMessage.error(String(err));
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadData();
    }
  }
);

const handleClose = () => {
  polygenData.value = null;
  percentage.value = 0;
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("polygen.view.confirm.message1"),
      t("polygen.view.confirm.message2"),
      {
        confirmButtonText: t("polygen.view.confirm.confirm"),
        cancelButtonText: t("polygen.view.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    if (polygenData.value) {
      await deletePolygen(polygenData.value.id);
      ElMessage.success(t("polygen.view.confirm.success"));
      emit("deleted");
      emit("update:modelValue", false);
    }
  } catch {
    ElMessage.info(t("polygen.view.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = (await ElMessageBox.prompt(
      t("polygen.view.namePrompt.message1"),
      t("polygen.view.namePrompt.message2"),
      {
        confirmButtonText: t("polygen.view.namePrompt.confirm"),
        cancelButtonText: t("polygen.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: polygenData.value.name,
      }
    )) as { value: string };

    if (value) {
      await putPolygen(polygenData.value.id, { name: value });
      polygenData.value.name = value;
      ElMessage.success(t("polygen.view.namePrompt.success") + value);
      emit("refresh");
    }
  } catch {
    ElMessage.info(t("polygen.view.namePrompt.info"));
  }
};

const downloadModel = async () => {
  if (polygenData.value) {
    await downloadResource(
      polygenData.value,
      ".glb",
      t,
      "polygen.view.download"
    );
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;
</style>
