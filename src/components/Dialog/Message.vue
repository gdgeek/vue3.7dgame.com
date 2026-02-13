<template>
  <Transition
    name="message-fade"
    @before-leave="onClose"
    @after-leave="$emit('destroy')"
  >
    <div
      v-show="visible"
      class="custom-message"
      :class="type"
      :style="{ top: top + 'px', zIndex }"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <div class="message-content-wrapper">
        <span class="material-symbols-outlined message-icon">{{
          iconName
        }}</span>
        <span class="message-text">{{ message }}</span>
      </div>
      <button v-if="showClose" class="message-close" @click.stop="close">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const props = withDefaults(
  defineProps<{
    id: string;
    message: string;
    type?: "success" | "warning" | "info" | "error";
    duration?: number;
    offset?: number;
    zIndex?: number;
    showClose?: boolean;
    onClose?: () => void;
  }>(),
  {
    type: "info",
    duration: 3000,
    offset: 20,
    zIndex: 2000,
    showClose: false,
  }
);

const emit = defineEmits<{
  (e: "destroy"): void;
}>();

const visible = ref(false);
let timer: any = null;

const iconName = computed(() => {
  const icons = {
    success: "check_circle",
    warning: "warning",
    info: "info",
    error: "error",
  };
  return icons[props.type] || "info";
});

const top = computed(() => props.offset);

const startTimer = () => {
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close();
    }, props.duration);
  }
};

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const close = () => {
  visible.value = false;
};

onMounted(() => {
  startTimer();
  visible.value = true;
});

defineExpose({
  visible,
  close,
});
</script>

<style scoped lang="scss">
.custom-message {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  min-width: 300px;
  max-width: 480px;
  border-radius: 50px; // Pill shape to differentiate from Dialogs but align with button styles
  background: var(--bg-card, #ffffff);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  transition:
    opacity 0.3s,
    transform 0.4s,
    top 0.4s;
  pointer-events: all;
  box-sizing: border-box;

  // Type variants
  &.success {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--success-light, rgba(34, 197, 94, 0.2));

    .message-icon {
      color: var(--success-color, #22c55e);
    }
  }

  &.warning {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--warning-light, rgba(245, 158, 11, 0.2));

    .message-icon {
      color: var(--warning-color, #f59e0b);
    }
  }

  &.error {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--danger-light, rgba(239, 68, 68, 0.2));

    .message-icon {
      color: var(--danger-color, #ef4444);
    }
  }

  &.info {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--primary-light, rgba(0, 186, 255, 0.2));

    .message-icon {
      color: var(--primary-color, #00baff);
    }
  }
}

.message-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.message-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.message-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  line-height: 1.4;
}

.message-close {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary, #64748b);
  cursor: pointer;

  .material-symbols-outlined {
    font-size: 18px;
  }

  &:hover {
    color: var(--text-primary, #1e293b);
  }
}

// Transitions
.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
