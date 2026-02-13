<template>
  <el-dialog v-model="visible" :title="title" width="420px" append-to-body destroy-on-close class="custom-input-dialog"
    :close-on-click-modal="false" :show-close="false">
    <div class="dialog-content">
      <p v-if="description" class="dialog-desc">{{ description }}</p>
      <div class="input-group">
        <label v-if="label" class="input-label">{{ label }}</label>
        <input ref="inputRef" v-model="inputValue" type="text" class="custom-input"
          :class="{ 'has-error': errorMessage }" :placeholder="placeholder" @keyup.enter="handleConfirm"
          @input="handleInput" />
        <span v-if="errorMessage" class="error-message">{{ errorMessage }}</span>
      </div>
      <div class="dialog-actions">
        <button class="btn-secondary" @click="handleCancel">{{ cancelText }}</button>
        <button class="btn-primary" @click="handleConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  description?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  inputValidator?: (value: string) => boolean | string
}>(), {
  title: '提示',
  description: '',
  label: '',
  placeholder: '请输入',
  defaultValue: '',
  confirmText: '确认',
  cancelText: '取消',
  inputValidator: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', value: string): void
  (e: 'cancel'): void
}>()

const visible = ref(props.modelValue)
const inputValue = ref(props.defaultValue)
const inputRef = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    inputValue.value = props.defaultValue
    errorMessage.value = ''
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleInput = () => {
  if (errorMessage.value) {
    validate()
  }
}

const validate = (): boolean => {
  if (!props.inputValidator) return true
  const result = props.inputValidator(inputValue.value)
  if (result === true) {
    errorMessage.value = ''
    return true
  }
  errorMessage.value = typeof result === 'string' ? result : '输入无效'
  return false
}

const handleConfirm = () => {
  if (validate()) {
    emit('confirm', inputValue.value)
  }
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<style lang="scss">
// 使用全局变量简化样式
.custom-input-dialog {
  .el-dialog {
    border-radius: 20px;
    overflow: hidden;
    background: var(--bg-card, #ffffff);
  }

  .el-dialog__header {
    padding: 24px 24px 0;
    margin: 0;

    .el-dialog__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary, #1e293b);
    }
  }

  .el-dialog__body {
    padding: 24px;
    color: var(--text-primary, #1e293b);
  }
}

// Removed redundant .dark override</style>

<style lang="scss" scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-desc {
  font-size: 14px;
  color: var(--text-secondary, #64748b);
  margin: 0;
  text-align: center;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.custom-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  background: var(--bg-hover, #f1f5f9);
  color: var(--text-primary, #1e293b);
  font-size: 15px;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--text-muted, #94a3b8);
  }

  &:focus {
    outline: none;
    border-color: var(--primary-color, #00BAFF);
    background: var(--bg-card, #ffffff);
  }

  &.has-error {
    border-color: #ef4444;
    background: #fef2f2;

    &:focus {
      border-color: #ef4444;
    }
  }
}

.error-message {
  font-size: 13px;
  color: #ef4444;
  margin-left: 4px;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

.btn-primary {
  height: 44px;
  padding: 0 32px;
  border: none;
  border-radius: 22px;
  background: var(--primary-color, #00BAFF);
  color: var(--text-inverse, white);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-hover, #0099DD);
  }
}

.btn-secondary {
  height: 44px;
  padding: 0 32px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 22px;
  background: var(--bg-card, #ffffff);
  color: var(--text-secondary, #64748b);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--text-muted, #64748b);
    color: var(--text-primary, #1e293b);
  }
}

// Removed redundant .dark override</style>
