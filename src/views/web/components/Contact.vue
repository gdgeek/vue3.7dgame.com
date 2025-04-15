<template>
  <div class="contact-section" :class="{ 'dark-theme': isDark }">
    <div class="stats-background">
      <div class="parallax-bg"></div>
      <div class="overlay"></div>
    </div>

    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">联系我们</h2>
        <p class="section-subtitle">我们随时准备为您提供帮助和支持</p>
      </div>

      <div class="contact-grid" data-aos="fade-up">
        <!-- 联系信息卡片 -->
        <div class="contact-card" data-aos="fade-up" data-aos-delay="100">
          <div class="card-content">
            <h3 class="card-title">联系方式</h3>

            <div class="info-items">
              <div class="info-item">
                <div class="icon-container">
                  <img src="/media/icon/phone.png" alt="电话" />
                </div>
                <div class="info-content">
                  <h4>电话</h4>
                  <p>+86 150 0015 9790</p>
                </div>
              </div>

              <div class="info-item">
                <div class="icon-container">
                  <img src="/media/icon/address.png" alt="地址" />
                </div>
                <div class="info-content">
                  <h4>地址</h4>
                  <p>湖南省长沙市长沙县和悦城S1栋1901</p>
                </div>
              </div>

              <div class="info-item">
                <div class="icon-container">
                  <img src="/media/icon/email.png" alt="邮箱" />
                </div>
                <div class="info-content">
                  <h4>邮箱</h4>
                  <p>bujiabangongzuoshi@yeah.net</p>
                </div>
              </div>

              <div class="info-item">
                <div class="icon-container">
                  <img src="/media/icon/wechat.png" alt="微信" />
                </div>
                <div class="info-content">
                  <h4>微信</h4>
                  <p>15000159790</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 社交媒体卡片 -->
        <div class="contact-card" data-aos="fade-up" data-aos-delay="200">
          <div class="card-content">
            <h3 class="card-title">关注我们</h3>

            <div class="social-icons">
              <a href="https://testflight.apple.com/join/V4XNEG6t" target="_blank" class="social-item">
                <div class="icon-container">
                  <img src="/media/icon/testflight.ico" alt="TestFlight" />
                </div>
                <div class="info-content">
                  <h4>TestFlight</h4>
                  <p>体验最新测试版本</p>
                </div>
              </a>

              <a href="https://discord.gg/KhkJySu7bb" target="_blank" class="social-item">
                <div class="icon-container">
                  <img src="/media/icon/discord.ico" alt="Discord" />
                </div>
                <div class="info-content">
                  <h4>Discord</h4>
                  <p>加入我们的社区讨论</p>
                </div>
              </a>

              <a href="https://x.com/GD_Geek" target="_blank" class="social-item">
                <div class="icon-container">
                  <img src="/media/icon/x.png" alt="X.com" />
                </div>
                <div class="info-content">
                  <h4>X.com</h4>
                  <p>关注我们的最新动态</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { computed } from "vue";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";

defineOptions({
  name: "Contact",
  inheritAttrs: false,
});

// 使用settingsStore获取主题
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
</script>

<style lang="scss" scoped>
.contact-section {
  position: relative;
  padding: 120px 0;
  color: #fff;
  overflow: hidden;

  &:not(.dark-theme) {
    .section-title {
      color: #252b3a;
    }

    .section-subtitle {
      color: #677288;
    }

    .card-title {
      color: #252b3a;
    }

    .info-content {
      h4 {
        color: #252b3a;
      }

      p {
        color: #677288;
      }
    }

    .icon-container {
      background-color: rgba(59, 130, 246, 0.1);

      img {
        filter: none;
      }
    }

    .stats-background .overlay {
      background: linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.9));
    }

    .contact-card {
      background-color: #fff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
  }

  &.dark-theme {
    .section-title {
      color: #fff;
    }

    .section-subtitle {
      color: #a0a0a0;
    }

    .card-title {
      color: #fff;
    }

    .info-content {
      h4 {
        color: #fff;
      }

      p {
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .icon-container {
      background-color: rgba(255, 255, 255, 0.1);

      img {
        filter: brightness(1.2);
      }
    }

    .stats-background .overlay {
      background: linear-gradient(to right, rgba(18, 18, 18, 0.9), rgba(30, 30, 30, 0.9));
    }

    .contact-card {
      background-color: #1e1e1e;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
  }
}

.stats-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;

  .parallax-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: transform 0.2s ease-out;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    position: relative;
    display: inline-block;

    &:after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, #7367f0, #00cfe8);
      border-radius: 2px;
    }
  }

  .section-subtitle {
    font-size: 1.1rem;
    max-width: 700px;
    margin: 0 auto;
  }
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
  margin-bottom: 80px;
}

.contact-card {
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  }

  .card-content {
    padding: 30px;

    .card-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 24px;
      text-align: center;
      position: relative;

      &:after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 3px;
        background: linear-gradient(90deg, #7367f0, #00cfe8);
        border-radius: 1.5px;
      }
    }
  }
}

.info-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 30px;
}

.info-item,
.social-item {
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(5px);
  }
}

.social-icons {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 30px;
}

.social-item {
  text-decoration: none;
  color: inherit;
}

.icon-container {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.info-content {
  h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 5px;
  }

  p {
    font-size: 0.95rem;
    margin: 0;
    line-height: 1.5;
  }
}

// 响应式调整
@media screen and (max-width: 992px) {
  .contact-section {
    padding: 80px 0;
  }

  .section-header {
    margin-bottom: 40px;

    .section-title {
      font-size: 2.2rem;
    }
  }
}

@media screen and (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    .section-title {
      font-size: 1.8rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }
  }

  .contact-card {
    .card-content {
      padding: 24px;

      .card-title {
        font-size: 1.3rem;
      }
    }
  }
}

@media screen and (max-width: 576px) {
  .contact-section {
    padding: 60px 0;
  }

  .section-header {
    .section-title {
      font-size: 1.6rem;
    }
  }

  .info-item,
  .social-item {
    gap: 12px;
  }

  .icon-container {
    width: 40px;
    height: 40px;

    img {
      width: 20px;
      height: 20px;
    }
  }

  .info-content {
    h4 {
      font-size: 1rem;
    }

    p {
      font-size: 0.85rem;
    }
  }
}
</style>