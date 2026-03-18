<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('common.scriptDraft.title')"
    width="620px"
    append-to-body
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <div class="script-draft-dialog">
      <div class="script-draft-settings">
        <div class="setting-card">
          <div class="setting-label">
            {{ t("common.scriptDraft.autoSave") }}
          </div>
          <el-switch
            :model-value="autoSaveEnabled"
            @update:model-value="handleAutoSaveEnabledChange"
          ></el-switch>
        </div>
        <div class="setting-card">
          <div class="setting-label">
            {{ t("common.scriptDraft.interval") }}
          </div>
          <div class="setting-input">
            <el-input-number
              :model-value="intervalMinutes"
              :min="1"
              :step="1"
              controls-position="right"
              @update:model-value="handleIntervalChange"
            ></el-input-number>
            <span class="setting-unit">
              {{ t("common.scriptDraft.minutes") }}
            </span>
          </div>
        </div>
      </div>

      <div class="script-draft-list">
        <div class="script-draft-list-header">
          <span>{{ t("common.scriptDraft.versionList") }}</span>
          <el-button
            plain
            type="danger"
            size="small"
            class="clear-history-btn"
            @click="emit('clearHistory')"
          >
            {{ t("common.scriptDraft.clearHistory") }}
          </el-button>
        </div>
        <el-empty
          v-if="versions.length === 0"
          :description="t('common.scriptDraft.empty')"
        ></el-empty>
        <div v-else class="script-draft-items">
          <div
            v-for="version in versions"
            :key="version.id"
            class="script-draft-item"
          >
            <div class="draft-item-head">
              <div class="draft-item-time">
                {{ formatSavedAt(version.savedAt) }}
              </div>
              <el-tag size="small" type="info" effect="plain">
                {{
                  version.trigger === "auto"
                    ? t("common.scriptDraft.autoTag")
                    : t("common.scriptDraft.manualTag")
                }}
              </el-tag>
            </div>
            <div class="draft-item-summary">{{ version.summary }}</div>
            <div class="draft-item-actions">
              <el-button
                type="primary"
                size="small"
                @click="emit('restore', version.id)"
              >
                {{ t("common.scriptDraft.restore") }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import type { ScriptDraftVersion } from "@/composables/useScriptEditorBase";

const props = defineProps<{
  modelValue: boolean;
  versions: ScriptDraftVersion[];
  autoSaveEnabled: boolean;
  autoSaveIntervalSeconds: number;
}>();
const { modelValue, versions, autoSaveEnabled, autoSaveIntervalSeconds } =
  toRefs(props);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:autoSaveEnabled": [value: boolean];
  "update:autoSaveIntervalSeconds": [value: number];
  clearHistory: [];
  restore: [value: string];
}>();

const { t } = useI18n();

const handleIntervalChange = (value?: number) => {
  emit("update:autoSaveIntervalSeconds", Math.max(60, Number(value || 1) * 60));
};

const handleAutoSaveEnabledChange = (value: boolean) => {
  emit("update:autoSaveEnabled", value);
};

const formatSavedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const intervalMinutes = computed(() =>
  Math.max(1, Math.round(autoSaveIntervalSeconds.value / 60))
);
</script>

<style scoped>
.script-draft-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.script-draft-settings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.setting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f7fbff;
  border: 1px solid #dcecff;
  border-radius: 14px;
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #304156;
}

.setting-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-unit {
  font-size: 13px;
  color: #7b8aa0;
}

.script-draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.script-draft-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: #304156;
  gap: 12px;
}

.clear-history-btn {
  border-width: 1px;
  font-weight: 600;
}

.script-draft-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
}

.script-draft-item {
  padding: 16px;
  background: #fff;
  border: 1px solid #e4edf7;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 76, 129, 0.08);
}

.draft-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.draft-item-time {
  font-size: 13px;
  font-weight: 600;
  color: #304156;
}

.draft-item-summary {
  font-size: 13px;
  line-height: 1.7;
  color: #5f728c;
  word-break: break-all;
}

.draft-item-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .script-draft-settings {
    grid-template-columns: 1fr;
  }
}
</style>
