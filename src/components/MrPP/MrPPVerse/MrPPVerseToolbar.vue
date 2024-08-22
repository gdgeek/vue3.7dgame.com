<template>
  <span>
    <mr-p-p-verse-window-create
      ref="changedDialog"
      dialog-title="修改数据"
      dialog-submit="修 改"
      @submit="submitChange"
    ></mr-p-p-verse-window-create>

    <mr-p-p-verse-qrcode ref="qrcodeRef"></mr-p-p-verse-qrcode>
    <el-button-group v-if="verse" style="float: right" :inline="true">
      <el-button type="info" size="small" @click="qrcode">
        <font-awesome-icon icon="qrcode"></font-awesome-icon>
      </el-button>

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
  if (qrcodeRef.value && props.verse) {
    qrcodeRef.value.open(props.verse.id);
  }
};

const deletedWindow = async () => {
  try {
    await ElMessageBox.confirm(
      "此操作将永久销毁此【宇宙】, 是否继续?",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await del();
  } catch {
    ElMessage({
      type: "info",
      message: "已取消删除",
    });
  }
};

const del = async () => {
  if (props.verse) {
    try {
      await deleteVerse(props.verse.id);
      ElMessage({
        type: "success",
        message: "删除成功!",
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
        message: "修改成功!",
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
