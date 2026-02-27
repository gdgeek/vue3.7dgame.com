<template>
  <el-card class="policy-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <h1>服务条款</h1>
        <div class="header-meta">
          <span class="version">版本: 1.2.0</span>
          <span class="update-time">生效日期: 2024年8月15日</span>
        </div>
      </div>
    </template>

    <div class="policy-content">
      <section class="introduction">
        <h2>引言</h2>
        <p>
          感谢您选择使用上海不加班网络科技有限公司（以下简称"我们"）开发的混合现实编程与游戏平台服务（以下简称"服务"）。本服务条款是您与上海不加班网络科技有限公司之间关于您使用我们服务的法律协议。
        </p>
        <p>
          请您在使用我们的服务前，仔细阅读并充分理解本服务条款的全部内容。一旦您注册、登录、使用或以任何方式表示接受本服务，即表示您已充分理解并同意本条款的全部内容。如果您不同意本服务条款的任何内容，请勿注册或使用我们的服务。
        </p>
      </section>

      <section class="terms-service">
        <h2>1. 服务说明</h2>
        <el-collapse v-model="activeTermsService" class="custom-collapse">
          <el-collapse-item title="1.1 服务内容" name="1">
            <div class="right-content">
              <p>我们提供的混合现实编程与游戏平台服务包括但不限于：</p>
              <ul>
                <li>混合现实（AR/VR）内容创作工具</li>
                <li>3D建模与动画编辑</li>
                <li>可视化编程环境</li>
                <li>多人实时协作与游戏互动</li>
                <li>内容分享与发布</li>
                <li>云端存储与同步</li>
                <li>AR/VR游戏开发工具</li>
                <li>交互式虚拟场景构建</li>
                <li>支持Rokid等AR设备的应用开发</li>
                <li>在线游戏体验与分享</li>
              </ul>
              <p>
                我们有权在任何时候修改或中断服务，而无需通知您。我们不对因服务中断给您带来的不便或损失承担责任。
              </p>
            </div>
          </el-collapse-item>

          <el-collapse-item title="1.2 服务变更与终止" name="2">
            <div class="right-content">
              <p>我们有权在以下情况下变更或终止服务：</p>
              <ul>
                <li>根据法律法规或政策要求进行变更或终止</li>
                <li>产品迭代或技术升级需要变更或调整服务</li>
                <li>不可抗力导致的服务中断或终止</li>
                <li>出于安全或其他合理原因需要变更或终止服务</li>
                <li>平台重大技术调整或业务调整</li>
                <li>AR/VR设备支持策略调整</li>
              </ul>
              <p>
                服务变更或终止前，我们将尽可能通过适当方式通知您，并为您提供合理的时间保存和导出您的数据。
              </p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>

      <section class="terms-account">
        <h2>2. 账户管理</h2>
        <el-collapse v-model="activeTermsAccount" class="custom-collapse">
          <el-collapse-item title="2.1 账户注册与安全" name="1">
            <div class="right-content">
              <p>您在注册和使用账户时应当遵守以下规定：</p>
              <ul>
                <li>提供真实、准确、完整的个人资料</li>
                <li>妥善保管账户名称、密码及其他账户信息</li>
                <li>不得将账户出借、转让或共享给他人使用</li>
                <li>发现账户被盗用应立即通知我们</li>
                <li>遵守健康游戏规则，合理控制游戏时间</li>
                <li>未成年人使用服务前应获得监护人同意</li>
              </ul>
              <p>
                您对通过您的账户所进行的所有活动和事件负责。如因您未妥善保管账户信息导致的损失，由您自行承担。
              </p>
            </div>
          </el-collapse-item>

          <el-collapse-item title="2.2 账户限制与注销" name="2">
            <div class="right-content">
              <p>在以下情况下，我们有权限制或注销您的账户：</p>
              <ul>
                <li>提供虚假个人资料</li>
                <li>违反本服务条款或相关法律法规</li>
                <li>长期未使用账户</li>
                <li>账户存在安全风险</li>
                <li>从事损害平台或其他用户权益的行为</li>
                <li>账户被用于进行欺诈或其他违法活动</li>
                <li>恶意利用平台漏洞或技术缺陷</li>
                <li>创建或分享不适当的游戏内容</li>
                <li>干扰其他用户的游戏体验</li>
              </ul>
              <p>
                账户注销后，您的个人资料和数据将按照我们的隐私政策进行处理。注销流程通常需要5-15个工作日完成，在此期间您仍可取消注销申请。
              </p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>

      <section class="terms-content">
        <h2>3. 内容规范</h2>
        <el-collapse v-model="activeTermsContent" class="custom-collapse">
          <el-collapse-item title="3.1 用户创作内容" name="1">
            <div class="right-content">
              <p>您通过我们的服务创作、上传、分享的内容应当遵守以下规定：</p>
              <ul>
                <li>不得侵犯他人知识产权、肖像权、隐私权等合法权益</li>
                <li>不得包含色情、暴力、歧视、诽谤等违法或不良信息</li>
                <li>不得包含政治敏感、煽动民族仇恨等内容</li>
                <li>不得包含病毒、恶意代码等有害程序</li>
                <li>不得进行商业广告宣传（除非获得我们的授权）</li>
                <li>游戏内容应适合目标年龄段用户</li>
                <li>不得创建导致AR设备使用者产生身体不适的内容</li>
                <li>不得设计可能导致用户在现实环境中产生危险的游戏机制</li>
              </ul>
              <p>
                我们有权对违反上述规定的内容进行删除，并视情况对相关账户进行处理。
              </p>
            </div>
          </el-collapse-item>

          <el-collapse-item title="3.2 知识产权" name="2">
            <div class="right-content">
              <p>关于知识产权的规定如下：</p>
              <ul>
                <li>
                  我们的服务、软件及其中的所有权利（包括但不限于著作权、商标权、专利权等）均归我们所有
                </li>
                <li>
                  您创作的内容的知识产权归您所有，但您授予我们全球性、免费、非独占、可转授权的许可，以便我们存储、使用、传输、展示和分发您的内容
                </li>
                <li>
                  您保证对您上传的内容拥有合法权利，不会侵犯任何第三方的合法权益
                </li>
                <li>
                  如您的内容侵犯他人权益，您将承担全部法律责任，并赔偿因此给我们造成的损失
                </li>
                <li>
                  您同意不会对我们的服务、软件进行反向工程、反编译或试图提取源代码
                </li>
                <li>
                  您通过平台创作的游戏内容，在使用我们的SDK或API进行商业化时，可能需要额外的商业授权
                </li>
                <li>
                  对于平台提供的游戏模板、素材和工具，您仅获得在平台内使用的权利，不得单独提取用于其他商业目的
                </li>
                <li>
                  在游戏设计中使用AI生成内容时，需遵守相关的使用条款和版权规定
                </li>
              </ul>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>

      <section class="terms-liability">
        <h2>4. 免责声明</h2>
        <el-collapse v-model="activeTermsLiability" class="custom-collapse">
          <el-collapse-item title="4.1 服务保证与限制" name="1">
            <div class="right-content">
              <p>关于我们的服务，您需了解以下事项：</p>
              <ul>
                <li>
                  我们将尽最大努力确保服务的安全性和稳定性，但不能保证服务完全不会中断或没有错误
                </li>
                <li>
                  我们不对因网络故障、系统维护、升级等原因导致的服务中断承担责任
                </li>
                <li>
                  我们不对因您的设备、网络环境等原因导致的服务体验问题承担责任
                </li>
                <li>
                  我们不保证服务满足您的所有需求，也不保证服务的准确性和及时性
                </li>
                <li>我们不对AR/VR设备使用过程中可能产生的身体不适承担责任</li>
                <li>
                  我们不对用户在使用AR功能时因注意力分散导致的意外承担责任
                </li>
                <li>
                  我们不对第三方创建的游戏可能产生的任何争议或纠纷承担责任
                </li>
              </ul>
            </div>
          </el-collapse-item>

          <el-collapse-item title="4.2 损失责任限制" name="2">
            <div class="right-content">
              <p>在法律允许的最大范围内：</p>
              <ul>
                <li>
                  我们不对您使用我们服务过程中的间接损失、特殊损失、附带损失或惩罚性损害赔偿承担责任
                </li>
                <li>
                  我们对您使用服务造成的直接损失的赔偿责任，以您在损失发生前12个月内为服务支付的费用为上限
                </li>
                <li>
                  对于通过我们的服务获取的任何第三方服务或内容，我们不承担任何责任
                </li>
                <li>我们不对用户创建的游戏可能产生的任何争议或纠纷承担责任</li>
                <li>
                  我们不对因使用AR/VR设备可能产生的眩晕、头痛等不适症状承担责任
                </li>
                <li>
                  我们建议用户在使用AR/VR功能时保持安全环境，避免在危险场所使用
                </li>
              </ul>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>

      <section class="terms-disputes">
        <h2>5. 争议解决</h2>
        <div class="right-content">
          <p>
            本服务条款的解释、效力及争议解决均适用中华人民共和国大陆地区法律（不包括冲突法规则）。
          </p>
          <p>
            您与我们之间的任何争议应友好协商解决。协商不成的，任何一方均有权将争议提交至上海市徐汇区人民法院诉讼解决。
          </p>
          <p>我们提供多种争议解决渠道，包括：</p>
          <ul>
            <li>在线客服反馈</li>
            <li>邮件投诉处理</li>
            <li>社区管理员介入</li>
            <li>法律途径解决</li>
          </ul>
        </div>
      </section>

      <section class="terms-other">
        <h2>6. 其他条款</h2>
        <div class="right-content">
          <ul>
            <li>本服务条款构成您与我们之间关于使用服务的完整协议</li>
            <li>
              本服务条款的任何条款被认定为无效或不可执行，不影响其他条款的效力
            </li>
            <li>
              我们未行使或执行本服务条款中的任何权利或规定，不构成对该权利或规定的放弃
            </li>
            <li>
              我们有权随时修改本服务条款，修改后的条款将在网站上公布，并自公布之日起生效
            </li>
            <li>如条款内容与中国大陆地区法律相抵触，则以法律规定为准</li>
            <li>本条款的标题仅为方便阅读，不影响对条款内容的理解和解释</li>
            <li>服务协议以中文版本为准，其他语言版本仅供参考</li>
          </ul>
        </div>
      </section>

      <section class="contact">
        <h2>7. 联系我们</h2>
        <el-descriptions :column="1" border class="contact-info">
          <el-descriptions-item label="邮箱地址">
            <el-tag size="small" type="primary">contact@bujiaban.com</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            <el-tag size="small" type="success">+86 150-0015-9790</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="工作时间">
            <el-tag size="small" type="warning">周一至周五 10:00-18:30</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            <el-tag size="small" type="info">收到请求后5个工作日内回复</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </section>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineOptions({ name: "TermsOfServiceTab" });

const activeTermsService = ref(["1"]);
const activeTermsAccount = ref(["1"]);
const activeTermsContent = ref(["1"]);
const activeTermsLiability = ref(["1"]);
</script>

<style lang="scss" scoped>
@use "./policy-card" as *;
</style>
