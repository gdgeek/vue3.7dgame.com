<template>
  <el-card class="box-card" style="margin-bottom: 10px">
    <template #header>
      <div class="clearfix">
        <b>定位物体变换</b>
      </div>
    </template>
    <br />
    <el-form :model="localData" label-width="auto" style="max-width: 600px">
      <!--三元向量输入element ui, 在一行,只能是数字，然后size是mini，前面标题是缩放-->
      <el-form-item label="缩放">
        <el-input
          v-model.number="localData.scale.x"
          placeholder="X"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.scale.y"
          placeholder="Y"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.scale.z"
          placeholder="Z"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
      </el-form-item>
      <el-form-item label="旋转">
        <el-input
          v-model.number="localData.rotate.x"
          placeholder="X"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.rotate.y"
          placeholder="Y"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.rotate.z"
          placeholder="Z"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
      </el-form-item>
      <el-form-item label="位置">
        <el-input
          v-model.number="localData.position.x"
          placeholder="X"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.position.y"
          placeholder="Y"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
        <el-input
          v-model.number="localData.position.z"
          placeholder="Z"
          size="small"
          type="number"
          style="width: 60px"
        ></el-input>
      </el-form-item>
    </el-form>
    <el-button
      icon="check"
      @click="handleSave"
      size="small"
      style="width: 100%"
    >
      保存数据
    </el-button>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";

interface TransformData {
  scale: { x: number; y: number; z: number };
  rotate: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
}

const props = withDefaults(
  defineProps<{
    data: Partial<TransformData>;
  }>(),
  {
    data: () => ({
      scale: { x: 1, y: 1, z: 1 },
      rotate: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    }),
  }
);

const emit = defineEmits<{
  (e: "save", data: TransformData): void;
}>();

const localData = reactive<TransformData>({
  scale: { x: 1, y: 1, z: 1 },
  rotate: { x: 0, y: 0, z: 0 },
  position: { x: 0, y: 0, z: 0 },
});

const initData = () => {
  if (props.data) {
    localData.scale = props.data.scale
      ? { ...props.data.scale }
      : { x: 1, y: 1, z: 1 };
    localData.rotate = props.data.rotate
      ? { ...props.data.rotate }
      : { x: 0, y: 0, z: 0 };
    localData.position = props.data.position
      ? { ...props.data.position }
      : { x: 0, y: 0, z: 0 };
  }
};

watch(() => props.data, initData, { deep: true, immediate: true });

const handleSave = () => {
  emit("save", { ...localData });
};

onMounted(() => {
  initData();
});
</script>
