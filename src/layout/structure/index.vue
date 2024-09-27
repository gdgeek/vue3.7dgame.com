<template>
  <div>
    <home-header></home-header>
    <el-container>
      <el-main>
        <el-row :gutter="20">
          <el-col :sm="16">
            <router-view></router-view>
            <br />
          </el-col>

          <el-col :sm="8">
            <mr-p-p-user-creater></mr-p-p-user-creater>
            <br />
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import MrPPUserCreater from "@/components/MrPP/MrPPUserSettings/MrPPUserCreater.vue";
import HomeHeader from "@/components/Home/HomeHeader.vue";
</script>

<style lang="scss" scoped>
.el-row {
  margin-bottom: 10px;
}

.user-background {
  min-height: 150px;
  background-image: url("/media/image/bgcsky.jpg");
  background-repeat: no-repeat;
  background-size: cover;
}

.right-sub-card span {
  margin-right: 30px;
}
</style>
