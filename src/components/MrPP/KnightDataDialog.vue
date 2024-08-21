<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="95%"
      :show-close="false"
      @close="cancel"
    >
      <template #title> 输入数据 </template>
      <template #footer>
        <el-form
          v-model="formData"
          :schema="schema"
          @on-submit="handlerSubmit"
          @on-cancel="handlerCancel"
          @on-change="handlerChange"
        ></el-form>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
const formData = ref({});
const schema = ref({});
const dialogVisible = ref(false);
let callback: ((data: any) => void) | null = null;

const handlerSubmit = async () => {
  if (callback) {
    callback(formData.value);
  }
  dialogVisible.value = false;
};

const handlerCancel = () => {
  dialogVisible.value = false;
  ElMessage.warning("点击了取消");
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
  schema: any;
  callback: (data: any) => void;
  data: any;
}) => {
  schema.value = newSchema;
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
