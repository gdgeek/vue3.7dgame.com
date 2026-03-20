<template>
  <div class="events-section">
    <div class="events-title">{{ t("meta.list.events.title") }}</div>

    <div class="events-grid">
      <div class="events-card">
        <div class="events-card-title">
          {{ t("meta.list.events.inputs") }}
          <span class="events-count">{{ inputs.length }}</span>
        </div>
        <div v-if="inputs.length > 0" class="events-list">
          <div
            v-for="(eventItem, index) in inputs"
            :key="'in-' + index"
            class="events-item"
          >
            <span class="events-index">{{ index + 1 }}</span>
            <div class="events-main">
              <span class="events-title-text">{{ eventItem.title }}</span>
              <span
                v-if="eventItem.name && eventItem.name !== eventItem.title"
                class="events-name-sub"
              >
                {{ eventItem.name }}
              </span>
            </div>
            <span v-if="eventItem.type" class="events-type">{{
              eventItem.type
            }}</span>
          </div>
        </div>
        <div v-else class="events-empty">
          {{ t("meta.list.events.empty") }}
        </div>
      </div>

      <div class="events-card">
        <div class="events-card-title">
          {{ t("meta.list.events.outputs") }}
          <span class="events-count">{{ outputs.length }}</span>
        </div>
        <div v-if="outputs.length > 0" class="events-list">
          <div
            v-for="(eventItem, index) in outputs"
            :key="'out-' + index"
            class="events-item"
          >
            <span class="events-index">{{ index + 1 }}</span>
            <div class="events-main">
              <span class="events-title-text">{{ eventItem.title }}</span>
              <span
                v-if="eventItem.name && eventItem.name !== eventItem.title"
                class="events-name-sub"
              >
                {{ eventItem.name }}
              </span>
            </div>
            <span v-if="eventItem.type" class="events-type">{{
              eventItem.type
            }}</span>
          </div>
        </div>
        <div v-else class="events-empty">
          {{ t("meta.list.events.empty") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface SignalEventItem {
  title: string;
  name: string;
  type: string;
}

withDefaults(
  defineProps<{
    inputs?: SignalEventItem[];
    outputs?: SignalEventItem[];
  }>(),
  {
    inputs: () => [],
    outputs: () => [],
  }
);

const { t } = useI18n();
</script>

<style scoped lang="scss">
.events-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.events-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.events-card {
  min-height: 88px;
  padding: 10px;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 12px);
}

.events-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
}

.events-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--primary-color, #03a9f4);
  background: var(--primary-light, rgb(3 169 244 / 12%));
  border-radius: 9px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.events-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
}

.events-index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border-radius: 999px;
}

.events-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.events-title-text {
  overflow: hidden;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-name-sub {
  overflow: hidden;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-type {
  flex-shrink: 0;
  padding: 2px 8px;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 999px;
}

.events-empty {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
</style>
