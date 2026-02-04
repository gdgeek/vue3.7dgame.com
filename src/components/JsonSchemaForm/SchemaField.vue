<template>
  <div v-if="!uiHidden" class="schema-field">
    <!-- Object Type -->
    <div v-if="schema.type === 'object'">
      <template v-for="(propSchema, key) in schema.properties" :key="key">
        <SchemaField
          v-if="!isFieldHidden(propSchema)"
          v-model="modelValue[key]"
          :schema="propSchema"
          :prop-key="String(key)"
          :parent-prop="
            parentProp ? `${parentProp}.${String(key)}` : String(key)
          "
          :required="isRequired(key)"
        ></SchemaField>
      </template>
    </div>

    <!-- Array Type -->
    <div v-else-if="schema.type === 'array'">
      <el-form-item
        :label="schema.title || propKey"
        :prop="parentProp"
        :required="required"
        :rules="validationRules"
      >
        <ArrayField
          v-model="innerValue"
          :schema="schema"
          :prop-key="propKey"
          :parentProp="parentProp"
        ></ArrayField>
        <div v-if="schema.description" class="field-description">
          {{ schema.description }}
        </div>
      </el-form-item>
    </div>

    <!-- Leaf Types -->
    <el-form-item
      v-else
      :label="schema.title || propKey"
      :prop="parentProp"
      :required="required"
      :rules="validationRules"
    >
      <!-- Enum / Select -->
      <el-select
        v-if="schema.enum || uiWidget === 'SelectWidget'"
        v-model="innerValue"
        :placeholder="uiPlaceholder"
        :disabled="uiDisabled"
        style="width: 100%"
        clearable
      >
        <el-option
          v-for="item in enumOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        ></el-option>
      </el-select>

      <!-- Boolean / Switch -->
      <el-switch
        v-else-if="schema.type === 'boolean'"
        v-model="innerValue"
        :disabled="uiDisabled"
      ></el-switch>

      <!-- Integer / Number -->
      <el-input-number
        v-else-if="schema.type === 'integer' || schema.type === 'number'"
        v-model="innerValue"
        :min="schema.minimum"
        :max="schema.maximum"
        :disabled="uiDisabled"
        :placeholder="uiPlaceholder"
      ></el-input-number>

      <!-- Date / DateTime -->
      <el-date-picker
        v-else-if="schema.format === 'date'"
        v-model="innerValue"
        type="date"
        value-format="YYYY-MM-DD"
        :placeholder="uiPlaceholder"
        :disabled="uiDisabled"
        style="width: 100%"
      ></el-date-picker>
      <el-date-picker
        v-else-if="schema.format === 'date-time'"
        v-model="innerValue"
        type="datetime"
        value-format="YYYY-MM-DD HH:mm:ss"
        :placeholder="uiPlaceholder"
        :disabled="uiDisabled"
        style="width: 100%"
      ></el-date-picker>

      <!-- Color -->
      <el-color-picker
        v-else-if="schema.format === 'color'"
        v-model="innerValue"
        :disabled="uiDisabled"
      ></el-color-picker>

      <!-- String / Textarea -->
      <el-input
        v-else
        v-model="innerValue"
        :type="uiType === 'textarea' ? 'textarea' : 'text'"
        :rows="uiRows"
        :placeholder="uiPlaceholder"
        :disabled="uiDisabled"
      ></el-input>

      <div v-if="schema.description" class="field-description">
        {{ schema.description }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, defineAsyncComponent } from "vue";
import type { FormItemRule } from "element-plus";

// Async import to handle circular dependency if ArrayField imports SchemaField (it does)
const ArrayField = defineAsyncComponent(() => import("./ArrayField.vue"));

const props = defineProps<{
  schema: any;
  modelValue: any;
  propKey?: string;
  parentProp?: string;
  required?: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);

const { schema, modelValue } = toRefs(props);

const innerValue = computed({
  get: () => modelValue.value,
  set: (val) => emit("update:modelValue", val),
});

// UI helpers
const uiOptions = computed(() => schema.value["ui:options"] || {});
const uiHidden = computed(() => {
  const hidden = schema.value["ui:hidden"];
  return hidden === true || hidden === "true";
});
const uiWidget = computed(() => schema.value["ui:widget"]);
const uiPlaceholder = computed(
  () => uiOptions.value.placeholder || schema.value.description
);
const uiDisabled = computed(
  () => uiOptions.value.disabled || schema.value.readOnly
);
const uiType = computed(() => uiOptions.value.type);
const uiRows = computed(() => uiOptions.value.rows || 2);

const isFieldHidden = (propSchema: any) => propSchema["ui:hidden"] === true;

const isRequired = (key: string | number) => {
  if (!schema.value.required) return false;
  return schema.value.required.includes(key);
};

const enumOptions = computed(() => {
  if (schema.value.enum) {
    return schema.value.enum.map((val: any) => ({
      label: val,
      value: val,
    }));
  }
  return [];
});

const validationRules = computed<FormItemRule[]>(() => {
  const rules: FormItemRule[] = [];
  if (props.required) {
    rules.push({
      required: true,
      message: `${schema.value.title || props.propKey} is required`,
      trigger: "blur",
    });
  }
  if (schema.value.minLength) {
    rules.push({
      min: schema.value.minLength,
      message: `Min length is ${schema.value.minLength}`,
      trigger: "blur",
    });
  }
  if (schema.value.maxLength) {
    rules.push({
      max: schema.value.maxLength,
      message: `Max length is ${schema.value.maxLength}`,
      trigger: "blur",
    });
  }
  if (schema.value.format === "email") {
    rules.push({
      type: "email",
      message: "Invalid email format",
      trigger: "blur",
    });
  }
  return rules;
});
</script>

<style scoped>
.field-description {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
  line-height: 1.2;
}
</style>
