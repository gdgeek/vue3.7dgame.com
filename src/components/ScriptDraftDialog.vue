<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('common.scriptDraft.title')"
    width="620px"
    append-to-body
    destroy-on-close
    class="script-draft-dialog-modal"
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
              <el-tag
                size="small"
                type="info"
                effect="plain"
                class="draft-trigger-tag"
              >
                {{
                  version.trigger === "auto"
                    ? t("common.scriptDraft.autoTag")
                    : t("common.scriptDraft.manualTag")
                }}
              </el-tag>
            </div>
            <div class="draft-item-summary">
              {{ formatSummary(version) }}
            </div>
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

const formatSummary = (version: ScriptDraftVersion) => {
  if (version.summaryI18nKey) {
    return t(version.summaryI18nKey, version.summaryI18nParams || {});
  }

  const summary = version.summary?.trim() || "";
  if (!summary) return t("common.scriptDraft.emptySummary");

  const emptySummaries = new Set([
    "空脚本",
    "暂无内容",
    "暫無內容",
    "Empty script",
    "No content",
  ]);
  if (emptySummaries.has(summary)) {
    return t("common.scriptDraft.emptySummary");
  }

  const patterns: Array<{
    regex: RegExp;
    key: string;
  }> = [
    { regex: /^(新增)\s*(.+)$/u, key: "common.scriptDraft.summaryAdded" },
    {
      regex: /^(刪除|删除)\s*(.+)$/u,
      key: "common.scriptDraft.summaryRemoved",
    },
    { regex: /^(修改)\s*(.+)$/u, key: "common.scriptDraft.summaryModified" },
    { regex: /^Added\s+(.+)$/u, key: "common.scriptDraft.summaryAdded" },
    { regex: /^Removed\s+(.+)$/u, key: "common.scriptDraft.summaryRemoved" },
    { regex: /^Modified\s+(.+)$/u, key: "common.scriptDraft.summaryModified" },
    {
      regex: /^(.+)\s+を追加$/u,
      key: "common.scriptDraft.summaryAdded",
    },
    {
      regex: /^(.+)\s+を削除$/u,
      key: "common.scriptDraft.summaryRemoved",
    },
    {
      regex: /^(.+)\s+を変更$/u,
      key: "common.scriptDraft.summaryModified",
    },
    { regex: /^เพิ่ม\s+(.+)$/u, key: "common.scriptDraft.summaryAdded" },
    { regex: /^ลบ\s+(.+)$/u, key: "common.scriptDraft.summaryRemoved" },
    {
      regex: /^แก้ไข\s+(.+)$/u,
      key: "common.scriptDraft.summaryModified",
    },
  ];

  for (const { regex, key } of patterns) {
    const matched = summary.match(regex);
    if (matched?.[2]) {
      return t(key, { items: matched[2] });
    }
    if (matched?.[1]) {
      return t(key, { items: matched[1] });
    }
  }

  return summary;
};

const intervalMinutes = computed(() =>
  Math.max(1, Math.round(autoSaveIntervalSeconds.value / 60))
);
</script>

