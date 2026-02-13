<template>
  <div class="mrpp-card-wrapper">
    <el-card class="box-card" :body-style="{ padding: '0px' }" :style="cardStyle">
      <template #header>
        <div class="card-header">
          <span class="mrpp-title">
            <span class="card-title" nowrap>
              <b v-if="type" class="type-prefix" :style="typeStyle">{{ type }}:</b><span class="title-text">{{ item.name
                || item.title }}</span>
            </span>
          </span>
          <span v-if="color" class="color-indicator" :style="{ backgroundColor: color }"></span>
        </div>
      </template>

      <div class="image-container">
        <Id2Image :image="item.image ? item.image.url : null" :id="item.id" :lazy="lazy">
          444</Id2Image>

        <!-- 覆盖层插槽 -->
        <div class="overlay-container" v-if="$slots.overlay">
          <slot name="overlay"></slot>
        </div>
      </div>

      <!-- 内容插槽 -->
      <slot></slot>

      <template #footer>
        <slot name="enter">入口</slot>

        <el-button-group v-if="showActions" style="float: right" :inline="true">
          <el-button type="success" size="small" icon="Edit" @click="named"></el-button>
          <el-button type="danger" size="small" icon="Delete" loading-icon="Eleme" :loading="deleteLoading"
            @click="deleted"></el-button>
          &nbsp;
        </el-button-group>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import Id2Image from "@/components/Id2Image.vue";

const props = defineProps({
  item: {
    type: Object as PropType<{
      id: number;
      name?: string;
      title?: string;
      image?: { url: string;[key: string]: any } | null;
    }>,
    required: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  lazy: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "",
  },
});

// 计算卡片边框样式
const cardStyle = computed(() => {
  if (!props.color) return {};
  return {
    borderLeft: `4px solid ${props.color}`,
  };
});

// 计算类型前缀样式 - 配合卡片主色
const typeStyle = computed(() => {
  if (!props.color) return {};
  return {
    color: props.color,
  };
});

const deleteLoading = ref(false);

const emits = defineEmits(["named", "deleted"]);

const named = () => {
  emits("named", props.item);
};

const deleted = () => {
  deleteLoading.value = true;
  emits("deleted", props.item, () => {
    deleteLoading.value = false;
  });
};
</script>

<style scoped>
.mrpp-card-wrapper {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.mrpp-card-wrapper:hover {
  transform: translateY(-4px);
}

.mrpp-card-wrapper:hover .box-card {
  box-shadow: var(--shadow-lg, 0 12px 24px rgba(0, 0, 0, 0.15));
}

.box-card {
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
  background-color: var(--bg-card, white);
  border: 1px solid var(--border-color, #e4e7ed);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mrpp-title {
  font-size: 15px;
  padding: 0;
  flex: 1;
  min-width: 0;
  color: var(--text-primary, #303133);
}

.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

.type-prefix {
  font-weight: 700;
  margin-right: 4px;
}

.title-text {
  font-weight: 400;
  color: var(--text-primary, #333);
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 8px;
  box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.2));
}

/* 图片容器样式 */
.image-container {
  position: relative;
  width: 100%;
  height: auto;
  overflow: hidden;
  background-color: var(--bg-hover, #f5f7fa);
}

.image-container :deep(img) {
  transition: transform 0.4s ease;
}

.mrpp-card-wrapper:hover .image-container :deep(img) {
  transform: scale(1.05);
}

.audio-container {
  position: absolute;
  bottom: -100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
  padding: 10px;
  transition:
    bottom 0.5s ease-in-out,
    z-index 0.3s ease;
}

.image-container:hover .audio-container {
  bottom: 0;
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
      rgba(0, 0, 0, 0.2) 0%,
      rgba(0, 0, 0, 0.5) 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.image-container:hover .overlay-container {
  opacity: 1;
}
</style>
