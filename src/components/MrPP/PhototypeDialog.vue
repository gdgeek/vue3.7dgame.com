<template>
  <div>

    <el-dialog v-model="dialogVisible" width="95%" :show-close="false" @close="cancel">
      <template #header>
        {{ $t("verse.view.prefabDialog.knight.title") }}
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
import { v4 as uuidv4 } from "uuid";
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
// 或者用 interface
interface Handler {
  (data: any): any
}
const handlers: Map<string, Handler> = new Map([
  ["uuid", (data: any): any => {
    if (!data) {
      return uuidv4()
    };
    return data;
  }],
]);


const handlerChange = ({
  oldValue,
  newValue,
}: {
  oldValue: any;
  newValue: any;
}) => {
  const properties = schema.value?.properties as Record<string, any> || {}
  for (const [key, val] of Object.entries(properties)) {
    for (const [key1, val1] of Object.entries(val)) {
      const match = /^setup:(.+)$/.exec(key1)
      if (match) {
        const setupName = match[1]   // 拿到冒号后面的值
        const handler = handlers.get(setupName);
        if (handler) {
          newValue[key] = handler(newValue[key]);
        }

        console.error(`找到 setup 属性 "${key1}"，分解后：${setupName}`, val1)

      }
    }
  }
};

const open = (iSchema: any, iCallback: (data: any) => void) => {

  formData.value = {};
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
