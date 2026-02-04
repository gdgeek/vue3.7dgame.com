<template>
  <div class="array-field">
    <div v-for="(item, index) in modelValue" :key="index" class="array-item">
      <div class="item-header">
        <span class="item-title">Item {{ index + 1 }}</span>
        <el-button
          type="danger"
          link
          size="small"
          icon="Delete"
          @click="removeItem(index)"
        >
          Remove
        </el-button>
      </div>
      <div class="item-content">
        <!-- Recursively render SchemaField for each item -->
        <!-- We use a computed property for the v-model to handle array updates -->
        <SchemaField
          v-model="modelValue[index]"
          :schema="schema.items"
          :prop-key="String(index)"
          :parent-prop="`${parentProp || ''}[${index}]`"
        ></SchemaField>
      </div>
    </div>

    <div class="array-actions">
      <el-button type="primary" plain size="small" icon="Plus" @click="addItem">
        Add Item
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, toRefs } from "vue";
// Circular dependency: SchemaField needs ArrayField, ArrayField needs SchemaField.
// Use Async Component or global registration. simpler to use recursive component pattern
// However, since we are in script setup, we can't easily cycle import.
// We will pass the component via slots or use dynamic component if needed.
// Actually, in Vue 3 script setup, recursive import usually works if it's the same file,
// but across files it might be tricky.
// Let's try explicit async import.
const SchemaField = defineAsyncComponent(() => import("./SchemaField.vue"));

const props = defineProps<{
  schema: any;
  modelValue: any[];
  propKey?: string;
  parentProp?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const { schema, modelValue } = toRefs(props);

const addItem = () => {
  const newItem = getDefaultValue(schema.value.items);
  const newList = [...(modelValue.value || []), newItem];
  emit("update:modelValue", newList);
};

const removeItem = (index: number) => {
  const newList = [...(modelValue.value || [])];
  newList.splice(index, 1);
  emit("update:modelValue", newList);
};

const getDefaultValue = (itemSchema: any) => {
  if (itemSchema.default !== undefined)
    return JSON.parse(JSON.stringify(itemSchema.default));
  if (itemSchema.type === "string") return "";
  if (itemSchema.type === "number" || itemSchema.type === "integer") return 0;
  if (itemSchema.type === "boolean") return false;
  if (itemSchema.type === "object") return {};
  if (itemSchema.type === "array") return [];
  return "";
};
</script>

<style scoped>
.array-field {
  border: 1px dashed #dcdfe6;
  padding: 10px;
  border-radius: 4px;
}

.array-item {
  margin-bottom: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background-color: #fafafa;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 5px;
}

.item-title {
  font-weight: bold;
  font-size: 13px;
  color: #606266;
}
</style>
