<template>
  <el-popover
    placement="bottom-start"
    :width="220"
    trigger="click"
    popper-class="page-filter-popper"
    @show="handleShow"
    @hide="handleHide"
  >
    <template #reference>
      <div
        class="filter-trigger"
        :class="{ 'is-active': dropdownVisible || selectedCount > 0 }"
      >
        <font-awesome-icon
          :icon="['fas', icon]"
          class="filter-icon"
        ></font-awesome-icon>
        <span class="filter-label">
          {{ displayLabel }}
        </span>
        <font-awesome-icon
          :icon="['fas', 'chevron-down']"
          class="filter-arrow"
          :class="{ 'is-open': dropdownVisible }"
        ></font-awesome-icon>
      </div>
    </template>

    <!-- Popover Content -->
    <div class="filter-content">
      <el-scrollbar max-height="320px">
        <div class="filter-list">
          <div
            v-for="opt in options"
            :key="opt.value"
            class="filter-item"
            @click="toggleOption(opt.value)"
          >
            <div
              class="filter-checkbox"
              :class="{ 'is-checked': isChecked(opt.value) }"
            >
              <font-awesome-icon
                v-if="isChecked(opt.value)"
                :icon="['fas', 'check']"
                class="check-icon"
              ></font-awesome-icon>
            </div>
            <span class="filter-item-label">{{ opt.label }}</span>
          </div>
        </div>
      </el-scrollbar>

      <!-- Clear Button (only show when has selection) -->
      <div v-if="selectedCount > 0" class="filter-footer">
        <button class="clear-btn" @click="clearSelection">清除筛选</button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface FilterOption {
  label: string;
  value: string | number;
}

const props = withDefaults(
  defineProps<{
    modelValue?: (string | number)[];
    label?: string;
    icon?: string;
    options?: FilterOption[];
    placeholder?: string;
  }>(),
  {
    modelValue: () => [],
    options: () => [],
    icon: "filter",
    placeholder: "筛选",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: (string | number)[]): void;
  (e: "change", value: (string | number)[]): void;
}>();

const dropdownVisible = ref(false);
const internalValue = ref<(string | number)[]>([]);

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val ? [...val] : [];
  },
  { immediate: true }
);

const selectedCount = computed(() => internalValue.value.length);

const displayLabel = computed(() => {
  if (selectedCount.value > 0) {
    return `${props.label || props.placeholder} (${selectedCount.value})`;
  }
  return props.label || props.placeholder;
});

const isChecked = (value: string | number) => {
  return internalValue.value.includes(value);
};

const toggleOption = (value: string | number) => {
  const index = internalValue.value.indexOf(value);
  if (index > -1) {
    internalValue.value.splice(index, 1);
  } else {
    internalValue.value.push(value);
  }
  emit("update:modelValue", [...internalValue.value]);
  emit("change", [...internalValue.value]);
};

const handleShow = () => {
  dropdownVisible.value = true;
};

const handleHide = () => {
  dropdownVisible.value = false;
};

const clearSelection = () => {
  internalValue.value = [];
  emit("update:modelValue", []);
  emit("change", []);
};
</script>

<style scoped lang="scss">
.filter-trigger {
  display: flex;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: 44px;
  padding: 0 16px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  user-select: none;
  background: var(--bg-card, #fff);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--text-primary, #1e293b);
    border-color: var(--border-color-hover, #94a3b8);
  }

  &.is-active {
    color: var(--primary-color, #00baff);
    border-color: var(--primary-color, #00baff);
  }
}

.filter-icon {
  font-size: 20px;
  color: inherit;
}

.filter-label {
  font-size: var(--font-size-md, 14px);
  font-weight: 500;
  white-space: nowrap;
}

.filter-arrow {
  font-size: 20px;
  color: inherit;
  transition: transform var(--transition-normal, 0.2s ease);

  &.is-open {
    transform: rotate(180deg);
  }
}
</style>

<style lang="scss">
.page-filter-popper {
  padding: 0 !important;
  overflow: hidden;
  background: var(--bg-card, #fff) !important;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  border-radius: var(--radius-md, 20px) !important;
  box-shadow: var(--shadow-lg, 0 8px 24px rgb(0 0 0 / 12%)) !important;

  .filter-content {
    display: flex;
    flex-direction: column;
  }

  .filter-list {
    padding: 12px 8px;
  }

  .filter-item {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 16px;
    cursor: pointer;
    border-radius: calc(var(--radius-md, 20px) - 8px);
    transition: background var(--transition-fast, 0.15s ease);

    &:hover {
      background: var(--bg-hover, #f8fafc);
    }
  }

  .filter-checkbox {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    transition: all var(--transition-fast, 0.15s ease);

    &.is-checked {
      background: var(--primary-color, #00baff);
      border-color: var(--primary-color, #00baff);

      .check-icon {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-inverse, #fff);
      }
    }
  }

  .filter-item-label {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
  }

  .filter-footer {
    padding: 12px;
    border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  }

  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 44px;
    font-size: 15px;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    background: var(--bg-secondary, #f1f5f9);
    border: none;
    border-radius: var(--radius-full, 9999px);
    transition: all var(--transition-fast, 0.15s ease);

    &:hover {
      color: var(--text-primary, #1e293b);
      background: var(--bg-tertiary, #e2e8f0);
    }
  }
}
</style>
