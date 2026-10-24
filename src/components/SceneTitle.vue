<template>
  <span class="scene-title" :title="name">
    <span class="scene-title__text">{{ displayName.label }}</span>
    <time
      v-if="displayName.timestamp"
      class="scene-title__timestamp"
      :datetime="displayName.timestamp"
    >
      <span>{{ displayName.date }}</span>
      <span>{{ displayName.time }}</span>
    </time>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { parseSceneName } from "@/utils/sceneName";

const props = defineProps<{ name: string }>();

const displayName = computed(() => {
  const parsed = parseSceneName(props.name);
  return parsed
    ? { ...parsed, label: parsed.baseName }
    : { label: props.name, timestamp: "", date: "", time: "" };
});
</script>

<style scoped lang="scss">
.scene-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

.scene-title__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-title__timestamp {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: flex-start;
  font-size: 10px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
}
</style>
