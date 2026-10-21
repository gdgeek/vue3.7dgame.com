<template>
  <template v-if="canManageProperties">
    <el-button class="scene-properties-manage" @click="open = true">
      {{ t("verse.properties.manage") }}
    </el-button>
    <el-dialog
      v-model="open"
      :title="t('verse.properties.dialogTitle')"
      class="scene-properties-dialog"
      width="min(860px, calc(100vw - 32px))"
      align-center
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      :before-close="beforeClose"
    >
      <template #header="{ titleId, titleClass }">
        <h2
          :id="titleId"
          :class="titleClass"
          class="scene-properties-dialog__title"
        >
          {{ t("verse.properties.dialogTitle") }}
        </h2>
        <p v-if="sceneName" class="scene-properties-dialog__scene">
          {{
            t("verse.properties.subtitle", {
              name: sceneName,
              count: propertyCount,
            })
          }}
        </p>
      </template>
      <div class="scene-properties-dialog__content">
        <SceneProperties
          v-if="open"
          :key="sceneId"
          :scene-id="sceneId"
          @added="emit('added', $event)"
          @removed="emit('removed', $event)"
          @globally-deleted="emit('globally-deleted', $event)"
          @busy-change="saving = $event"
          @count-change="propertyCount = $event"
        ></SceneProperties>
      </div>
      <template #footer>
        <div class="scene-properties-dialog__footer">
          <p>{{ t("verse.properties.removeScope") }}</p>
          <el-button :disabled="saving" @click="open = false">
            {{ t("verse.properties.done") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </template>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAbility } from "@casl/vue";
import { useI18n } from "vue-i18n";
import type { SceneProperty } from "@/api/v1/scene-properties";
import SceneProperties from "./SceneProperties.vue";

const props = defineProps<{ sceneId: number; sceneName?: string }>();
const emit = defineEmits<{
  added: [property: SceneProperty];
  removed: [property: SceneProperty];
  "globally-deleted": [property: SceneProperty];
  "open-change": [open: boolean];
}>();
const { t } = useI18n();
const ability = useAbility();
const isRoot = computed(() => ability.can("root", "all"));
const canManageProperties = computed(
  () => isRoot.value || ability.can("admin", "all")
);
const open = ref(false);
const saving = ref(false);
const propertyCount = ref(0);

function beforeClose(done: () => void) {
  if (!saving.value) done();
}

watch(open, (value) => emit("open-change", value), { flush: "sync" });
watch([() => props.sceneId, canManageProperties, isRoot], () => {
  open.value = false;
  saving.value = false;
});
onBeforeUnmount(() => emit("open-change", false));
</script>

<style scoped lang="scss">
.scene-properties-manage {
  margin: 16px 0;
}

.scene-properties-dialog {
  &__content {
    min-height: 0;
  }

  &__title {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.4;
  }

  &__scene {
    margin: 6px 0 0;
    font-size: 18px;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    text-align: left;

    p {
      flex-basis: 100%;
      margin: 0;
      font-size: 15px;
      line-height: 1.6;
      color: var(--el-text-color-regular);
    }

    .el-button {
      flex-shrink: 0;
      min-width: 120px;
      height: 50px;
      margin-left: auto;
    }
  }
}
</style>

<style lang="scss">
.el-dialog.scene-properties-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-lg, 24px);

  .el-dialog__header {
    flex-shrink: 0;
    padding: 28px 36px 24px;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__headerbtn {
    top: 22px;
    right: 22px;
    width: 32px;
    height: 32px;
    font-size: 24px;
  }

  .el-dialog__body {
    min-height: 0;
    padding: 20px 36px 16px;
    overflow-y: auto;
  }

  .el-dialog__footer {
    flex-shrink: 0;
    padding: 24px 36px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  @media (width <= 760px) {
    .el-dialog__header {
      padding: 24px 20px 20px;
    }

    .el-dialog__body {
      padding: 20px;
    }

    .el-dialog__footer {
      padding: 20px;
    }

    .scene-properties-dialog__title {
      padding-right: 28px;
      font-size: 22px;
    }

    .scene-properties-dialog__footer {
      gap: 16px;
    }
  }
}
</style>
