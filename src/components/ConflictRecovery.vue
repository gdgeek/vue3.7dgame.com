<template>
  <aside v-if="conflictCopy && !open" class="conflict-entry" role="alert">
    {{ t("common.recovery.summary") }}
    <el-button @click="open = true">{{ t("common.recovery.open") }}</el-button>
  </aside>
  <el-dialog
    v-model="open"
    :title="t('common.recovery.open')"
    width="min(850px, 95vw)"
    append-to-body
  >
    <template v-if="conflictCopy">
      <p>{{ t("common.recovery.boundary") }}</p>
      <p>
        {{ conflictCopy.targetType }} #{{ conflictCopy.targetId }} ·
        {{ conflictCopy.operationId }}
      </p>
      <div class="recovery-actions">
        <el-button @click="download">{{
          t("common.recovery.export")
        }}</el-button>
        <el-button :loading="loading" @click="readServer">{{
          t("common.recovery.read")
        }}</el-button>
        <el-button @click="open = false">{{
          t("common.recovery.keep")
        }}</el-button>
      </div>
      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        :title="error"
      ></el-alert>
      <h3>{{ t("common.recovery.local") }}</h3>
      <pre>{{ conflictCopy.localJson.slice(0, 12000) }}</pre>
      <template v-if="serverBody"
        ><h3>{{ t("common.recovery.server") }}</h3>
        <pre>{{ serverBody }}</pre>
      </template>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/store/modules/user";
import {
  conflictCopy,
  setConflictScope,
} from "@/services/webmcp/conflict-recovery";
import { validRevision } from "@/api/v1/write-contract";
const { t } = useI18n();
const route = useRoute();
const user = useUserStore();
const open = ref(false);
const loading = ref(false);
const error = ref("");
const serverBody = ref("");
let generation = 0;
let request: AbortController | null = null;
watch(
  () => [route.path, route.query.id, user.userInfo?.id],
  () => {
    const match = /^\/(meta|verse)\/(scene|script)$/.exec(route.path);
    const id = Number(route.query.id);
    const actor = user.userInfo?.id;
    setConflictScope(
      match && Number.isSafeInteger(id) && id > 0 && actor
        ? {
            targetType: match[1] as "meta" | "verse",
            targetId: id,
            actorId: String(actor),
            page: route.path,
          }
        : null
    );
  },
  { immediate: true, flush: "sync" }
);
const resetRead = () => {
  generation++;
  request?.abort();
  request = null;
  loading.value = false;
  serverBody.value = "";
  error.value = "";
};
watch(
  conflictCopy,
  () => {
    resetRead();
    open.value = false;
  },
  { flush: "sync" }
);
watch(open, () => resetRead());
onBeforeUnmount(() => {
  resetRead();
  setConflictScope(null);
});
function download() {
  const copy = conflictCopy.value;
  if (!copy) return;
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ format: "xrugc-rejected-write", ...copy }, null, 2)],
      { type: "application/json" }
    )
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${copy.targetType}-${copy.targetId}-rejected-${copy.operationId}.json`;
  document.body.append(a);
  try {
    a.click();
  } finally {
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
async function readServer() {
  const copy = conflictCopy.value;
  if (!copy || loading.value) return;
  resetRead();
  const owner = generation;
  request = new AbortController();
  const signal = request.signal;
  loading.value = true;
  try {
    const transport = (await import("@/utils/request")).default;
    const expand = copy.targetType === "meta" ? "metaCode" : "verseCode";
    const result = await transport<Record<string, unknown>>({
      url: `/v1/${copy.targetType === "meta" ? "metas" : "verses"}/${copy.targetId}`,
      method: "get",
      params: { expand, fields: `id,serverRevision,data,events,${expand}` },
      signal,
      skipErrorMessage: true,
    });
    if (owner !== generation || copy !== conflictCopy.value) return;
    if (
      result.data.id !== copy.targetId ||
      !validRevision(result.data.serverRevision)
    )
      throw new Error("mismatch");
    const projected = Object.fromEntries(
      ["id", "serverRevision", "data", "events", expand]
        .filter((key) => Object.hasOwn(result.data, key))
        .map((key) => [key, result.data[key]])
    );
    serverBody.value = JSON.stringify(projected, null, 2).slice(0, 12000);
  } catch {
    if (owner === generation) {
      serverBody.value = "";
      error.value = t("common.recovery.failed");
    }
  } finally {
    if (owner === generation) loading.value = false;
  }
}
</script>
<style scoped>
.conflict-entry {
  position: fixed;
  bottom: 32px;
  left: 12px;
  z-index: 2200;
  max-width: 90vw;
  padding: 12px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-color-warning);
  border-radius: 8px;
}

.recovery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

pre {
  max-height: 260px;
  overflow: auto;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
