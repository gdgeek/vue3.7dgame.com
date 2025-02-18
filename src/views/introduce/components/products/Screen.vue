<template>
  <el-row class="background-box-image" :style="{ 'background-image': `url(${bgUrl})` }">
    <!-- 手机显示 -->
    <el-col :span="24" class="hidden-md-and-up">
      <div class="public-phone-box font-title" :align="item.align">
        <div :style="{ color: item.color, fontSize: '24px' }">
          {{ item.title2 }}
        </div>
        <p>
          <a ref="telPhone" :href="`tel:${item.tel}`" :style="{ color: item.color }" class="phone-boder">
            点击拨打
            <i class="el-icon-phone-outline"></i>
            {{ item.tel }}
          </a>
        </p>
      </div>
    </el-col>
    <!-- PC显示 -->
    <el-col :span="24" class="hidden-sm-and-down">
      <div class="public-pc-box font-title" :align="item.align">
        <div class="public-pc-title" :style="{ color: item.color }">
          {{ item.title }}
        </div>
        <div class="public-pc-title" :style="{ color: item.color }">
          {{ item.title2 }}
        </div>
        <h1 class="font-text" :style="{
          color: item.color,
          fontWeight: 'lighter',
        }">
          即刻拨打
          {{ item.tel }}
        </h1>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
interface ScreenItem {
  align?: string;
  color?: string;
  title?: string;
  title2?: string;
  tel?: string;
}

interface Props {
  bgUrl: string;
  item: ScreenItem;
}

// 使用 withDefaults 定义属性的默认值
const props = withDefaults(defineProps<Props>(), {
  item: () => ({}),
});
</script>

<style lang="scss" scoped>
.background-box-image {
  display: flex;
  align-items: center;
  padding: 1px 3% 20px;
  width: 100%;
  height: 40vw;
  // height: 600px;
  max-height: 650px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

.public-phone-box {
  margin: 0 3%;
  padding-top: 20px;
}

.public-pc-box {
  margin: 0 8%;
}

.public-pc-title {
  margin-bottom: 1%;
  font-size: 46px;
  font-weight: 400;
}

.phone-boder {
  border-bottom: 2px solid #82eafa;
}
</style>
