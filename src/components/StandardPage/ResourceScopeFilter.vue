<template>
  <div class="resource-scope-filter">
    <el-select
      v-if="showSceneSelect"
      :model-value="sceneId"
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
      :model-value="entityId"
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
  align-items: center;
  gap: 10px;
}

.scene-select,
.entity-select {
  :deep(.el-select__wrapper) {
    min-height: 40px;
    border-radius: var(--radius-full, 9999px);
  }
}

.scene-select {
  :deep(.el-select__selected-item),
  :deep(.el-input__inner),
  :deep(.el-select__placeholder) {
    width: 100%;
    text-align: left;
  }
}

.scene-select,
.entity-select {
  width: 180px;
}
</style>

<style lang="scss">
.resource-scope-select-popper .el-select-dropdown__wrap {
  max-height: 172px;
}

.resource-scope-select-popper .el-select-dropdown__item {
  display: flex;
  align-items: center;
  text-align: left;
  margin: 2px 8px;
  border-radius: var(--radius-sm, 12px);
  border: 1px solid transparent;
  padding-left: 16px;
  padding-right: 16px;
  color: var(--ar-text-secondary);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    font-weight 0.15s ease;
}

.resource-scope-select-popper .el-select-dropdown__item.hover,
.resource-scope-select-popper .el-select-dropdown__item:hover {
  background-color: var(--ar-primary-alpha-10);
  color: var(--ar-primary);
  border-color: var(--ar-primary);
  font-weight: var(--font-weight-medium, 500);
}

.resource-scope-select-popper .el-select-dropdown__item.selected {
  background-color: var(--ar-primary-alpha-10);
  color: var(--ar-primary);
  border-color: var(--ar-primary);
  font-weight: var(--font-weight-medium, 500);
}
</style>