<style scoped>
.script-draft-dialog {
  --draft-dialog-surface: var(--bg-card, #ffffff);
  --draft-dialog-surface-alt: var(--bg-hover, #f8fafc);
  --draft-dialog-surface-soft: var(--bg-secondary, #f1f5f9);
  --draft-dialog-border: var(--border-color, #e2e8f0);
  --draft-dialog-border-strong: var(--border-color-hover, #94a3b8);
  --draft-dialog-text: var(--text-primary, #1e293b);
  --draft-dialog-text-secondary: var(--text-secondary, #64748b);
  --draft-dialog-text-muted: var(--text-muted, #94a3b8);
  --draft-dialog-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
  --draft-dialog-radius: var(--radius-lg, 24px);
  --draft-dialog-radius-md: var(--radius-md, 20px);
  --draft-dialog-radius-sm: var(--radius-sm, 12px);

  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--draft-dialog-text);
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
  background: var(--draft-dialog-surface-alt);
  border: var(--border-width, 1px) solid var(--draft-dialog-border);
  border-radius: var(--draft-dialog-radius-md);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--draft-dialog-text);
}

.setting-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-unit {
  font-size: 13px;
  color: var(--draft-dialog-text-secondary);
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
  color: var(--draft-dialog-text);
  gap: 12px;
}

.clear-history-btn {
  border-width: 1px;
  font-weight: 600;
  border-radius: var(--draft-dialog-radius-full, var(--radius-full, 9999px));
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
  background: var(--draft-dialog-surface);
  border: var(--border-width, 1px) solid var(--draft-dialog-border);
  border-radius: var(--draft-dialog-radius-md);
  box-shadow: var(--draft-dialog-shadow);
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
  color: var(--draft-dialog-text);
}

.draft-item-summary {
  font-size: 13px;
  line-height: 1.7;
  color: var(--draft-dialog-text-secondary);
  word-break: break-all;
}

.draft-item-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.script-draft-dialog-modal .el-dialog) {
  background: var(--bg-card, #ffffff) !important;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  border-radius: var(--radius-lg, 24px) !important;
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12)) !important;
  overflow: hidden;
}

:deep(.script-draft-dialog-modal .el-dialog__header) {
  padding: 18px 22px 14px !important;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  background: var(--bg-card, #ffffff) !important;
}

:deep(.script-draft-dialog-modal .el-dialog__title) {
  color: var(--text-primary, #1e293b) !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

:deep(.script-draft-dialog-modal .el-dialog__headerbtn) {
  top: 18px;
  right: 18px;
}

:deep(.script-draft-dialog-modal .el-dialog__close) {
  color: var(--text-muted, #94a3b8) !important;
  transition: color var(--transition-fast, 0.15s ease);
}

:deep(
  .script-draft-dialog-modal .el-dialog__headerbtn:hover .el-dialog__close
) {
  color: var(--text-primary, #1e293b) !important;
}

:deep(.script-draft-dialog-modal .el-dialog__body) {
  padding: 18px 22px 22px !important;
  background: var(--bg-card, #ffffff) !important;
}

:deep(.script-draft-dialog-modal .el-switch) {
  --el-switch-on-color: var(--primary-color, #00baff);
}

:deep(.script-draft-dialog-modal .el-input-number) {
  width: 132px;
}

:deep(.script-draft-dialog-modal .el-input-number .el-input__wrapper) {
  background: var(--bg-card, #ffffff) !important;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  border-radius: var(--radius-md, 20px) !important;
  box-shadow: none !important;
}

:deep(.script-draft-dialog-modal .el-input-number .el-input__inner) {
  color: var(--text-primary, #1e293b) !important;
}

:deep(.script-draft-dialog-modal .el-input-number__increase),
:deep(.script-draft-dialog-modal .el-input-number__decrease) {
  background: var(--bg-hover, #f8fafc) !important;
  border-left: var(--border-width, 1px) solid var(--border-color, #e2e8f0) !important;
  color: var(--text-secondary, #64748b) !important;
}

:deep(.script-draft-dialog-modal .el-input-number__increase:hover),
:deep(.script-draft-dialog-modal .el-input-number__decrease:hover) {
  color: var(--primary-color, #00baff) !important;
}

:deep(.script-draft-dialog-modal .draft-trigger-tag.el-tag) {
  background: var(--primary-light, rgba(0, 186, 255, 0.1)) !important;
  border-color: transparent !important;
  color: var(--primary-color, #00baff) !important;
  border-radius: var(--radius-full, 9999px) !important;
}

:deep(.script-draft-dialog-modal .el-empty__description) {
  color: var(--text-muted, #94a3b8) !important;
}

:deep(.script-draft-dialog-modal .clear-history-btn) {
  border-color: var(--danger-color, #ef4444) !important;
  color: var(--danger-color, #ef4444) !important;
  background: transparent !important;
}

:deep(.script-draft-dialog-modal .clear-history-btn:hover) {
  background: var(--danger-light, rgba(239, 68, 68, 0.1)) !important;
}

@media (max-width: 768px) {
  .script-draft-settings {
    grid-template-columns: 1fr;
  }
}
</style>
