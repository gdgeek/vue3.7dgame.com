<template>
  <!-- 子幕图 -->
  <section class="background-box font-text">
    <el-row>
      <!-- 手机显示 -->
      <el-col :span="24" class="hidden-md-and-up">
        <div class="font-text background-box-image">
          <div class="section-title-dark" align="left">
            <h3>{{ infoTel }}</h3>
            <small style="font-weight: lighter">{{ infoTitle }}</small>
          </div>
        </div>
      </el-col>
      <!-- PC显示 -->
      <el-col :span="24" class="hidden-sm-and-down">
        <div class="font-text background-box-image">
          <div class="section-title-dark font-text" align="left" style="padding-left: 3%">
            <h1 class="section-title-size section-title-dark title-lighter">
              {{ infoTel }}
            </h1>
            <p style="font-weight: lighter">{{ infoTitle }}</p>
          </div>
        </div>
      </el-col>
    </el-row>
  </section>
</template>

<script lang="ts" setup>
import '@/assets/font/font.css'
import { ref } from 'vue'

const infoTel = ref('融合AR/MR生态，引领创造未来~')
const infoTitle = ref('根据项目实际需求设计，助力用户开启创造之门。')
</script>

<style lang="scss" scoped>
@use '@/styles/screenstyle.scss';
@use '@/styles/sandtable.scss';

.background-box-image {
  display: flex;
  align-items: center;
  padding: 1px 3% 20px;
  width: 100%;
  height: 40vw;
  max-height: 500px;
  background: url('/media/bg/ep-subbg.jpg') center no-repeat;
  background-size: cover;

  @media (max-width: 768px) {
    height: 60vw;
  }
}
</style>
