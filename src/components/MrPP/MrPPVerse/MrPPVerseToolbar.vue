<template>
  <span>
    <mr-p-p-verse-window-create
      ref="changedDialog"
      :dialog-title="$t('verse.page.list.toolbar.dialogTitle')"
      :dialog-submit="$t('verse.page.list.toolbar.dialogSubmit')"
      @submit="submitChange"
    ></mr-p-p-verse-window-create>

    <mr-p-p-verse-qrcode ref="qrcodeRef"></mr-p-p-verse-qrcode>
    <el-button-group v-if="verse" style="float: right" :inline="true">
      <!--
      <el-button type="info" size="small" @click="qrcode">
        <font-awesome-icon icon="qrcode"></font-awesome-icon>
      </el-button>
-->
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
import { useAbility } from "@/ability/ability";
import { putVerse, deleteVerse, VerseData } from "@/api/v1/verse";
import MrPPVerseQrcode from "@/components/MrPP/MrPPVerse/MrPPQRcodeVerse.vue";
import MrPPVerseWindowCreate from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  verse: VerseData;
}>();

const { t } = useI18n();

const emit = defineEmits(["deleted", "changed"]);

const changedDialog = ref<InstanceType<typeof MrPPVerseWindowCreate> | null>(
  null
);
const qrcodeRef = ref<InstanceType<typeof MrPPVerseQrcode> | null>(null);

const deleteable = computed(() => {
  if (!props.verse) return false;
  return props.verse.editable;
});

const saveable = computed(() => {
  if (!props.verse) return false;
  return props.verse.editable;
});

const qrcode = () => {
  /*if (qrcodeRef.value && props.verse) {
    qrcodeRef.value.open(props.verse.id);
  }*/
};

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

const del = async () => {
  if (props.verse) {
    try {
      await deleteVerse(props.verse.id);
      ElMessage({
        type: "success",
        message: t("verse.page.list.toolbar.confirm.success"),
      });
      emit("deleted", props.verse);
    } catch (error) {
      console.error(error);
    }
  }
};

const submitChange = async (form: any, item: any, imageId: number | null) => {
  if (props.verse) {
    console.log("修改数据", form, item, imageId);
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
      if (changedDialog.value) {
        changedDialog.value.hide();
      }
      emit("changed", response.data);
    } catch (error) {
      console.error(error);
    }
  }
};

const changedWindow = () => {
  if (changedDialog.value && props.verse) {
    console.log("props.verse", props.verse);
    changedDialog.value.show(props.verse);
  }
};
</script>
