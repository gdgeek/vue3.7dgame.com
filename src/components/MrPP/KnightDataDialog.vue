<template>
  <div>
    <el-dialog v-model="dialogVisible" width="95%" :show-close="false" @close="cancel">
      <template #header>
        112 {{ $t("verse.view.prefabDialog.knight.title") }}
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
const schema = ref<Schema>();
const dialogVisible = ref(false);
const { t, locale } = useI18n();
let callback: ((data: any) => void) | null = null;

interface SchemaProperty {
  type: string;
  title: string;
  default?: any;
  value?: any;
  "ui:hidden"?: string;
  "ui:options"?: {
    placeholder?: string;
    type?: string;
    rows?: number;
  };
  minLength?: number;
}
/*
{"type":"object","required":["type","style"],"properties":{"type":{"type":"string","title":"类型","default":"candy","value":"candy","ui:hidden":"true"},"uuid":{"type":"string","title":"唯一id","default":"fadb7153-92ab-01b8-d186-95be849bef5f"}}}

{"type":"object","required":["type","name"],"properties":{"type":{"type":"string","title":"类型","default":"star","value":"star","ui:hidden":"true"},"name":{"type":"string","title":"物品名称","default":"normal"}}}

*/

interface Schema {
  type: string;
  required?: string[];
  properties: Record<string, SchemaProperty>;
}

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

const open = ({
  schema: newSchema,
  callback: newCallback,
  data,
}: {
  schema: Schema;
  callback: (data: any) => void;
  data: FormData;
}) => {
  const currentLocale = locale.value;
  schema.value = newSchema;
  /*
  if (currentLocale === "en") {
    newSchema.properties.name.title = "Item Name";
  } else if (currentLocale === "ja") {
    newSchema.properties.name.title = "アイテム名";
  } else {
    newSchema.properties.name.title = "物品名称";
  }
*/
  callback = newCallback;
  formData.value = data;
  dialogVisible.value = true;
};

const cancel = () => {
  dialogVisible.value = false;
};

defineExpose({
  open,
});
</script>
