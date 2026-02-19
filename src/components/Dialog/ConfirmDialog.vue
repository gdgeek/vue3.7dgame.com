<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="420px"
    append-to-body
    destroy-on-close
    class="custom-confirm-dialog"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div class="dialog-content">
      <div class="confirm-box" :class="type">
        <span class="material-symbols-outlined confirm-icon">{{
          iconName
        }}</span>
        <div class="confirm-text">
          <p class="confirm-title">{{ message }}</p>
          <p v-if="description" class="confirm-desc">{{ description }}</p>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn-secondary" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button :class="confirmBtnClass" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message: string;
    description?: string;
    type?: "warning" | "danger" | "info" | "success";
    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    title: "确认",
    description: "",
    type: "warning",
    confirmText: "确认",
    cancelText: "取消",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const visible = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
  }
);

watch(visible, (val) => {
  emit("update:modelValue", val);
});

const iconName = computed(() => {
  const icons: Record<string, string> = {
    warning: "warning",
    danger: "error",
    info: "info",
    success: "check_circle",
  };
  return icons[props.type] || "warning";
});

const confirmBtnClass = computed(() => {
  return props.type === "danger" ? "btn-danger" : "btn-primary";
});

const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  visible.value = false;
  emit("cancel");
};
</script>

<style lang="scss">
// 使用全局变量简化样式
.custom-confirm-dialog {
  .el-dialog {
    border-radius: 20px;
    overflow: hidden;
    background: var(--bg-card, #ffffff); // Ensure dialog bg uses variable
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
    color: var(--text-primary, #1e293b); // Default body text color
  }
}

// Removed redundant .dark override
</style>

<style lang="scss" scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.confirm-box {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;

  &.warning {
    background: var(--warning-light, rgba(245, 158, 11, 0.08));

    .confirm-icon {
      color: var(--warning-color, #f59e0b);
    }
  }

  &.danger {
    background: var(--danger-light, rgba(239, 68, 68, 0.08));

    .confirm-icon {
      color: var(--danger-color, #ef4444);
    }
  }

  &.info {
    background: var(--primary-light, rgba(0, 186, 255, 0.08));

    .confirm-icon {
      color: var(--primary-color, #00baff);
    }
  }

  &.success {
    background: var(--success-light, rgba(34, 197, 94, 0.08));

    .confirm-icon {
      color: var(--success-color, #22c55e);
    }
  }
}

.confirm-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.confirm-text {
  flex: 1;
}

.confirm-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  margin: 0 0 6px;
}

.confirm-desc {
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  margin: 0;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-primary {
  height: 44px;
  padding: 0 32px;
  border: none;
  border-radius: 22px;
  background: var(--primary-color, #00baff);
  color: var(--text-inverse, white);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-hover, #0099dd);
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
    border-color: var(--text-muted, #94a3b8);
    color: var(--text-primary, #1e293b);
  }
}

.btn-danger {
  height: 44px;
  padding: 0 32px;
  border: none;
  border-radius: 22px;
  background: var(--danger-color, #ef4444);
  color: var(--text-inverse, white);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(0.9);
  }
}

// Removed redundant .dark override
</style>
