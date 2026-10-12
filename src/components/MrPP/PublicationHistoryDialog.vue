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
    <p v-if="history?.retention">
      {{
        t("common.publicationHistory.retention", {
          count: history.retention.maxVersions,
        })
      }}
    </p>
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
    <div v-if="history?.items.length" class="history-actions">
      <el-select
        v-model="fromVersion"
        v-bind="{ 'aria-label': t('common.publicationHistory.from') }"
        :placeholder="t('common.publicationHistory.from')"
      >
        <el-option
          v-for="row in history.items"
          :key="row.publicationVersionId"
          :label="`${new Date(row.createdAt * 1000).toLocaleString()} · ${row.language} · ${row.publicationVersionId.slice(0, 8)}`"
          :value="row.publicationVersionId"
        ></el-option>
      </el-select>
      <el-select
        v-model="toVersion"
        v-bind="{ 'aria-label': t('common.publicationHistory.to') }"
        :placeholder="t('common.publicationHistory.to')"
      >
        <el-option
          v-for="row in history.items"
          :key="row.publicationVersionId"
          :label="`${new Date(row.createdAt * 1000).toLocaleString()} · ${row.language} · ${row.publicationVersionId.slice(0, 8)}`"
          :value="row.publicationVersionId"
        ></el-option>
      </el-select>
      <el-button
        :disabled="!fromVersion || !toVersion"
        :loading="comparing"
        @click="compare"
        >{{ t("common.publicationHistory.compare") }}</el-button
      >
    </div>
    <section
      v-if="comparison"
      :aria-label="t('common.publicationHistory.compare')"
    >
      <p>{{ comparison.from }} → {{ comparison.to }}</p>
      <p>
        {{
          comparison.identicalBytes
            ? t("common.publicationHistory.identical")
            : t("common.publicationHistory.different")
        }}
      </p>
      <el-alert
        v-if="comparison.truncated"
        type="warning"
        :closable="false"
        :title="t('common.publicationHistory.truncated')"
      ></el-alert>
      <pre>{{ JSON.stringify(comparison.changes, null, 2) }}</pre>
    </section>
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
      <el-button :loading="exporting" @click="exportSelected">{{
        t("common.publicationHistory.export")
      }}</el-button>
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
import {
  comparePublicationBodies,
  exportPublicationArtifact,
} from "@/services/webmcp/publication-artifacts";
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
const fromVersion = ref("");
const toVersion = ref("");
const comparing = ref(false);
const exporting = ref(false);
const comparison = ref<ReturnType<typeof comparePublicationBodies> | null>(
  null
);
const clearBodies = () => {
  selected.value = null;
  comparison.value = null;
};
const beginRead = () => {
  const owner = ++generation;
  loading.value = false;
  verifying.value = null;
  comparing.value = false;
  exporting.value = false;
  error.value = "";
  return owner;
};
const failRead = (cause: unknown, owner: number) => {
  if (owner !== generation) return;
  clearBodies();
  history.value = null;
  fromVersion.value = "";
  toVersion.value = "";
  error.value = failure(cause);
};
async function compare() {
  if (!props.modelValue || !fromVersion.value || !toVersion.value) return;
  const owner = beginRead();
  clearBodies();
  comparing.value = true;
  const scene = props.sceneId;
  const from = fromVersion.value;
  const to = toVersion.value;
  try {
    const left = await readVerifiedPublication(scene, from);
    if (owner !== generation) return;
    const right = await readVerifiedPublication(scene, to);
    if (owner === generation)
      comparison.value = comparePublicationBodies(left, right);
  } catch (cause) {
    failRead(cause, owner);
  } finally {
    if (owner === generation) comparing.value = false;
  }
}
async function exportSelected() {
  if (!selected.value || !props.modelValue) return;
  const version = selected.value.publicationVersionId;
  const scene = props.sceneId;
  const owner = beginRead();
  exporting.value = true;
  try {
    const fresh = await readVerifiedPublication(scene, version);
    if (owner !== generation) return;
    const content = JSON.stringify(exportPublicationArtifact(fresh), null, 2);
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `scene-${scene}-publication-${version}.json`;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (cause) {
    failRead(cause, owner);
  } finally {
    if (owner === generation) exporting.value = false;
  }
}
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
      : status === 410
        ? "common.publicationHistory.expired"
        : "common.publicationHistory.failed"
  );
};
async function load(more: boolean) {
  if (loading.value || !props.modelValue || !props.sceneId) return;
  const owner = beginRead();
  clearBodies();
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
    failRead(cause, owner);
  } finally {
    if (owner === generation) loading.value = false;
  }
}
async function inspect(row: PublicationMetadata) {
  const owner = beginRead();
  clearBodies();
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
    failRead(cause, owner);
  } finally {
    if (owner === generation) verifying.value = null;
  }
}
watch(
  [fromVersion, toVersion],
  () => {
    beginRead();
    clearBodies();
  },
  { flush: "sync" }
);
watch(
  () => [props.modelValue, props.sceneId, props.actorId] as const,
  () => {
    beginRead();
    clearBodies();
    fromVersion.value = "";
    toVersion.value = "";
    history.value = null;
    selected.value = null;
    loading.value = false;
    verifying.value = null;
    error.value = "";
    if (props.modelValue) void load(false);
  },
  { immediate: true, flush: "sync" }
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

.history-actions :deep(.el-select) {
  flex: 1 1 260px;
  width: 260px;
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
