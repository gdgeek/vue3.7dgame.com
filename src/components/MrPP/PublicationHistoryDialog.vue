<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('common.publicationHistory.title')"
    width="min(900px, 95vw)"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p>{{ t("common.publicationHistory.boundary") }}</p>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      v-bind="{ role: 'alert' }"
    ></el-alert>
    <div class="history-actions">
      <el-button :loading="loading" @click="load(false)">{{
        t("common.publicationHistory.refresh")
      }}</el-button>
      <span v-if="history">{{
        t("common.publicationHistory.capacity", {
          count: history.total,
          used: formatBytes(history.totalBytes),
          budget: formatBytes(history.sceneBudgetBytes),
        })
      }}</span>
    </div>
    <el-alert
      v-if="history?.capacityWarning"
      :title="t('common.publicationHistory.capacityWarning')"
      type="warning"
      :closable="false"
    ></el-alert>
    <el-empty
      v-if="history && history.total === 0"
      :description="t('common.publicationHistory.empty')"
    ></el-empty>
    <el-table
      v-if="history && history.items.length"
      :data="history.items"
      class="publication-table"
      v-bind="{ 'aria-label': t('common.publicationHistory.title') }"
    >
      <el-table-column
        :label="t('common.publicationHistory.date')"
        min-width="155"
      >
        <template #default="{ row }">{{
          new Date(row.createdAt * 1000).toLocaleString()
        }}</template>
      </el-table-column>
      <el-table-column
        prop="language"
        :label="t('common.publicationHistory.language')"
        width="85"
      ></el-table-column>
      <el-table-column
        prop="actorId"
        :label="t('common.publicationHistory.actor')"
        width="90"
      ></el-table-column>
      <el-table-column
        :label="t('common.publicationHistory.version')"
        min-width="150"
      >
        <template #default="{ row }"
          ><code>{{ row.publicationVersionId }}</code></template
        >
      </el-table-column>
      <el-table-column width="140" fixed="right">
        <template #default="{ row }"
          ><el-button
            :loading="verifying === row.publicationVersionId"
            @click="inspect(row)"
            >{{ t("common.publicationHistory.inspect") }}</el-button
          ></template
        >
      </el-table-column>
    </el-table>
    <el-button
      v-if="history?.nextBefore"
      :loading="loading"
      @click="load(true)"
      >{{ t("common.publicationHistory.more") }}</el-button
    >
    <section
      v-if="selected"
      class="history-detail"
      :aria-label="t('common.publicationHistory.detail')"
    >
      <el-alert
        :title="t('common.publicationHistory.verified')"
        type="success"
        :closable="false"
      ></el-alert>
      <p>
        <code>{{ selected.contentHash }}</code>
      </p>
      <p>{{ t("common.publicationHistory.resources") }}</p>
      <details>
        <summary>{{ t("common.publicationHistory.body") }}</summary>
        <pre>{{ selected.canonicalBody }}</pre>
      </details>
    </section>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  listScenePublications,
  readVerifiedPublication,
  type PublicationHistory,
  type PublicationMetadata,
  type PublicationVersion,
} from "@/api/v1/publication-history";
const props = defineProps<{
  modelValue: boolean;
  sceneId: number;
  actorId?: string | number | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const { t } = useI18n();
const history = ref<PublicationHistory | null>(null);
const selected = ref<PublicationVersion | null>(null);
const loading = ref(false);
const verifying = ref<string | null>(null);
const error = ref("");
let generation = 0;
onBeforeUnmount(() => {
  generation++;
});
const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const failure = (cause: unknown) => {
  const status = (cause as { response?: { status?: number } })?.response
    ?.status;
  return t(
    status === 401 || status === 403
      ? "common.publicationHistory.forbidden"
      : "common.publicationHistory.failed"
  );
};
async function load(more: boolean) {
  if (loading.value || !props.modelValue || !props.sceneId) return;
  const owner = generation;
  const sceneId = props.sceneId;
  loading.value = true;
  error.value = "";
  try {
    const result = (
      await listScenePublications(
        sceneId,
        20,
        more ? (history.value?.nextBefore ?? 0) : 0
      )
    ).data;
    if (owner !== generation) return;
    if (result.sceneId !== sceneId) throw new Error("Scene mismatch");
    history.value = {
      ...result,
      items: more
        ? [...(history.value?.items ?? []), ...result.items]
        : result.items,
    };
  } catch (cause) {
    if (owner === generation) {
      error.value = failure(cause);
      selected.value = null;
      history.value = null;
    }
  } finally {
    if (owner === generation) loading.value = false;
  }
}
async function inspect(row: PublicationMetadata) {
  const owner = ++generation;
  loading.value = false;
  verifying.value = row.publicationVersionId;
  selected.value = null;
  error.value = "";
  try {
    const result = await readVerifiedPublication(
      props.sceneId,
      row.publicationVersionId,
      row
    );
    if (owner === generation) selected.value = result;
  } catch (cause) {
    if (owner === generation) error.value = failure(cause);
  } finally {
    if (owner === generation) verifying.value = null;
  }
}
watch(
  () => [props.modelValue, props.sceneId, props.actorId] as const,
  () => {
    generation++;
    history.value = null;
    selected.value = null;
    loading.value = false;
    verifying.value = null;
    error.value = "";
    if (props.modelValue) void load(false);
  },
  { immediate: true }
);
</script>
<style scoped>
.history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin: 16px 0;
}

.history-detail {
  margin-top: 24px;
}

code {
  font-size: 12px;
  overflow-wrap: anywhere;
}

pre {
  max-height: 360px;
  padding: 16px;
  overflow: auto;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
}

summary {
  margin: 12px 0;
  cursor: pointer;
}
</style>
