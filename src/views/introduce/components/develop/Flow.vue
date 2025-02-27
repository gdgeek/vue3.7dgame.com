<template>
  <!-- 开发流程板块 -->
  <section class="sandtable-section">
    <div align="center">
      <h1 class="p-title-m" style="color: #4183ea">{{ title }}</h1>
      <h4>{{ subtitle }}</h4>
      <p class="section-underline-style" />
    </div>

    <div style="min-height: 350px; margin-top: 40px" align="left">
      <el-row :gutter="10">
        <!-- 开发流程图 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <div style="background-color: #f8f8f8; padding: 30px" class="section-radius">
            <img src="/media/bg/business3.jpg" style="width: 100%" />
            <h4 style="padding-top: 20px">{{ description }}</h4>
          </div>
          <br />
        </el-col>
        <!-- 开发流程 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-timeline>
            <el-timeline-item v-for="item in timelineItems" :key="item.step" :timestamp="item.step" placement="top">
              <div class="section-radius timeline-content">
                <b>{{ item.title }}：</b>
                <p class="section-content-size">{{ item.content }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-col>
      </el-row>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TimelineItem {
  step: string
  title: string
  content: string
}

const title = ref('项目开发流程')
const subtitle = ref('专注开发效率和用户体验，不断优化流程、提升项目质量')
const description = ref('我们拥有超过100个HoloLens 项目开发的经验,丰富的经验和资源让我们在开发过程中可以避开误区，有效节约成本，优化流程效率，客户满意度更高！')

const timelineItems = ref<TimelineItem[]>([
  {
    step: '步骤一',
    title: '需求分析',
    content: '提供您的绝妙创意，我们将分析您的需求，为您提供解决方案,如需现场进行演示和勘察，我们将派专家实地交流。'
  },
  {
    step: '步骤二',
    title: '定制报价',
    content: '我们将根据用户实际需要，悉心为您定制DEMO和报价，并解答相关问题，为下一步的开发做好准备。'
  },
  {
    step: '步骤三',
    title: '签订合同',
    content: '如果您对报价满意，签订合同后，我们将保质保量的进行开发，您可以随时掌握到我们的开发方向和内容，期待您的建议！'
  },
  {
    step: '步骤四',
    title: '验收帮助',
    content: '我们将根据用户实际需要，悉心为您定制DEMO和报价，解答相关问题，为下一步的开发做好准备。'
  }
])
</script>

<style lang="scss" scoped>
@use '@/styles/responsive-style.scss';
@use '@/styles/sandtable.scss';

.timeline-content {
  background-color: #f8f8f8;
  padding: 20px 20px 10px;
}
</style>
