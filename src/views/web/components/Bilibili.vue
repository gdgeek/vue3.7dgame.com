<template>
  <div class="bilibili-player-container">
    <el-card v-if="loading" :style="{ height: `${height}px` }">
      <el-card v-loading="true" class="loading-container"> </el-card>
    </el-card>
    <iframe
      v-show="!loading"
      ref="playerRef"
      class="bilibili-player"
      :src="embedUrl"
      :style="{ height: `${height}px` }"
      frameborder="0"
      allowfullscreen
      scrolling="no"
      @load="handleIframeLoaded"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";

interface BilibiliPlayerProps {
  /** B站视频BV号或完整链接 */
  bvid?: string;
  /** 视频AV号 */
  aid?: string | number;
  /** 视频分P，默认为1 */
  page?: number;
  /** 播放器高度，默认为500px */
  height?: number;
  /** 是否自动播放 */
  autoplay?: boolean;
  /** 是否显示弹幕 */
  danmaku?: boolean;
  /** 是否全屏显示 */
  isWide?: boolean;
}

const props = withDefaults(defineProps<BilibiliPlayerProps>(), {
  bvid: "",
  aid: "",
  page: 1,
  height: 500,
  autoplay: false,
  danmaku: true,
  isWide: true,
});

const loading = ref(true);
const playerRef = ref<HTMLIFrameElement | null>(null);

// 当iframe加载完成时触发
const handleIframeLoaded = () => {
  loading.value = false;
};

// 解析视频ID
const parseVideoId = () => {
  if (props.bvid) {
    // 如果是完整链接
    if (props.bvid.includes("bilibili.com")) {
      const match = props.bvid.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      return match ? match[1] : "";
    }
    // 如果只是BV号
    else if (props.bvid.startsWith("BV")) {
      return props.bvid;
    }
  }
  return "";
};

// 构建嵌入URL
const embedUrl = computed(() => {
  const parsedBvid = parseVideoId();
  const baseUrl = "https://player.bilibili.com/player.html?";

  const params = new URLSearchParams();

  // 优先使用BV号
  if (parsedBvid) {
    params.append("bvid", parsedBvid);
  }
  // 其次使用AV号
  else if (props.aid) {
    params.append("aid", props.aid.toString());
  }

  params.append("page", props.page.toString());
  params.append("autoplay", props.autoplay ? "1" : "0");
  params.append("danmaku", props.danmaku ? "1" : "0");
  params.append("high_quality", "1");
  params.append("as_wide", props.isWide ? "1" : "0");

  return baseUrl + params.toString();
});

// 在属性变化时重新加载播放器
watch([() => props.bvid, () => props.aid, () => props.page], () => {
  loading.value = true;
});
</script>

<style lang="scss" scoped>
.bilibili-player-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.bilibili-player {
  width: 100%;
  border: none;
  transition: opacity 0.3s ease;
}

.loading-container {
  width: 100%;
  background: #000;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;

  .player-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f8f9fa;
    position: relative;

    .logo {
      position: absolute;
      width: 60px;
      height: 60px;
      z-index: 1;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }
}

// 深色模式适配
.dark-theme {
  .loading-container .player-placeholder {
    background-color: #2d3035;
  }
}

// 响应式调整
@media screen and (max-width: 768px) {
  .bilibili-player-container {
    border-radius: 4px;
  }
}
</style>
