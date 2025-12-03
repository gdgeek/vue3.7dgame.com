<template>
  <TransitionWrapper>
    <div class="campus-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ $t('route.personalCenter.campus') }}</span>
          </div>
        </template>
        <div class="campus-content">
          <p>{{ $t('route.personalCenter.campus') }} 页面内容</p>
        </div>
      </el-card>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import TransitionWrapper from "@/components/TransitionWrapper.vue";
</script>

<style scoped>
.campus-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.campus-content {
  padding: 20px;
  min-height: 400px;
}
</style>
