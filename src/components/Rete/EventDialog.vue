<template>
  <div>
    <el-dialog v-model="visible" width="80%" :before-close="handleClose">
      <template #header> {{ $t("meta.eventDialog.title") }} </template>
      <div>
        <el-divider content-position="left">{{
          $t("meta.eventDialog.output")
        }}</el-divider>
        <span v-for="(item, index) in output.list" :key="index">
          <el-tag type="success" closable @close="deleteOutput(item)">
            {{ item.title }}
          </el-tag>
          <el-divider direction="vertical"></el-divider>
        </span>
        <span v-if="output.list.length <= 5">
          <el-input
            class="input-new-tag"
            v-if="output.visible"
            v-model="output.value"
            ref="saveTagOutput"
            size="small"
            @keyup.enter="handleOutputConfirm"
            @blur="handleOutputConfirm"
          ></el-input>
          <el-button
            v-else
            class="button-new-tag"
            size="small"
            @click="showOutput"
          >
            + {{ $t("meta.eventDialog.output") }}
          </el-button>
        </span>

        <el-divider content-position="left">{{
          $t("meta.eventDialog.input")
        }}</el-divider>
        <span v-for="(item, index) in input.list" :key="index">
          <el-tag type="success" closable @close="deleteInput(item)">
            {{ item.title }}
          </el-tag>
          <el-divider direction="vertical"></el-divider>
        </span>
        <span v-if="input.list.length <= 5">
          <el-input
            class="input-new-tag"
            v-if="input.visible"
            v-model="input.value"
            ref="saveTagInput"
            size="small"
            @keyup.enter="handleInputConfirm"
            @blur="handleInputConfirm"
          ></el-input>
          <el-button
            v-else
            class="button-new-tag"
            size="small"
            @click="showInput"
          >
            + {{ $t("meta.eventDialog.input") }}
          </el-button>
        </span>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="visible = false">{{
            $t("meta.eventDialog.cancel")
          }}</el-button>
          <el-button type="primary" @click="enter">{{
            $t("meta.eventDialog.confirm")
          }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";

const saveTagOutput = ref<HTMLInputElement | null>(null);
const saveTagInput = ref<HTMLInputElement | null>(null);

const props = defineProps<{
  uuid: string;
  node: { inputs: any[]; outputs: any[] } | null;
}>();

const emit = defineEmits(["postEvent", "onSubmit"]);

const visible = ref(false);
const input = ref({
  visible: false,
  value: "",
  list: [] as { title: string; uuid: string }[],
});
const output = ref({
  visible: false,
  value: "",
  list: [] as { title: string; uuid: string }[],
});

const open = async () => {
  await nextTick();
  input.value.list = [];
  if (props.node) {
    props.node.inputs.forEach((element) => {
      input.value.list.push(element);
    });
    output.value.list = [];
    props.node.outputs.forEach((element) => {
      output.value.list.push(element);
    });
  }
  visible.value = true;
};

const close = () => {
  visible.value = false;
};

const handleInputConfirm = () => {
  if (input.value.value) {
    input.value.list.push({ title: input.value.value, uuid: uuidv4() });
  }
  input.value.visible = false;
  input.value.value = "";
};

const handleOutputConfirm = () => {
  if (output.value.value) {
    output.value.list.push({ title: output.value.value, uuid: uuidv4() });
  }
  output.value.visible = false;
  output.value.value = "";
};

const deleteOutput = (item: { uuid: string }) => {
  output.value.list = output.value.list.filter((obj) => obj.uuid != item.uuid);
};

const deleteInput = (item: { uuid: string }) => {
  input.value.list = input.value.list.filter((obj) => obj.uuid != item.uuid);
};

const showInput = async () => {
  input.value.visible = true;
  nextTick(() => {
    saveTagInput.value?.focus();
  });
};

const showOutput = () => {
  output.value.visible = true;
  nextTick(() => {
    saveTagOutput.value?.focus();
  });
};

const enter = () => {
  emit("postEvent", {
    node: props.node,
    inputs: input.value.list,
    outputs: output.value.list,
    uuid: props.uuid,
  });
  emit("onSubmit");
};

const handleClose = (done: () => void) => {
  done();
};

defineExpose({
  close,
  open,
});
</script>

<style scoped>
.el-tag + .el-tag {
  margin-left: 10px;
}
.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
.input-new-tag {
  width: 90px;
  margin-left: 10px;
  vertical-align: bottom;
}
</style>
