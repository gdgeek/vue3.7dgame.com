<template>
  <nav class="breadcrumb-nav">
    <span class="breadcrumb-text">{{ breadcrumbText }}</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbText = computed(() => {
  const path = route.path;
  
  // 直接映射路径到完整面包屑
  const breadcrumbMap: Record<string, string> = {
    // 主页
    '/home': '工作台 / 主页',
    '/home/index': '工作台 / 主页',
    
    // 素材库
    '/resource': '工作台 / 素材库',
    '/resource/polygen/index': '工作台 / 素材库 / 模型',
    '/resource/picture/index': '工作台 / 素材库 / 图片',
    '/resource/audio/index': '工作台 / 素材库 / 音频',
    '/resource/video/index': '工作台 / 素材库 / 视频',
    
    // 实体
    '/meta/list': '工作台 / 实体',
    '/meta/phototype/index': '工作台 / 实体',
    
    // 场景
    '/verse': '工作台 / 场景',
    '/verse/index': '工作台 / 场景 / 我的场景',
    '/verse/public': '工作台 / 场景 / 场景示例',
    
    // 帮助中心
    '/help': '支持 / 帮助中心',
    '/help/index': '支持 / 帮助中心',
    '/help/videos': '支持 / 帮助中心 / 视频教程',
    
    // 设置
    '/settings': '设置',
    '/settings/edit': '设置 / 个人资料',
    '/settings/account': '设置 / 账号安全',
  };
  
  // 精确匹配
  if (breadcrumbMap[path]) {
    return breadcrumbMap[path];
  }
  
  // 前缀匹配（处理动态路由）
  for (const [key, value] of Object.entries(breadcrumbMap)) {
    if (path.startsWith(key + '/') || path.startsWith(key + '?')) {
      return value;
    }
  }
  
  // 默认返回工作台
  return '工作台';
});
</script>

<style lang="scss" scoped>
.breadcrumb-nav {
  display: flex;
  align-items: center;
}

.breadcrumb-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ar-text-muted);
}
</style>
