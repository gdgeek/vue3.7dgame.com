<template>
  <div class="empty-state">
    <div class="empty-icon">
      <font-awesome-icon :icon="icon" />
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
    icon: () => ['fas', 'folder-open'],
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
  padding: 80px 20px;
  min-height: 400px;
}

.empty-icon {
  margin-bottom: 24px;

  .svg-inline--fa {
    font-size: 72px;
    color: var(--text-muted, #94a3b8);
    font-weight: 300;
  }
}

.empty-text {
  margin: 0 0 32px;
  font-size: 18px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 32px;
  border: 2px dashed var(--primary-color, #00baff);
  border-radius: var(--radius-full, 9999px);
  background: transparent;
  color: var(--primary-color, #00baff);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--primary-light, rgba(0, 186, 255, 0.1));
  }
}
</style>
