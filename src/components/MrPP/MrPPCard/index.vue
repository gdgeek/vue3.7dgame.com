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
            <img
              v-if="!item.image"
              src="@/assets/image/none.png"
              style="width: 100%; height: auto; object-fit: contain"
            />
            <LazyImg
              v-else
              style="width: 100%; height: auto"
              fit="contain"
              :url="item.image.url"
              lazy
            ></LazyImg>

            <!-- 在图片底部的 info 插槽，动态弹出 -->
            <template v-if="$slots.audioInfo">
              <div class="info-container">
                <slot name="audioInfo"></slot>
              </div>
            </template>

            <slot name="info"></slot>
          </div>
        </el-card>
      </template>

      <div class="clearfix">
        <slot name="enter">入口</slot>

        <el-button-group style="float: right" :inline="true">
          <el-button
            type="success"
            size="small"
            icon="Edit"
            @click="named"
          ></el-button>
          <el-button
            type="danger"
            size="small"
            icon="Delete"
            @click="deleted"
          ></el-button>
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

console.log("ITEM", props.item);

const emits = defineEmits(["named", "deleted"]);

const named = () => {
  emits("named", props.item);
};

const deleted = () => {
  emits("deleted", props.item);
};
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

/* info 插槽容器样式，默认隐藏在底部，通过鼠标移动触发动画 */
.info-container {
  position: absolute;
  bottom: -100%; /* 初始状态在图片下方隐藏 */
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* 半透明背景色 */
  color: white; /* 文字颜色 */
  text-align: center;
  padding: 10px;
  transition: bottom 0.5s ease-in-out; /* 动画效果 */
}

/* 当鼠标移动到 image-container 时，info-container 弹出 */
.image-container:hover .info-container {
  bottom: 0; /* 鼠标悬停时从底部弹出 */
}
</style>
