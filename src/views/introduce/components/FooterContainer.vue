<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-main">
        <!-- Logo 部分 -->
        <div class="footer-logo">
          <div class="logo-section">
            <img src="/media/image/logo.gif" alt="Logo" />
            <span>不加班AR编程平台</span>
          </div>
          <div class="contact-section">
            <div class="contact-item">
              <el-icon>
                <Phone />
              </el-icon>
              <span>服务电话 15000159790</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <ChatDotRound />
              </el-icon>
              <span>服务微信 15000159790</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <Location />
              </el-icon>
              <span>湖南省长沙市长沙县和悦城S1</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <Message />
              </el-icon>
              <span>dirui@bujiaban.com</span>
            </div>
          </div>
        </div>

        <!-- 导航链接组 -->
        <div class="footer-links">
          <div
            class="link-group"
            v-for="group in linkGroups"
            :key="group.title"
          >
            <h3>{{ group.title }}</h3>
            <ul>
              <li v-for="link in group.links" :key="link.text">
                <a
                  :href="link.external ? link.url : 'javascript:void(0)'"
                  :target="link.external ? '_blank' : '_self'"
                  @click="!link.external && handleClick(link.url)"
                  :class="{ 'external-link': link.external }"
                >
                  <img
                    v-if="link.icon"
                    :src="link.icon"
                    :alt="link.text"
                    class="link-icon"
                  />
                  {{ link.text }}
                  <el-icon v-if="link.external" class="external-icon">
                    <ArrowRight />
                  </el-icon>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 底部信息栏 -->
      <div class="footer-bottom">
        <div class="left">
          <span>© {{ currentYear }} {{ informationStore.title }}</span>
        </div>
        <div class="right">
          <a href="#" target="_blank">{{ informationStore.beian }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useInfomationStore } from "@/store/modules/information";
import { useRouter } from "vue-router";
import {
  Phone,
  ChatDotRound,
  Location,
  Message,
} from "@element-plus/icons-vue";

interface LinkItem {
  text: string;
  url: string;
  external?: boolean;
  icon?: string;
}

interface LinkGroup {
  title: string;
  links: LinkItem[];
}

const router = useRouter();
const currentYear = computed(() => new Date().getFullYear());
const informationStore = useInfomationStore();

// 处理链接点击
const handleClick = (url: string) => {
  if (url.startsWith("#")) {
    return;
  }

  const [path, hash] = url.split("#");

  // 如果当前路径与目标路径相同，直接滚动到目标元素
  if (router.currentRoute.value.path === path && hash) {
    const element = document.querySelector(`#${hash}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  // 否则进行路由跳转
  router.push(url);
};

const linkGroups: LinkGroup[] = [
  {
    title: "关于我们",
    links: [
      { text: "公司业务", url: "/introduce/about#business" },
      { text: "公司简介", url: "/introduce/about#contact" },
      { text: "合作伙伴", url: "/introduce/about#partner" },
    ],
  },
  {
    title: "产品案例",
    links: [
      { text: "应用场景", url: "/introduce/products#solution" },
      { text: "产品中心", url: "/introduce/products#cloud" },
    ],
  },
  {
    title: "新闻动态",
    links: [
      { text: "新闻", url: "/introduce/news?tab=news" },
      { text: "案例教程", url: "/introduce/news?tab=tutorial" },
    ],
  },
  {
    title: "关注我们",
    links: [
      {
        text: "TestFlight",
        url: "https://testflight.apple.com/join/V4XNEG6t",
        external: true,
        icon: "/testflight.ico",
      },
      {
        text: "Discord",
        url: "https://discord.gg/KhkJySu7bb",
        external: true,
        icon: "/discord.ico",
      },
      {
        text: "X.com",
        url: "https://x.com/GD_Geek",
        external: true,
        icon: "/x3.png",
      },
    ],
  },
];
</script>

<style lang="scss" scoped>
.footer {
  position: sticky;
  bottom: 0;
  width: 100%;
  margin-top: auto;
  background: linear-gradient(
    135deg,
    rgba(255, 240, 245, 0.9) 0%,
    rgba(240, 248, 255, 0.9) 50%,
    rgba(230, 230, 250, 0.9) 100%
  );
  backdrop-filter: blur(10px);
  z-index: 10;
  padding: 48px 0 0;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 182, 193, 0.1) 0%,
      rgba(173, 216, 230, 0.1) 50%,
      rgba(221, 160, 221, 0.1) 100%
    );
    pointer-events: none;
  }
}

.footer-content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-main {
  display: flex;
  justify-content: space-between;
  margin-bottom: 48px;
}

.footer-logo {
  display: flex;
  flex-direction: column;
  gap: 24px;

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;

    img {
      width: 40px;
      height: 40px;
    }

    span {
      font-size: 18px;
      font-weight: 500;
      color: #1d2129;
    }
  }

  .contact-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .contact-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4e5969;
      font-size: 14px;

      .el-icon {
        font-size: 24px;
        color: #1890ff;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}

.footer-links {
  display: flex;
  gap: 80px;
}

.link-group {
  h3 {
    font-size: 16px;
    font-weight: 500;
    color: #1d2129;
    margin-bottom: 20px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin-bottom: 12px;

      a {
        color: #4e5969;
        text-decoration: none;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;

        &:hover {
          color: #1890ff;
        }

        &.external-link {
          .external-icon {
            font-size: 12px;
          }
        }
      }
    }
  }
}

.footer-bottom {
  border-top: 1px solid rgba(229, 230, 235, 0.5);
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #86909c;

  .left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .right {
    display: flex;
    gap: 16px;

    a {
      color: #86909c;
      text-decoration: none;

      &:hover {
        color: #1890ff;
      }
    }
  }
}

.link-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  margin-right: 8px;
}

.link-group ul li a {
  display: flex;
  align-items: center;
}

@media screen and (max-width: 768px) {
  .footer-main {
    flex-direction: column;
    gap: 32px;
  }

  .footer-links {
    flex-wrap: wrap;
    gap: 32px;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 16px;
    text-align: center;

    .right {
      flex-direction: column;
      align-items: center;
    }
  }
}
</style>
