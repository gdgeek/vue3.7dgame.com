<template>
  <div class="introduce-container">
    <!-- 标题 -->
    <div align="center">
      <h1 class="p-title-m" style="color: #4183ea">{{ title }}</h1>
      <h4>{{ subtitle }}</h4>
      <p class="section-underline-style" />
    </div>

    <!-- 网格布局 -->
    <div class="grid-container">
      <div v-for="(item, index) in gridItems" :key="index" class="grid-item">
        <div class="number">{{ item.number }}</div>
        <div class="content">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/assets/font/font.css'

const title = '基于HoloLens2虚实混合数字沙盘介绍'
const subtitle = '全方位覆盖用户展示需求，感知一体沉浸试体验'

const gridItems = [
  {
    number: '01',
    title: 'HoloLens 2 介绍:',
    description: '让用户更加沉浸体验感倍增，实时准确的双手直接操作，性能大幅度提高。'
  },
  {
    number: '02',
    title: '虚实数字沙盘介绍:',
    description: '真实互动操作，多种使用方案，便利化体验。'
  },
  {
    number: '03',
    title: '项目开发施工流程:',
    description: '规范化操作，多点协同作战，兼顾质量和效率，完善的售后服务。'
  },
  {
    number: '04',
    title: '第三人称视角:',
    description: '基于iPadPro 2020激光雷达的升级版本，实现人无我有，人有我优。'
  }
]
</script>

<style lang="scss" scoped>
@use '@/styles/responsive-style.scss';
@use '@/styles/sandtable.scss';

.introduce-container {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 10px;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 40px;
}

.grid-container {
  display: grid;
  margin-top: 50px;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 20px;
}

.grid-item {
  position: relative;
  padding: 20px;
  background: #fff;
  border: 1px solid #eee;
  display: flex;
  min-height: 200px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1;
  }
}

.number {
  font-size: 64px;
  font-weight: 300;
  color: #000;
  opacity: 0.8;
  position: absolute;
  left: 20px;
  top: 20px;
}

.content {
  padding: 20px;
  margin-left: 80px;
}

.content p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 背景色设置 - Web端 */
@media (min-width: 769px) {

  .grid-item:nth-child(1),
  .grid-item:nth-child(4) {
    background: #f5f5f5;
  }

  .grid-item:nth-child(2),
  .grid-item:nth-child(3) {
    background: #fff;
  }
}

/* 背景色设置 - 移动端 */
@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr; // 移动端只显示一行
  }

  .introduce-container {
    padding: 20px;
  }

  .grid-item:nth-child(odd) {
    background: #f5f5f5;
  }

  .grid-item:nth-child(even) {
    background: #fff;
  }
}
</style>
