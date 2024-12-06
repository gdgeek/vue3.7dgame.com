<template>
  <div class="privacy-policy">
    <el-card class="policy-card">
      <template #header>
        <div class="card-header">
          <h1>隐私政策</h1>
          <div class="header-meta">
            <span class="version">版本: 1.0.0</span>
            <span class="update-time">生效日期: 2025年1月1日</span>
          </div>
        </div>
      </template>

      <div class="policy-content">
        <section class="introduction">
          <h2>引言</h2>
          <p>
            欢迎使用我们的服务。我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。本隐私政策详细说明了我们如何收集、使用、存储和保护您的信息，以及您享有的相关权利。请您仔细阅读并理解本政策。
          </p>
        </section>

        <section class="info-collection">
          <h2>1. 信息收集</h2>
          <h3>1.1 账户信息</h3>
          <ul>
            <li>基本账户信息：用户名、密码、邮箱地址</li>
            <li>个人资料信息：昵称、头像、个人简介</li>
            <li>身份认证信息：实名认证相关证件信息（如需）</li>
          </ul>

          <h3>1.2 系统使用数据</h3>
          <ul>
            <li>设备信息：设备型号、操作系统、唯一设备标识符、IP地址</li>
            <li>日志信息：登录记录、操作记录、异常记录</li>
            <li>使用数据：功能使用频率、访问时间、浏览记录</li>
          </ul>

          <h3>1.3 第三方登录信息</h3>
          <ul>
            <li>Apple ID登录相关信息</li>
            <li>其他第三方平台授权登录信息</li>
          </ul>
        </section>

        <section class="info-usage">
          <h2>2. 信息使用</h2>
          <h3>2.1 核心业务功能</h3>
          <ul>
            <li>账户管理与身份验证</li>
            <li>提供基础服务与功能访问</li>
            <li>系统通知与消息推送</li>
            <li>客户服务与技术支持</li>
          </ul>

          <h3>2.2 服务优化与安全</h3>
          <ul>
            <li>改进产品功能和用户体验</li>
            <li>系统运行状态监控</li>
            <li>预防欺诈和安全风险</li>
            <li>数据分析与统计</li>
          </ul>

          <h3>2.3 个性化服务</h3>
          <ul>
            <li>提供定制化的内容推荐</li>
            <li>优化用户界面和交互体验</li>
            <li>针对性的功能提示</li>
          </ul>
        </section>

        <section class="info-protection">
          <h2>3. 信息保护</h2>
          <h3>3.1 技术措施</h3>
          <ul>
            <li>传输加密：使用SSL/TLS加密传输</li>
            <li>存储加密：敏感数据加密存储</li>
            <li>访问控制：严格的权限管理机制</li>
            <li>安全审计：定期的安全评估和漏洞扫描</li>
          </ul>

          <h3>3.2 管理措施</h3>
          <ul>
            <li>内部管理制度：建立完善的信息安全管理体系</li>
            <li>人员管理：定期的安全培训和考核</li>
            <li>应急响应：建立安全事件应急预案</li>
          </ul>
        </section>

        <section class="user-rights">
          <h2>4. 您的权利</h2>
          <el-collapse v-model="activeRights">
            <el-collapse-item title="4.1 信息访问权" name="1">
              <div class="right-content">
                <p>您有权：</p>
                <ul>
                  <li>查询、访问您的个人信息</li>
                  <li>了解个人信息的处理状态</li>
                  <li>获取个人信息副本</li>
                </ul>
                <p>访问方式：</p>
                <ul>
                  <li>登录账户查看个人中心</li>
                  <li>联系客服申请信息副本</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.2 信息更正权" name="2">
              <div class="right-content">
                <p>您可以：</p>
                <ul>
                  <li>修改账户基本信息</li>
                  <li>更新个人资料</li>
                  <li>要求更正不准确的信息</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.3 信息删除权" name="3">
              <div class="right-content">
                <p>以下情况您可以申请删除信息：</p>
                <ul>
                  <li>处理目的已实现或不再需要</li>
                  <li>我们停止服务或运营</li>
                  <li>您撤回同意</li>
                  <li>违反法律法规或约定</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.4 撤回授权同意权" name="4">
              <div class="right-content">
                <p>您可以：</p>
                <ul>
                  <li>撤回订阅同意</li>
                  <li>取消第三方账号关联</li>
                  <li>关闭特定功能授权</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="cookies">
          <h2>5. Cookie的使用</h2>
          <el-table :data="cookieData" style="width: 100%">
            <el-table-column
              prop="type"
              label="Cookie类型"
              width="180"
            ></el-table-column>
            <el-table-column prop="purpose" label="使用目的"></el-table-column>
            <el-table-column
              prop="duration"
              label="保存时间"
              width="180"
            ></el-table-column>
          </el-table>
        </section>

        <section class="contact">
          <h2>6. 联系我们</h2>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="邮箱地址">
              <el-tag size="small">support@example.com</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              <el-tag size="small">+86 xxx-xxxx-xxxx</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工作时间">
              <el-tag size="small">周一至周五 9:00-18:00</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="响应时间">
              <el-tag size="small">收到请求后5个工作日内回复</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="updates">
          <h2>7. 政策更新</h2>
          <p>
            我们可能会适时更新本隐私政策。当本隐私政策发生重大变更时，我们会在网站显著位置发布通知，并通过站内信或邮件等方式通知您。
          </p>
          <el-timeline>
            <el-timeline-item
              v-for="(update, index) in policyUpdates"
              :key="index"
              :timestamp="update.date"
              :type="index === 0 ? 'primary' : 'info'"
            >
              {{ update.content }}
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineOptions({
  name: "PrivacyPolicy",
  inheritAttrs: false,
});

