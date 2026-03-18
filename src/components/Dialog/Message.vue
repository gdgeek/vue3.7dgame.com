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
        <font-awesome-icon
          :icon="iconName"
          class="message-icon"
        ></font-awesome-icon>
        <span class="message-text">{{ message }}</span>
      </div>
      <button v-if="showClose" class="message-close" @click.stop="close">
        <font-awesome-icon :icon="['fas', 'xmark']"></font-awesome-icon>
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

defineEmits<{
  (e: "destroy"): void;
}>();

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const iconName = computed(() => {
  const icons: Record<string, string[]> = {
    success: ["fas", "circle-check"],
    warning: ["fas", "triangle-exclamation"],
    info: ["fas", "circle-info"],
    error: ["fas", "circle-exclamation"],
  };
  return icons[props.type] || ["fas", "circle-info"];
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
  padding: 10px 16px;
  min-width: 0;
  max-width: min(420px, calc(100vw - 32px));
  border-radius: 14px;
  background: #f4fbef;
  border: 1px solid #d8efc9;
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.08);
  transition:
    opacity 0.3s,
    transform 0.4s,
    top 0.4s;
  pointer-events: all;
  box-sizing: border-box;

  // Type variants
  &.success {
    background: #f4fbef;
    border-color: #d8efc9;

    .message-icon {
      color: #67c23a;
    }

    .message-text {
      color: #67c23a;
    }
  }

  &.warning {
    background: #fff8e8;
    border-color: #f5e1a5;

    .message-icon {
      color: #e6a23c;
    }

    .message-text {
      color: #c98517;
    }
  }

  &.error {
    background: #fff1f0;
    border-color: #f6c9c6;

    .message-icon {
      color: #f56c6c;
    }

    .message-text {
      color: #e15656;
    }
  }

  &.info {
    background: #eef8ff;
    border-color: #cfe8fb;

    .message-icon {
      color: #409eff;
    }

    .message-text {
      color: #3487dc;
    }
  }
}

.message-content-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.message-text {
  font-size: 14px;
  font-weight: 600;
  color: #67c23a;
  line-height: 1.3;
}

.message-close {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary, #64748b);
  cursor: pointer;

  .svg-inline--fa {
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

.message-fade-enter-active {
  animation: message-slide-down 0.3s ease-out;
}

.message-fade-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
}

@keyframes message-slide-down {
  0% {
    opacity: 0;
    transform: translate(-50%, -20px);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>
