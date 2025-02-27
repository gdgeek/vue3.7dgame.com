<template>
  <div>
    <!-- 创新优势板块 -->
    <section class="sandtable-section">
      <br />
      <div align="center">
        <h1 class="section-title-size section-title-dark title-lighter" style="color: #4183ea">
          创新优势
        </h1>
        <p class="f-text-color">多种先进科技交互体验，精彩纷呈</p>
        <!-- <p class="section-underline-blue" /> -->
        <p class="section-underline-style" />
      </div>
      <!-- 技术种类 -->
      <div class="deploy-flex-box">
        <div v-for="item in techList" :key="item.id" class="deploy-flex-son" align="center">
          <img :src="item.icon" class="deploy-img" />
          <div>{{ item.title }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
interface TechItem {
  id: number
  icon: string
  title: string
}

const techList: TechItem[] = [
  {
    id: 1,
    icon: '/media/icon/education-cion1.png',
    title: '多⼈多设备互动'
  },
  {
    id: 2,
    icon: '/media/icon/education-cion2.png',
    title: '投屏实现'
  },
  {
    id: 3,
    icon: '/media/icon/education-cion3.png',
    title: '同步操作'
  },
  {
    id: 4,
    icon: '/media/icon/education-cion4.png',
    title: '第三⽅视⻆'
  },
  {
    id: 5,
    icon: '/media/icon/education-cion5.png',
    title: '空间定位'
  }
]
</script>

<style lang="scss" scoped>
@use '@/styles/screenstyle.scss';
@use '@/styles/sandtable.scss';

.deploy-flex-box {
  margin-top: 50px;
  margin-bottom: 40px;
  padding: 0 5%;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  min-height: 280px;
}

.deploy-flex-son {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 20px;
  border-radius: 10px;
  width: 170px;
  height: 170px;
  background-color: #d3edf8;
  margin-bottom: 20px;
}

.deploy-img {
  padding: 24px 36px;
}

.deploy-flex-son:hover {
  background-color: #bcdcf8;
}

.deploy-flex-son p {
  border-radius: 50%;
  width: 100px;
  height: 100px;
  line-height: 100px;
  background-color: #fff;
  margin: 20px auto 16px;
  text-align: center;
  color: red;
}

.deploy-flex-son div {
  text-align: center;
  color: #677990;
}
</style>
