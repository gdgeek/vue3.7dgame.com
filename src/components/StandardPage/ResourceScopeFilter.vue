<template>
  <div class="resource-scope-filter">
    <el-select
      v-if="showSceneSelect"
      :model-value="sceneId ?? undefined"
      class="scene-select"
      :fit-input-width="true"
      clearable
      filterable
      :loading="loadingScenes || loadingSceneDetail"
      :placeholder="'按场景筛选'"
      popper-class="resource-scope-select-popper"
      @change="
        (value: number | null | undefined) =>
          emit('scene-change', value ?? null)
      "
    >
      <el-option
        v-for="scene in scenes"
        :key="scene.id"
        :label="scene.name"
        :value="scene.id"
      ></el-option>
    </el-select>

    <el-select
      v-if="showEntitySelect"
      :model-value="entityId ?? undefined"
      class="entity-select"
      :fit-input-width="true"
      clearable
      filterable
      :loading="loadingEntityDetail"
      :placeholder="'按实体筛选'"
      popper-class="resource-scope-select-popper"
      @change="
        (value: number | null | undefined) =>
          emit('entity-change', value ?? null)
      "
    >
      <el-option
        v-for="entity in entities"
        :key="entity.id"
        :label="entity.name"
        :value="entity.id"
      ></el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
type SceneOption = {
  id: number;
  name: string;
};

type EntityOption = {
  id: number;
  name: string;
};

defineProps<{
  mode: "all" | "scene";
  sceneId: number | null;
  entityId: number | null;
  showSceneSelect: boolean;
  showEntitySelect: boolean;
  loadingScenes: boolean;
  loadingSceneDetail: boolean;
  loadingEntityDetail: boolean;
  scenes: SceneOption[];
  entities: EntityOption[];
}>();

const emit = defineEmits<{
  (e: "scene-change", value: number | null): void;
  (e: "entity-change", value: number | null): void;
}>();
</script>

<style scoped lang="scss">
.resource-scope-filter {
  display: flex;
  gap: 10px;
  align-items: center;
}

.scene-select,
.entity-select {
  :deep(.el-select__wrapper) {
    min-height: 40px;
    padding: 0 14px;
    color: var(--text-primary, #1e293b);
    background: var(--bg-card, #fff) !important;
    border: 1px solid var(--border-color, #e2e8f0) !important;
    border-radius: var(
      --standard-page-max-radius,
      calc(var(--radius-lg, 24px) / 3)
    );
    box-shadow: none !important;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: var(--border-color-hover, #94a3b8) !important;
    }

    &.is-focused,
    &.is-hovering,
    &:focus-within {
      background: var(--bg-card, #fff) !important;
      border-color: var(--primary-color, #00baff) !important;
      box-shadow: 0 0 0 3px var(--primary-light, rgb(0 186 255 / 10%)) !important;
    }
  }

  :deep(.el-select__caret) {
    color: var(--text-muted, #94a3b8) !important;
  }
}

.scene-select {
  :deep(.el-select__selected-item),
  :deep(.el-input__inner),
  :deep(.el-select__placeholder) {
    width: 100%;
    color: var(--text-secondary, #64748b) !important;
    text-align: left;
  }

  :deep(.el-select__selected-item) {
    color: var(--text-primary, #1e293b) !important;
  }
}

.scene-select,
.entity-select {
  width: 180px;

  :deep(.el-select__selected-item) {
    color: var(--text-primary, #1e293b) !important;
  }

  :deep(.el-select__placeholder) {
    color: var(--text-secondary, #64748b) !important;
  }
}
</style>

<style lang="scss">
.resource-scope-select-popper .el-select-dropdown__wrap {
  max-height: 172px;
}

.resource-scope-select-popper .el-select-dropdown__item {
  display: flex;
  align-items: center;
  padding-right: 16px;
  padding-left: 16px;
  margin: 2px 8px;
  color: var(--ar-text-secondary);
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 12px);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    font-weight 0.15s ease;
}

.resource-scope-select-popper .el-select-dropdown__item.hover,
.resource-scope-select-popper .el-select-dropdown__item:hover {
  font-weight: var(--font-weight-medium, 500);
  color: var(--ar-primary);
  background-color: var(--ar-primary-alpha-10);
  border-color: var(--ar-primary);
}

.resource-scope-select-popper .el-select-dropdown__item.selected {
  font-weight: var(--font-weight-medium, 500);
  color: var(--ar-primary);
  background-color: var(--ar-primary-alpha-10);
  border-color: var(--ar-primary);
}
</style>
