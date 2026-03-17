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
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: 10px;
  background: var(--bg-hover, #f8fafc);
  min-height: 88px;
}

.events-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  margin-bottom: 8px;
}

.events-count {
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--primary-color, #03a9f4);
  background: var(--primary-light, rgba(3, 169, 244, 0.12));
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.events-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
}

.events-index {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
}

.events-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.events-title-text {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-name-sub {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-type {
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.events-empty {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
</style>
