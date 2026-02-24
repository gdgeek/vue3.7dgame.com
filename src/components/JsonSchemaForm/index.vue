<template>
  <el-form ref="formRef" :model="modelValue" label-width="120px" label-position="right" class="json-schema-form">
    <SchemaField v-if="schema" v-model="innerModel" :schema="schema"></SchemaField>

    <div class="form-footer" v-if="formFooter.show">
      <el-button @click="handleCancel">{{
        formFooter.cancelBtn || "Cancel"
        }}</el-button>
      <el-button type="primary" @click="handleSubmit">{{
        formFooter.okBtn || "Save"
        }}</el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults } from "vue";
import SchemaField from "./SchemaField.vue";
import {
  ElMessage,
  type FormInstance,
  type FormValidateCallback,
} from "element-plus";
import type { FormFooterConfig, JsonSchema, JsonValue } from "./types";

const props = withDefaults(
  defineProps<{
    schema?: JsonSchema;
    modelValue?: Record<string, JsonValue>;
    formFooter?: FormFooterConfig;
  }>(),
  {
    modelValue: () => ({}),
    formFooter: () => ({
      show: true,
      okBtn: "Save",
      cancelBtn: "Cancel",
    }),
  }
);

const emit = defineEmits(["update:modelValue", "submit", "cancel", "change"]);

const formRef = ref<FormInstance>();

const innerModel = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const initDefaults = (schema: JsonSchema, model: Record<string, JsonValue>) => {
  if (!schema || !model) return;

  if (schema.type === "object" && (schema as import("./types").JsonSchemaObject).properties) {
    for (const key in (schema as import("./types").JsonSchemaObject).properties) {
      const propSchema = (schema as import("./types").JsonSchemaObject).properties![key];
      // Set default if model value is undefined
      if (model[key] === undefined && propSchema.default !== undefined) {
        // Deep copy default value to avoid reference issues
        try {
          model[key] = JSON.parse(JSON.stringify(propSchema.default));
        } catch (e) {
          model[key] = propSchema.default as JsonValue;
        }
      }

      // Recursively init defaults for nested objects (if they exist in model or are created)
      if (propSchema.type === "object" && model[key]) {
        initDefaults(propSchema, model[key] as Record<string, JsonValue>);
      }
    }
  }
};

watch(
  () => props.schema,
  (newSchema) => {
    if (newSchema) {
      // Create a shallow copy to modify triggers reactivity potentially?
      // Actually accessing props.modelValue directly is reactive object.
      initDefaults(newSchema, props.modelValue);
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.modelValue,
  (newVal, oldVal) => {
    emit("change", { newValue: newVal, oldValue: oldVal });
  },
  { deep: true }
);

const handleSubmit = async () => {
  if (!formRef.value) return;
  const callback: FormValidateCallback = (valid, fields) => {
    if (valid) {
      emit("submit", props.modelValue);
    } else {
      ElMessage.warning("Please check the form for errors.");
      console.warn("Validation failed", fields);
    }
  };
  await formRef.value.validate(callback);
};

const handleCancel = () => {
  emit("cancel");
};

defineExpose({
  validate: () => formRef.value?.validate(),
  resetFields: () => formRef.value?.resetFields(),
});
</script>

<style scoped>
.json-schema-form {
  max-width: 100%;
}

.form-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
