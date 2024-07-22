<template>
  <div>
    <el-card shadow="never">
      <section>
        <h4>热门资源</h4>
        <div class="block">
          <span class="demonstration">默认 Hover 指示器触发</span>
          <el-carousel height="220px">
            <el-carousel-item v-for="item in 4" :key="item">
              <h3 class="small">{{ item }}123132</h3>
            </el-carousel-item>
          </el-carousel>
        </div>
      </section>
    </el-card>

    <br />
    <el-card shadow="never">
      <section>
        <h4>共享资源</h4>
      </section>
    </el-card>
    <br />
    <br />
  </div>
</template>

<script>
export default {
  name: "MrPPMyResource",
  data() {
    return {};
  },
};
</script>

<style lang="scss" scoped>
.el-carousel__item h3 {
  color: #475669;
  font-size: 14px;
  opacity: 0.75;
  line-height: 220px;
  margin: 0;
}

.el-carousel__item:nth-child(2n) {
  background-color: #99a9bf;
}

.el-carousel__item:nth-child(2n + 1) {
  background-color: #d3dce6;
}
</style>
