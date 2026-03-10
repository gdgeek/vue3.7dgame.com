<template>
  <el-dialog
    v-model="visible"
    :title="hideTitle ? '' : title"
    :width="width"
    append-to-body
    destroy-on-close
    :class="[
      'custom-confirm-dialog',
      { 'compact-dialog': compact, 'no-title': hideTitle },
    ]"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div class="dialog-content" :class="{ 'compact-content': compact }">
      <div
        class="confirm-box"
        :class="[type, { 'is-centered': centeredText || compact }]"
      >
        <font-awesome-icon
          v-if="!compact"
          :icon="iconName"
          class="confirm-icon"
        ></font-awesome-icon>
        <div
          class="confirm-text"
          :class="{ centered: centeredText || compact }"
        >
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
    width?: string;
    hideTitle?: boolean;
    compact?: boolean;
    centeredText?: boolean;
    message: string;
    description?: string;
    type?: "warning" | "danger" | "info" | "success";
    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    title: "确认",
    width: "420px",
    hideTitle: false,
    compact: false,
    centeredText: false,
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
  const icons: Record<string, string[]> = {
    warning: ["fas", "triangle-exclamation"],
    danger: ["fas", "circle-exclamation"],
    info: ["fas", "circle-info"],
    success: ["fas", "circle-check"],
  };
  return icons[props.type] || ["fas", "triangle-exclamation"];
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

.custom-confirm-dialog.no-title {
  .el-dialog__header {
    display: none;
    padding: 0;
  }

  .el-dialog__body {
    padding-top: 18px;
  }
}

.custom-confirm-dialog.compact-dialog {
  .el-dialog {
    border-radius: 16px;
  }

  .el-dialog__body {
    padding: 18px 20px 20px;
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

.dialog-content.compact-content {
  gap: 16px;
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

.confirm-text.centered {
  width: 100%;
  text-align: center;
}

.confirm-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  margin: 0 0 6px;
}

.compact-content .confirm-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.45;
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

.confirm-box.is-centered {
  justify-content: center;
  align-items: center;
  padding: 14px 16px;
}

.compact-content .btn-primary,
.compact-content .btn-secondary,
.compact-content .btn-danger {
  height: 40px;
  padding: 0 26px;
  font-size: 16px;
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
