<template>
  <!-- 多卡片列表视频播放，公用组件 -->
  <div>
    <!-- 卡片部分 -->
    <el-card shadow="hover" style="width: 94%" :body-style="{ padding: videoPadding + 'px' }">
      <div>
        <img :src="item.image" class="image" style="width: 100%; position: relative; z-index: 0"
          @click="onSelected(item)" />
      </div>
      <div style="padding: 14px">
        <div style="height: 60px; text-align: left">
          <span>{{ item.title }}</span>
          <div class="bottom clearfix">
            <time class="time">{{ item.describe }}</time>
            <br />
          </div>
        </div>
        <br />
        <el-button type="text" class="button" @click="onSelected(item)">
          播放视频
        </el-button>
        <br />
      </div>
    </el-card>
    <br />

    <!-- 弹出视频页 -->
    <el-dialog v-model="dialogVisible" :width="width + '%'" :before-close="handleClose" :title="video?.title">
      <el-card class="box-card" style="text-align: center">
        <video ref="videoRef" :src="video?.url" controls style="width: 100%" @play="onPlayerPlay"></video>
      </el-card>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// import "video.js/dist/video-js.css";

interface VideoItem {
  url: string;
  image: string;
  title: string;
  describe?: string;
}


defineProps({
  item: {
    type: Object as PropType<VideoItem>,
    required: true,
  },
  videoPadding: {
    type: String,
    default: "0",
  },
});

const video = ref<VideoItem | null>(null);
const width = ref(65);
const videoRef = ref<HTMLVideoElement | null>(null);
const dialogVisible = ref(false);

const onresize = () => {
  const windowWidth = window.innerWidth;

  if (windowWidth < 768) {
    width.value = 100;
  } else if (windowWidth < 992) {
    width.value = 80;
  } else {
    width.value = 65;
  }
};

const handleClose = () => {
  if (videoRef.value) {
    videoRef.value.pause();
  }
  video.value = null;
  dialogVisible.value = false;
};

const onPlayerPlay = () => {
  if (window.innerWidth < 768 && videoRef.value) {
    videoRef.value.requestFullscreen();
  }
};

const onSelected = (item: VideoItem) => {
  onresize();
  video.value = item;
  dialogVisible.value = true;
};

onMounted(() => {
  onresize();
  window.addEventListener("resize", onresize, false);
});

onUnmounted(() => {
  window.removeEventListener("resize", onresize);
});

defineExpose({
  onSelected,
  handleClose,
  onPlayerPlay,
});
</script>

<style lang="scss" scoped>
.image {
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.time {
  font-size: 13px;
  color: #999;
}

.parent {
  position: absolute;
  z-index: 3;
  margin: 0px;
  opacity: 0.5;
}

.button {
  padding: 0;
  float: right;
}

:deep(.el-dialog__body) {
  padding: 0px;
}
</style>
