<template>
  <div class="empty-state">
    <div class="empty-icon">
      <font-awesome-icon :icon="icon"></font-awesome-icon>
    </div>
    <p class="empty-text">{{ text }}</p>
    <button v-if="actionText" class="empty-action" @click="$emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string | string[];
    text?: string;
    actionText?: string;
  }>(),
  {
    icon: () => ["fas", "folder-open"],
    text: "暂无数据",
    actionText: "",
  }
);

defineEmits<{
  (e: "action"): void;
}>();
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 80px 20px;
}

.empty-icon {
  margin-bottom: 24px;

  .svg-inline--fa {
    font-size: 72px;
    font-weight: 300;
    color: var(--text-muted, #94a3b8);
  }
}

.empty-text {
  margin: 0 0 32px;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
}

.empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 500;
  color: var(--primary-color, #00baff);
  cursor: pointer;
  background: transparent;
  border: 2px dashed var(--primary-color, #00baff);
  border-radius: var(--radius-full, 9999px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--primary-light, rgb(0 186 255 / 10%));
  }
}
</style>
