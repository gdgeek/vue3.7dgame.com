<template>
  <span>
    <!-- 修改对话框组件 -->
    <mr-p-p-verse-window-create
      ref="changedDialog"
      :dialog-title="$t('verse.page.list.toolbar.dialogTitle')"
      :dialog-submit="$t('verse.page.list.toolbar.dialogSubmit')"
      @submit="submitChange"
    ></mr-p-p-verse-window-create>
    <!-- 按钮组 -->
    <el-button-group v-if="verse" style="float: right" :inline="true">
      <el-button
        v-if="saveable"
        type="success"
        size="small"
        icon="Edit"
        @click="changedWindow"
      ></el-button>
      <el-button
        v-if="deleteable"
        type="danger"
        size="small"
        icon="delete"
        @click="deletedWindow"
      ></el-button>
      &nbsp;
    </el-button-group>
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { putVerse, deleteVerse, VerseData } from "@/api/v1/verse";
import MrPPVerseWindowCreate from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";

const props = defineProps<{
  verse: VerseData;
}>();

const { t } = useI18n();
const emit = defineEmits(["deleted", "changed"]);

// 引用组件
const changedDialog = ref<InstanceType<typeof MrPPVerseWindowCreate> | null>(
  null
);
// const qrcodeRef = ref<InstanceType<typeof MrPPVerseQrcode> | null>(null);

// 计算属性：是否可以删除
const deleteable = computed(() => !!props.verse?.editable);

// 计算属性：是否可以保存
const saveable = computed(() => !!props.verse?.editable);

// 删除确认窗口
const deletedWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("verse.page.list.toolbar.confirm.message1"),
      t("verse.page.list.toolbar.confirm.message2"),
      {
        confirmButtonText: t("verse.page.list.toolbar.confirm.confirm"),
        cancelButtonText: t("verse.page.list.toolbar.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await del();
  } catch {
    ElMessage({
      type: "info",
      message: t("verse.page.list.toolbar.confirm.info"),
    });
  }
};

// 执行删除操作
const del = async () => {
  if (!props.verse) return;

  try {
    await deleteVerse(props.verse.id);
    ElMessage({
      type: "success",
      message: t("verse.page.list.toolbar.confirm.success"),
    });
    emit("deleted", props.verse);
  } catch (error) {
    console.error(error);
    ElMessage({
      type: "error",
      message: t("verse.page.list.toolbar.confirm.error"),
    });
  }
};

// 提交修改
const submitChange = async (form: any, item: any, imageId: number | null) => {
  if (!props.verse) return;

  const data: { name: string; info: string; image_id?: number } = {
    name: form.name,
    info: JSON.stringify(form),
  };

  if (imageId !== null) {
    data.image_id = imageId;
  }

  try {
    const response = await putVerse(props.verse.id, data);
    ElMessage({
      type: "success",
      message: t("verse.page.list.toolbar.success"),
    });
    changedDialog.value?.hide();
    emit("changed", response.data);
  } catch (error) {
    console.error(error);
    ElMessage({
      type: "error",
      message: t("verse.page.list.toolbar.changeError"),
    });
  }
};

// 打开修改窗口
const changedWindow = () => {
  if (changedDialog.value && props.verse) {
    changedDialog.value.show(props.verse);
  }
};
</script>
