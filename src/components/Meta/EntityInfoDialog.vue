<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('meta.list.detailTitle')"
    width="min(560px, calc(100vw - 32px))"
    align-center
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="entity-info" :aria-busy="loading">
      <el-skeleton v-if="loading" :rows="5" animated></el-skeleton>
      <div v-else-if="failed" class="entity-info-error" role="alert">
        <p>{{ t("meta.scene.infoLoadFailed") }}</p>
        <el-button @click="reload += 1">
          {{ t("meta.scene.infoRetry") }}
        </el-button>
      </div>
      <template v-else-if="entity">
        <div class="entity-info-header">
          <img
            v-if="entity.image?.url"
            class="entity-info-cover"
            :src="entity.image.url"
            :alt="entity.title"
          />
          <h3>{{ entity.title || entity.name || t("meta.list.unnamed") }}</h3>
        </div>
        <dl class="entity-info-properties">
          <div v-for="property in properties" :key="property.label">
            <dt>{{ property.label }}</dt>
            <dd>{{ property.value }}</dd>
          </div>
        </dl>
        <SignalInfoPanel :inputs="inputs" :outputs="outputs"></SignalInfoPanel>
      </template>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ t("ui.close") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getMeta, type metaInfo } from "@/api/v1/meta";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import SignalInfoPanel from "./SignalInfoPanel.vue";

const props = defineProps<{
  modelValue: boolean;
  entityId: number;
}>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();
const { t } = useI18n();
const entity = shallowRef<metaInfo | null>(null);
const loading = ref(false);
const failed = ref(false);
const reload = ref(0);

watch(
  () => [props.modelValue, props.entityId, reload.value] as const,
  async ([visible, entityId], _, onCleanup) => {
    entity.value = null;
    failed.value = false;
    loading.value = false;
    if (!visible) return;
    if (!Number.isSafeInteger(entityId) || entityId <= 0) {
      failed.value = true;
      return;
    }

    const controller = new AbortController();
    onCleanup(() => controller.abort());
    loading.value = true;
    try {
      const response = await getMeta(
        entityId,
        { expand: "image,author,resources,verseMetas" },
        controller.signal,
        { skipErrorMessage: true }
      );
      if (controller.signal.aborted) return;
      if (Number(response.data.id) !== entityId) {
        failed.value = true;
        return;
      }
      entity.value = response.data;
    } catch {
      if (!controller.signal.aborted) failed.value = true;
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true }
);

const properties = computed(() => {
  const current = entity.value;
  if (!current) return [];
  const sceneIds = [
    ...new Set(
      (Array.isArray(current.verseMetas) ? current.verseMetas : [])
        .map((relation) => relation.verse_id)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    ),
  ];
  return [
    { label: "ID", value: current.id },
    {
      label: t("meta.list.properties.author"),
      value: current.author?.nickname || current.author?.username || "—",
    },
    {
      label: t("meta.list.properties.resources"),
      value: Array.isArray(current.resources) ? current.resources.length : 0,
    },
    {
      label: t("meta.list.properties.scenes"),
      value: sceneIds.length
        ? sceneIds
            .map((id) => `${t("meta.list.properties.sceneFallback")}${id}`)
            .join(", ")
        : t("meta.list.properties.noScenes"),
    },
    {
      label: t("ui.createdAt"),
      value: current.created_at ? convertToLocalTime(current.created_at) : "—",
    },
    {
      label: t("meta.list.columns.updatedAt"),
      value: current.updated_at ? convertToLocalTime(current.updated_at) : "—",
    },
  ];
});

const normalizeSignals = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const signal =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      title: String(signal.title ?? signal.name ?? `#${index + 1}`),
      name: String(signal.name ?? ""),
      type: String(signal.type ?? ""),
    };
  });
};
const inputs = computed(() => normalizeSignals(entity.value?.events?.inputs));
const outputs = computed(() => normalizeSignals(entity.value?.events?.outputs));
</script>

<style scoped lang="scss">
.entity-info {
  max-height: 65vh;
  overflow-y: auto;
}

.entity-info-header {
  display: flex;
  gap: 16px;
  align-items: center;

  h3 {
    min-width: 0;
    margin: 0;
    font-size: 18px;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }
}

.entity-info-cover {
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  object-fit: contain;
  background: var(--bg-hover);
  border-radius: 8px;
}

.entity-info-properties {
  margin: 20px 0;

  > div {
    display: grid;
    grid-template-columns: minmax(90px, 1fr) minmax(0, 2fr);
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
  }

  dt {
    color: var(--text-secondary);
  }

  dd {
    margin: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }
}

.entity-info-error {
  padding: 16px 0;
  text-align: center;
}

@media (width <= 480px) {
  .entity-info :deep(.events-grid) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
