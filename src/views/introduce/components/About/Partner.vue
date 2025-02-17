<template>
  <div class="partner-background">
    <div align="center" class="partner-title">
      <h1 class="font-text" style="font-weight: 400">我们的合作伙伴</h1>
      <p class="font-text">
        我们服务过全球超过百家知名企业，与其达成了长期合作的信赖关系。
      </p>
    </div>
    <div class="partner-img">
      <div class="logo-container">
        <div class="logo-scroll">
          <div class="logo-group">
            <img
              v-for="partner in partners"
              :key="partner.id"
              :src="partner.logo"
              :alt="partner.name"
            />
          </div>
          <div class="logo-group">
            <img
              v-for="partner in partners"
              :key="partner.id + '_clone'"
              :src="partner.logo"
              :alt="partner.name"
            />
          </div>
          <div class="logo-group">
            <img
              v-for="partner in partners"
              :key="partner.id + '_clone'"
              :src="partner.logo"
              :alt="partner.name"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";

interface Partner {
  id: number;
  name: string;
  logo: string;
}

const partners: Partner[] = [
  {
    id: 1,
    name: "Microsoft",
    logo: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31",
  },
  {
    id: 2,
    name: "Rokid",
    logo: "https://global.rokid.com/cdn/shop/files/Logo-Header_80x@2x.jpg?v=1729144994",
  },
  {
    id: 3,
    name: "中国联通",
    logo: "http://iservice.10010.com/wt_manage/uploadImg/1730297793913.png",
  },
];

defineOptions({
  name: "Partner",
});
</script>

<style lang="scss" scoped>
.partner-background {
  width: 100%;
  padding: 20px 10px 40px;
}

.partner-title {
  padding: 20px;
}

.partner-img {
  padding: 0 20%;
}

.logo-container {
  width: 100%;
  overflow: hidden;
  position: relative;
}

.logo-scroll {
  display: flex;
  animation: scroll 10s linear infinite;

  &:hover {
    animation-play-state: paused; // 鼠标悬停时暂停动画
  }
}

.logo-group {
  display: flex;
  gap: 60px;
  padding: 20px;
  flex-shrink: 0;
  /* 防止logo被压缩 */

  img {
    object-fit: contain;
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.1); // 鼠标悬停时logo放大效果
    }
  }
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}
</style>
