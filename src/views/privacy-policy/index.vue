<template>
  <div class="privacy-policy">
    <!-- 顶部选项卡导航 -->
    <el-tabs
      v-model="activeTab"
      class="policy-tabs"
      type="border-card"
      @tab-click="handleTabClick"
    >
      <el-tab-pane label="隐私政策" name="privacy"></el-tab-pane>
      <el-tab-pane label="服务条款" name="terms"></el-tab-pane>
    </el-tabs>

    <PrivacyPolicyTab v-if="activeTab === 'privacy'" />
    <TermsOfServiceTab v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import PrivacyPolicyTab from "./components/PrivacyPolicyTab.vue";
import TermsOfServiceTab from "./components/TermsOfServiceTab.vue";

defineOptions({
  name: "PrivacyPolicy",
  inheritAttrs: false,
});

const route = useRoute();
const router = useRouter();

const activeTab = ref("privacy");

onMounted(() => {
  if (route.query.tab === "terms") {
    activeTab.value = "terms";
  } else {
    activeTab.value = "privacy";
  }
});

const handleTabClick = () => {
  router.replace({
    path: route.path,
    query: { tab: activeTab.value },
  });
};
</script>

<style lang="scss" scoped>
.privacy-policy {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;

  @media screen and (max-width: 768px) {
    padding: 15px;
    overflow-x: hidden;
    width: 100%;
  }

  .policy-tabs {
    margin-bottom: 30px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;

    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }

    :deep(.el-tabs__nav) {
      width: 100%;
      display: flex;
    }

    :deep(.el-tabs__item) {
      flex: 1;
      text-align: center;
      font-size: 16px;
      font-weight: 500;
      height: 50px;
      line-height: 50px;
      transition: all 0.3s;

      &.is-active {
        font-weight: 600;
        color: #409eff;
      }

      &:hover {
        color: #409eff;
      }
    }
  }
}
</style>
