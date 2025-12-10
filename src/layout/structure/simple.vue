<template>
  <div>
    <el-container>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.el-container {
  min-height: calc(100vh - 60px); // Adjust based on navbar height if needed
}
</style>