// 用户权利展开面板
const activeRights = ref(["1"]);

// Cookie使用说明数据
const cookieData = ref([
  {
    type: "必要Cookie",
    purpose: "维持网站基本功能（如登录状态）",
    duration: "会话期间",
  },
  {
    type: "功能Cookie",
    purpose: "记住用户偏好设置",
    duration: "1年",
  },
  {
    type: "统计Cookie",
    purpose: "收集匿名统计数据",
    duration: "30天",
  },
]);

// 政策更新历史
const policyUpdates = ref([
  {
    date: "2024-12-05",
    content: "隐私政策版本1.0.0正式发布",
  },
  {
    date: "2024-10-05",
    content: "增加第三方登录相关隐私说明",
  },
  {
    date: "2024-08-05",
    content: "初始版本制定",
  },
]);
</script>

<style lang="scss" scoped>
.privacy-policy {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;

  .policy-card {
    @media screen and (max-width: 768px) {
      :deep(.el-card__body) {
        padding: 10px;
      }
    }

    .policy-content {
      padding: 20px 0;

      section {
        margin-bottom: 40px;
        padding: 0 16px;

        &:last-child {
          margin-bottom: 20px;
        }

        h2 {
          font-size: 22px;
          color: #303133;
          margin: 24px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ebeef5;
        }

        h3 {
          font-size: 18px;
          color: #303133;
          margin: 20px 0 12px;
        }

        p {
          color: #606266;
          line-height: 1.8;
          margin-bottom: 16px;
          text-align: justify;
        }

        ul {
          padding-left: 20px;
          margin-bottom: 16px;

          li {
            color: #606266;
            line-height: 1.8;
            margin-bottom: 8px;
            position: relative;

            &::before {
              content: "•";
              color: #409eff;
              position: absolute;
              left: -15px;
            }
          }
        }

        &.introduction {
          p {
            font-size: 16px;
            line-height: 2;
          }
        }

        &.user-rights {
          .right-content {
            padding: 16px;
            background-color: #f8f9fa;
            border-radius: 4px;
          }
        }

        &.contact {
          :deep(.el-descriptions) {
            margin-top: 16px;
          }
        }

        &.updates {
          :deep(.el-timeline) {
            margin-top: 24px;
            padding-left: 16px;
          }
        }
      }
    }
  }
}

// 响应式适配
@media screen and (max-width: 768px) {
  .privacy-policy {
    padding: 10px;

    .policy-card {
      .card-header {
        h1 {
          font-size: 20px;
        }

        .header-meta {
          flex-direction: column;
          gap: 5px;
        }
      }

      .policy-content {
        padding: 10px 0;

        section {
          margin-bottom: 24px;
          padding: 0 8px;

          h2 {
            font-size: 18px;
            margin: 16px 0 12px;
          }

          h3 {
            font-size: 16px;
            margin: 14px 0 10px;
          }

          p,
          ul li {
            font-size: 14px;
          }
        }
      }
    }
  }
}

.cookies {
  :deep(.el-table) {
    @media screen and (max-width: 768px) {
      .el-table__header-wrapper,
      .el-table__body-wrapper {
        overflow-x: auto;
      }

      .el-table__body {
        width: 100%;
        table-layout: auto;
      }

      .el-table-column--mini {
        min-width: 120px;
      }
    }
  }
}

.contact {
  :deep(.el-descriptions) {
    @media screen and (max-width: 768px) {
      .el-descriptions__body {
        padding: 8px;
      }

      .el-descriptions-item__label {
        width: 100px;
        min-width: 100px;
      }
    }
  }
}
</style>
