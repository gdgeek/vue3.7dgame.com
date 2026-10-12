<template>
  <aside v-if="newer" class="app-update-notice" role="status">
    {{ t("common.appUpdate.available") }}
    <button type="button" @click="newer = false">
      {{ t("common.appUpdate.dismiss") }}
    </button>
  </aside>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const newer = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let active: AbortController | null = null;
let lastCheck = 0;
let disposed = false;
async function check() {
  if (
    disposed ||
    active ||
    document.visibilityState === "hidden" ||
    Date.now() - lastCheck < 300000
  )
    return;
  lastCheck = Date.now();
  active = new AbortController();
  const abort = active;
  const timeout = setTimeout(() => abort.abort(), 10000);
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}app-release.json`,
      {
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: abort.signal,
      }
    );
    if (!response.ok) return;
    const metadata = await response.json();
    if (
      !disposed &&
      metadata?.schemaVersion === 1 &&
      Number.isSafeInteger(metadata.buildTimestamp) &&
      metadata.buildTimestamp > __APP_INFO__.buildTimestamp
    )
      newer.value = true;
  } catch {
    /* Missing metadata or offline is not a reason to interrupt editing. */
  } finally {
    clearTimeout(timeout);
    active = null;
  }
}
onMounted(() => {
  void check();
  timer = setInterval(check, 300000);
  window.addEventListener("focus", check);
});
onBeforeUnmount(() => {
  disposed = true;
  active?.abort();
  clearInterval(timer);
  window.removeEventListener("focus", check);
});
</script>
<style scoped>
.app-update-notice {
  position: fixed;
  right: 12px;
  bottom: 32px;
  z-index: 1900;
  max-width: min(460px, 90vw);
  padding: 12px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

button {
  margin-left: 8px;
  cursor: pointer;
}
</style>
