<template>
  <div class="background-screen-border">
    <!-- 巨幕板块 -->
    <section class="portal-main-background">
      <div align="center">
        <div class="portal-h1-title title-ph-l font-text">
          产品中心，选择合适的方案
        </div>
        <p class="education-gray-title title-ph-s">
          根据您的使用场景，做出最佳选择
        </p>
      </div>
      <el-row class="product-box" :gutter="30">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12" class="product-col">
          <el-card class="product-card" shadow="hover" :body-style="{ padding: '0px' }">
            <div class="product-title-box" align="center">
              <div class="portal-h3-title title-padding title-ph-l">
                开发服务
              </div>
              <p class="portal-p-title">提供实际的行业解决方案</p>
              <div class="portal-h4-title">询价拨打</div>
              <div class="portal-h4-title">15000159790</div>
            </div>
            <div class="product-price-content">
              <h3 style="color: #32373f">高级功能及特属资源</h3>
              <ul style="padding: 0 20px">
                <li>灵活解决方案</li>
                <li>可选应用案例</li>
                <li>场景扫描录入</li>
                <li>高级功能</li>
                <li>多设备协同操作体验</li>
                <li>第三人称视角</li>
                <li>特属资源</li>
                <li>支持多设备协同</li>
                <li>后期维护升级</li>
              </ul>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12" class="product-col">
          <el-card class="product-card" shadow="hover" :body-style="{ padding: '0px' }">
            <div align="center" class="product-title-box">
              <div class="portal-h3-title title-padding title-ph-l">
                私有部署
              </div>
              <p class="portal-p-title">满足企业定制化要求</p>
              <div class="portal-h4-title">询价拨打</div>
              <div class="portal-h4-title">15000159790</div>
            </div>
            <div class="product-price-content">
              <h3 style="color: #32373f">私有版本及服务器部署</h3>
              <ul style="padding: 0 20px">
                <li>私有定制版本部署</li>
                <li>服务器及ipad设备赠送</li>
                <li>一站式全场景编辑功能</li>
                <li>高级专家服务</li>
                <li>多设备协同操作体验</li>
                <li>第三人称视角</li>
                <li>特属资源</li>
                <li>支持多设备协同</li>
                <li>后期维护升级</li>
                <li>操作与使用培训</li>
              </ul>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <section class="portal-body-background">
      <br />
      <div align="center">
        <div class="portal-h1-title title-ph-l">产品说明</div>
      </div>
      <el-row class="product-box" :gutter="30">
        <el-col v-for="item in productExplains" :key="item.title" :xs="24" :sm="24" :md="12" :lg="8" :xl="8"
          align="left" class="product-col">
          <el-card class="product-card product-explain-height" shadow="hover">
            <div class="education-sub-title">{{ item.title }}</div>
            <p class="product-explain-content">{{ item.content }}</p>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 系统子幕图-->
    <SubScreen />

    <div />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import '@/assets/font/font.css'
import SubScreen from './products/SubScreen.vue'

interface ProductExplain {
  title: string
  content: string
}

const productExplains = ref<ProductExplain[]>([
  {
    title: '技术与体验',
    content: '拥有第三人称视角相关专利，满足多视角、多设备协同交互，让所有人都能身临其境。通过场景扫描和资源处理，丰富的可视化编辑技术生态，为用户提供了运行质量更加准确的实景互动操作，让行业应用深度、沉浸体验感倍增。'
  },
  {
    title: '产品优势',
    content: '提供一站式规范化项目操作与管理，多点协同作战，提供灵活而又强大的技术方案作为支撑。同时拥有超过一百个元宇宙Ar实景项目开发经验，在技术和质量上经过大量的现场验证与积累。从用户实际角度出发，节本增效。'
  },
  {
    title: '后期服务',
    content: '拥有完善的全流程服务质量体系。通过项目实际分析，提供解决方案。如需现场进行技术演示，我们将派专家实地交流。项目将保质保量的进行开发，随时掌握开发方向和生产内容。在项目后期，可享有相关培训、功能升级扩充等服务。'
  }
])
</script>

<style lang="scss" scoped>
@use '@/styles/screenstyle.scss';

.portal-main-background {
  position: relative;
  width: 100%;
  min-height: 800px;
  padding-top: 10%;
  background: url('/media/bg/ep-bg.jpg') no-repeat;
  background-position: center;
  background-size: cover;
}

.product-box {
  padding: 60px 12% 100px;
}

.product-title-box {
  width: 100%;
  height: 230px;
}

.product-col {
  padding-bottom: 30px;
}

.product-card {
  max-width: 416px;
  border-radius: 10px;
  margin: 0 auto;
}

.product-price-content {
  padding: 10px 30px;
  width: 100%;
  min-height: 436px;
  background-color: #f9faff;
  border-radius: 14px;
}

.product-explain-height {
  padding: 20px 10px;
  min-height: 270px;
  background-color: #f2f5fb;
}

.product-explain-content {
  line-height: 24px;
  font-size: 15px;
  color: #8592a6;
}

.portal-body-background {
  padding-top: 100px;
  width: 100%;
  background-color: #f8fafa;
}

.portal-h1-title {
  margin-bottom: 2%;
  font-size: 50px;
  font-weight: 400;
  color: #32373f;
}

.portal-h3-title {
  padding-top: 18px;
  font-weight: 400;
  font-size: 28px;
  color: #32373f;
}

.portal-h4-title {
  padding-top: 10px;
  font-weight: 400;
  font-size: 20px;
  color: #32373f;
}

.portal-p-title {
  color: #808896;
  font-size: 16px;
  font-weight: lighter;
}

.title-padding {
  padding-top: 40px;
}

.education-gray-title {
  font-size: 24px;
  color: #8d95a6;
}

.education-sub-title {
  font-weight: 400;
  font-size: 20px;
  color: #32373f;
}

ul li::marker {
  color: #2d61fc;
  font-size: 14px;
}

ul li {
  color: #787c83;
  padding-top: 14px;
}
</style>
