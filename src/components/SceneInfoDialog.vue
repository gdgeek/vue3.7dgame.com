<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('verse.listPage.detailTitle')"
    width="min(560px, calc(100vw - 32px))"
    align-center
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="scene-info" :aria-busy="loading">
      <el-skeleton v-if="loading" :rows="5" animated></el-skeleton>
      <div v-else-if="failed" class="scene-info-error" role="alert">
        <p>{{ t("verse.toolbar.infoLoadFailed") }}</p>
        <el-button @click="reload += 1">
          {{ t("verse.toolbar.retry") }}
        </el-button>
      </div>
      <template v-else-if="scene">
        <div class="scene-info-header">
          <img
            v-if="scene.image?.url"
            class="scene-info-cover"
            :src="scene.image.url"
            :alt="scene.name"
          />
          <h3>{{ scene.name || t("verse.listPage.unnamed") }}</h3>
        </div>
        <dl class="scene-info-properties">
          <div v-for="property in properties" :key="property.label">
            <dt>{{ property.label }}</dt>
            <dd>{{ property.value }}</dd>
          </div>
        </dl>
        <section class="scene-info-description">
          <h4>{{ t("verse.listPage.sceneIntro") }}</h4>
          <p>{{ scene.description || t("verse.publicPage.noDescription") }}</p>
        </section>
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
import { getVerse, type VerseData } from "@/api/v1/verse";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const props = defineProps<{
  modelValue: boolean;
  sceneId: number;
}>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();
const { t } = useI18n();
const scene = shallowRef<VerseData | null>(null);
const loading = ref(false);
const failed = ref(false);
const reload = ref(0);

watch(
  () => [props.modelValue, props.sceneId, reload.value] as const,
  async ([visible, sceneId], _, onCleanup) => {
    scene.value = null;
    failed.value = false;
    loading.value = false;
    if (!visible) return;
    if (!Number.isSafeInteger(sceneId) || sceneId <= 0) {
      failed.value = true;
      return;
    }

    const controller = new AbortController();
    onCleanup(() => controller.abort());
    loading.value = true;
    try {
      const response = await getVerse(
        sceneId,
        "image,author,metas,verseTags",
        "js",
        controller.signal,
        { skipErrorMessage: true }
      );
      if (controller.signal.aborted) return;
      if (Number(response.data.id) !== sceneId) {
        failed.value = true;
        return;
      }
      scene.value = response.data;
    } catch {
      if (!controller.signal.aborted) failed.value = true;
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true }
);

const properties = computed(() => {
  const current = scene.value;
  if (!current) return [];
  const entities = Array.isArray(current.metas) ? current.metas : [];
  const tags = current.verseTags || current.tags || [];
  return [
    { label: t("verse.listPage.sceneId"), value: current.id },
    {
      label: t("verse.listPage.author"),
      value: current.author?.nickname || current.author?.username || "—",
    },
    {
      label: t("verse.listPage.visibility"),
      value: t(
        current.public ? "verse.listPage.public" : "verse.listPage.private"
      ),
    },
    {
      label: t("verse.listPage.loadedEntities"),
      value: entities.length
        ? entities
            .map(
              (item) =>
                item.title ||
                item.name ||
                `${t("verse.listPage.entityFallback")}${item.id}`
            )
            .join(", ")
        : t("verse.listPage.noLoadedEntities"),
    },
    {
      label: t("verse.listPage.sceneTags"),
      value: tags.length
        ? tags.map((tag) => tag.name).join(", ")
        : t("verse.listPage.noTags"),
    },
    {
      label: t("verse.listPage.createdTime"),
      value: current.created_at ? convertToLocalTime(current.created_at) : "—",
    },
    {
      label: t("verse.listPage.modifiedDate"),
      value: current.updated_at ? convertToLocalTime(current.updated_at) : "—",
    },
  ];
});
</script>

<style scoped lang="scss">
.scene-info {
  max-height: 65vh;
  overflow-y: auto;
}

.scene-info-header {
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

.scene-info-cover {
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  object-fit: contain;
  background: var(--bg-hover);
  border-radius: 8px;
}

.scene-info-properties {
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

.scene-info-error {
  padding: 16px 0;
  text-align: center;
}

.scene-info-description {
  h4 {
    margin: 0 0 8px;
    color: var(--text-primary);
  }
  p {
    margin: 0;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
</style>
