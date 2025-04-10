<template>
  <footer class="web-footer" :class="{ 'dark-theme': isDark }">
    <div class="footer-main">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="logo-container">
              <img src="/media/image/logo.gif" alt="Logo" class="footer-logo" />
              <h2 class="footer-brand-name">不加班AR编程平台</h2>
            </div>
            <p class="footer-description">
              让每个人都能轻松创造混合现实世界，零编程经验，快速上手
            </p>
            <div class="social-icon">
              <a href="#" class="icon-link">
                <el-icon>
                  <User />
                </el-icon>
              </a>
              <a href="#" class="icon-link">
                <el-icon>
                  <Share />
                </el-icon>
              </a>
              <a href="#" class="icon-link">
                <el-icon>
                  <ChatDotRound />
                </el-icon>
              </a>
              <a href="#" class="icon-link">
                <el-icon>
                  <Picture />
                </el-icon>
              </a>
            </div>
          </div>

          <div class="footer-links">
            <h3 class="footer-title">平台功能</h3>
            <ul class="footer-menu">
              <li><a href="#">零代码创建</a></li>
              <li><a href="#">多人实时协作</a></li>
              <li><a href="#">3D模型库</a></li>
              <li><a href="#">设备兼容性</a></li>
              <li><a href="#">云端存储</a></li>
            </ul>
          </div>

          <div class="footer-links">
            <h3 class="footer-title">解决方案</h3>
            <ul class="footer-menu">
              <li><a href="#">教育应用</a></li>
              <li><a href="#">企业协作</a></li>
              <li><a href="#">远程指导</a></li>
              <li><a href="#">展览展示</a></li>
              <li><a href="#">娱乐互动</a></li>
            </ul>
          </div>

          <div class="footer-links">
            <h3 class="footer-title">支持与资源</h3>
            <ul class="footer-menu">
              <li><a href="#">帮助中心</a></li>
              <li><a href="#">学习教程</a></li>
              <li><a href="#">API文档</a></li>
              <li><a href="#">社区论坛</a></li>
              <li><a href="#">联系我们</a></li>
            </ul>
          </div>

          <div class="footer-newsletter">
            <h3 class="footer-title">获取最新资讯</h3>
            <p class="newsletter-text">订阅我们的通讯，获取产品更新和行业资讯</p>
            <div class="newsletter-form">
              <el-input placeholder="您的邮箱地址" class="newsletter-input">
                <template #append>
                  <el-button>订阅</el-button>
                </template>
              </el-input>
            </div>
            <p class="newsletter-privacy">
              我们尊重您的隐私，不会发送垃圾邮件
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container">
        <div class="bottom-flex">
          <div class="copyright">
            &copy; {{ currentYear }} 不加班AR编程平台 - 保留所有权利
          </div>
          <div class="footer-bottom-links">
            <a href="#">隐私政策</a>
            <a href="#">服务条款</a>
            <a href="#">Cookie 政策</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import { User, Share, ChatDotRound, Picture } from '@element-plus/icons-vue';

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');
const currentYear = ref(new Date().getFullYear());
</script>

<style lang="scss" scoped>
.web-footer {
  background-color: #f9fafb;
  color: #374151;

  &.dark-theme {
    background-color: #1e1e1e;
    color: #e5e7eb;

    .footer-brand-name {
      color: #f9fafb;
    }

    .footer-description {
      color: #9ca3af;
    }

    .footer-title {
      color: #f9fafb;
    }

    .footer-menu li a {
      color: #9ca3af;

      &:hover {
        color: #f9fafb;
      }
    }

    .newsletter-text,
    .newsletter-privacy {
      color: #9ca3af;
    }

    .social-link {
      background-color: #2d2d2d;
      color: #9ca3af;

      &:hover {
        background-color: #3b82f6;
        color: #fff;
      }
    }

    .footer-bottom {
      background-color: #171717;
      color: #9ca3af;
    }

    .footer-bottom-links a {
      color: #9ca3af;

      &:hover {
        color: #f9fafb;
      }
    }
  }
}

.footer-main {
  padding: 60px 0 40px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr) 2fr;
  gap: 40px;
}

.footer-brand {
  .logo-container {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  .footer-logo {
    width: 40px;
    height: 40px;
    margin-right: 12px;
  }

  .footer-brand-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .footer-description {
    font-size: 1rem;
    line-height: 1.6;
    color: #6b7280;
    margin-bottom: 24px;
  }

  .social-icon {
    display: flex;
    gap: 12px;
  }

  .icon-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #f3f4f6;
    color: #4b5563;
    transition: all 0.3s ease;

    &:hover {
      background-color: #3b82f6;
      color: #fff;
      transform: translateY(-3px);
    }

    .el-icon {
      font-size: 1.1rem;
    }
  }
}

.footer-links {
  .footer-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 20px;
    position: relative;

    &:after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      height: 2px;
      width: 40px;
      background-color: #3b82f6;
    }
  }

  .footer-menu {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin-bottom: 12px;

      a {
        color: #6b7280;
        text-decoration: none;
        transition: all 0.3s ease;
        position: relative;

        &:before {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background-color: #3b82f6;
          transition: width 0.3s ease;
        }

        &:hover {
          color: #3b82f6;

          &:before {
            width: 100%;
          }
        }
      }
    }
  }
}

.footer-newsletter {
  .footer-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 20px;
    position: relative;

    &:after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      height: 2px;
      width: 40px;
      background-color: #3b82f6;
    }
  }

  .newsletter-text {
    font-size: 1rem;
    line-height: 1.6;
    color: #6b7280;
    margin-bottom: 16px;
  }

  .newsletter-form {
    margin-bottom: 12px;
  }

  .newsletter-privacy {
    font-size: 0.875rem;
    color: #9ca3af;
  }
}

.footer-bottom {
  padding: 20px 0;
  border-top: 1px solid #e5e7eb;
  background-color: #f3f4f6;
  font-size: 0.875rem;
  color: #6b7280;
}

.bottom-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-bottom-links {
  display: flex;
  gap: 24px;

  a {
    color: #6b7280;
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: #3b82f6;
    }
  }
}

// 响应式调整
@media screen and (max-width: 1200px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 40px 20px;
  }

  .footer-brand {
    grid-column: span 2;
  }
}

@media screen and (max-width: 768px) {
  .footer-main {
    padding: 40px 0 30px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .footer-brand {
    grid-column: span 1;
  }

  .bottom-flex {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .footer-bottom-links {
    justify-content: center;
  }
}
</style>