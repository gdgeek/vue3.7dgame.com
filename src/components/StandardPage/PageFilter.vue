<template>
  <el-popover placement="bottom-start" :width="220" trigger="click" popper-class="page-filter-popper" @show="handleShow"
    @hide="handleHide">
    <template #reference>
      <div class="filter-trigger" :class="{ 'is-active': dropdownVisible || selectedCount > 0 }">
        <span class="material-symbols-outlined filter-icon">{{ icon }}</span>
        <span class="filter-label">
          {{ displayLabel }}
        </span>
        <span class="material-symbols-outlined filter-arrow" :class="{ 'is-open': dropdownVisible }">
          expand_more
        </span>
      </div>
    </template>

    <!-- Popover Content -->
    <div class="filter-content">
      <el-scrollbar max-height="320px">
        <div class="filter-list">
          <div v-for="opt in options" :key="opt.value" class="filter-item" @click="toggleOption(opt.value)">
            <div class="filter-checkbox" :class="{ 'is-checked': isChecked(opt.value) }">
              <span v-if="isChecked(opt.value)" class="material-symbols-outlined check-icon">check</span>
            </div>
            <span class="filter-item-label">{{ opt.label }}</span>
          </div>
        </div>
      </el-scrollbar>

      <!-- Clear Button (only show when has selection) -->
      <div v-if="selectedCount > 0" class="filter-footer">
        <button class="clear-btn" @click="clearSelection">
          清除筛选
        </button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface FilterOption {
  label: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: (string | number)[]
    label?: string
    icon?: string
    options?: FilterOption[]
    placeholder?: string
  }>(),
  {
    modelValue: () => [],
    options: () => [],
    icon: 'label',
    placeholder: '筛选'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: (string | number)[]): void
  (e: 'change', value: (string | number)[]): void
}>()

const dropdownVisible = ref(false)
const internalValue = ref<(string | number)[]>([])

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val ? [...val] : []
  },
  { immediate: true }
)

const selectedCount = computed(() => internalValue.value.length)

const displayLabel = computed(() => {
  if (selectedCount.value > 0) {
    return `${props.label || props.placeholder} (${selectedCount.value})`
  }
  return props.label || props.placeholder
})

const isChecked = (value: string | number) => {
  return internalValue.value.includes(value)
}

const toggleOption = (value: string | number) => {
  const index = internalValue.value.indexOf(value)
  if (index > -1) {
    internalValue.value.splice(index, 1)
  } else {
    internalValue.value.push(value)
  }
  emit('update:modelValue', [...internalValue.value])
  emit('change', [...internalValue.value])
}

const handleShow = () => {
  dropdownVisible.value = true
}

const handleHide = () => {
  dropdownVisible.value = false
}

const clearSelection = () => {
  internalValue.value = []
  emit('update:modelValue', [])
  emit('change', [])
}
</script>

<style scoped lang="scss">
.filter-trigger {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-full, 9999px);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #fff);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  user-select: none;
  gap: 8px;
  color: var(--text-secondary, #64748b);
  width: fit-content;

  &:hover {
    border-color: var(--border-color-hover, #94a3b8);
    color: var(--text-primary, #1e293b);
  }

  &.is-active {
    border-color: var(--primary-color, #00baff);
    color: var(--primary-color, #00baff);
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
  border-radius: var(--radius-md, 20px) !important;
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12)) !important;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  overflow: hidden;
  background: var(--bg-card, #fff) !important;

  .filter-content {
    display: flex;
    flex-direction: column;
  }

  .filter-list {
    padding: 12px 8px;
  }

  .filter-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 16px;
    cursor: pointer;
    transition: background var(--transition-fast, 0.15s ease);
    border-radius: calc(var(--radius-md, 20px) - 8px);

    &:hover {
      background: var(--bg-hover, #f8fafc);
    }
  }

  .filter-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast, 0.15s ease);
    flex-shrink: 0;

    &.is-checked {
      background: var(--primary-color, #00baff);
      border-color: var(--primary-color, #00baff);

      .check-icon {
        color: var(--text-inverse, #fff);
        font-size: 16px;
        font-weight: 600;
      }
    }
  }

  .filter-item-label {
    font-size: 16px;
    color: var(--text-primary, #1e293b);
    font-weight: 500;
  }

  .filter-footer {
    padding: 12px;
    border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  }

  .clear-btn {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary, #f1f5f9);
    border: none;
    border-radius: var(--radius-full, 9999px);
    font-size: 15px;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s ease);

    &:hover {
      background: var(--bg-tertiary, #e2e8f0);
      color: var(--text-primary, #1e293b);
    }
  }
}
</style>
