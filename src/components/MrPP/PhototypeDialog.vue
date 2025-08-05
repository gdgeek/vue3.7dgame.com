<template>
  <div>

    <el-dialog v-model="dialogVisible" width="95%" :show-close="false" @close="cancel">
      <template #header>
        {{ $t("verse.view.prefabDialog.knight.title") }} {{ formData }}!!
      </template>
      <template #footer>
        <vue-form v-model="formData" :schema="schema" :form-footer="formFooter" @submit="handlerSubmit"
          @cancel="handlerCancel" @change="handlerChange"></vue-form>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
const formData = ref({});
const schema = ref<any>();
const dialogVisible = ref(false);
const { t, locale } = useI18n();
let callback: ((data: any) => void) | null = null;

interface FormData {
  [key: string]: any;
}

const formFooter = computed(() => ({
  okBtn: t("verse.view.prefabDialog.knight.save"),
  cancelBtn: t("verse.view.prefabDialog.knight.cancel"),
}));

const handlerSubmit = async () => {
  if (callback) {
    callback(formData.value);
  }
  dialogVisible.value = false;
};

const handlerCancel = () => {
  dialogVisible.value = false;
  ElMessage.warning(t("verse.view.prefabDialog.knight.warn"));
};

const handlerChange = ({
  oldValue,
  newValue,
}: {
  oldValue: any;
  newValue: any;
}) => {
  // 可以根据需要处理数据变化
};

const open = (iSchema: any, iCallback: (data: any) => void) => {

  schema.value = iSchema;
  callback = iCallback;
  dialogVisible.value = true;
}

const cancel = () => {
  dialogVisible.value = false;
};

defineExpose({
  open,
});
</script>
