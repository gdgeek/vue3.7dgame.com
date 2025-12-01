<template>
  <div>
    <el-card class="box-card" :body-style="{ padding: '0px' }">
      <template #header>

        <span class="mrpp-title">
          <b class="card-title" nowrap>{{ item.name || item.title }}</b>
        </span>
      </template>

      <div class="image-container">
        <Id2Image :image="item.image ? item.image.url : null" :id="item.id"> 444</Id2Image>

        <!-- 覆盖层插槽 -->
        <div class="overlay-container" v-if="$slots.overlay">
          <slot name="overlay"></slot>
        </div>
      </div>

      <template #footer>
        <slot name="enter">入口</slot>

        <el-button-group style="float: right" :inline="true">
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
});

const deleteLoading = ref(false);

const emits = defineEmits(["named", "deleted"]);

const named = () => {
  emits("named", props.item);
};

const deleted = () => {
  deleteLoading.value = true;
  emits("deleted", props.item, () => {
    deleteLoading.value = false; // 用于重置loading状态
  });
};
/*
const hovering = ref(false);
let enterTimeout: ReturnType<typeof setTimeout>;
let leaveTimeout: ReturnType<typeof setTimeout>;

const onMouseEnter = () => {
  if (leaveTimeout) {
    clearTimeout(leaveTimeout);
  }
  // 鼠标进入时，延迟2秒后显示
  enterTimeout = setTimeout(() => {
    hovering.value = true;
  }, 2000);
};

const onMouseLeave = () => {
  if (enterTimeout) {
    clearTimeout(enterTimeout);
  }
  // 鼠标离开时，延迟5秒后隐藏
  leaveTimeout = setTimeout(() => {
    hovering.value = false;
  }, 5000);
};*/
</script>

<style scoped>
.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
}

.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* 图片容器样式 */
.image-container {
  position: relative;
  width: 100%;
  height: auto;
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
  /* 鼠标悬停时从底部弹出 */
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .overlay-container {
  opacity: 1;
}
</style>
