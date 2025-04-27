<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <el-card shadow="hover" :body-style="{ padding: '0px' }">
          <template #header>
            <span class="mrpp-title">
              <b class="card-title" nowrap>{{ item.name || item.title }}</b>
            </span>
          </template>

          <!-- 图片容器 -->
          <div class="image-container">
            <img v-if="!item.image" src="@/assets/image/none.png"
              style="width: 100%; height: auto; object-fit: contain" />
            <LazyImg v-else style="width: 100%; height: auto" fit="contain" :url="item.image.url" lazy></LazyImg>

            <!-- 如果鼠标悬停且使用info插槽，则显示info插槽，否则显示图片 
            <template v-if="false">
              <div class="info-container">
                <slot name="info"></slot>
              </div>
            </template>

            <template v-else>1111
              <img v-if="!item.image" src="@/assets/image/none.png"
                style="width: 100%; height: auto; object-fit: contain" />
              <LazyImg v-else style="width: 100%; height: auto" fit="contain" :url="item.image.url" lazy></LazyImg>
            </template>
-->
            <!-- 在图片内底部的 音频 插槽，动态弹出 -->
            <template v-if="$slots.bar">

              <div class="audio-container">
                <slot name="bar"></slot>
              </div>
            </template>
          </div>
        </el-card>
      </template>

      <div class="clearfix">
        <slot name="enter">入口</slot>

        <el-button-group style="float: right" :inline="true">
          <!--   <el-button type="success" size="small" icon="Edit" @click="named"></el-button>-->
          <el-button type="danger" size="small" icon="Delete" loading-icon="Eleme" :loading="deleteLoading"
            @click="deleted"></el-button>
          &nbsp;
        </el-button-group>
      </div>
      <div class="bottom clearfix"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { LazyImg } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const props = defineProps({
  item: {
    type: Object as PropType<{
      name?: string;
      title?: string;
      image: { url: string } | null;
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
  emits("deleted", props.item);
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
</style>
