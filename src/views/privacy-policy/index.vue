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

    <keep-alive>
      <component
        :is="activeTab === 'privacy' ? PrivacyPolicyTab : TermsOfServiceTab"
      ></component>
    </keep-alive>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";

const PrivacyPolicyTab = defineAsyncComponent(
  () => import("./components/PrivacyPolicyTab.vue")
);
const TermsOfServiceTab = defineAsyncComponent(
  () => import("./components/TermsOfServiceTab.vue")
);

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
  max-width: 1200px;
  height: 100%;
  padding: 30px;
  margin: 0 auto;

  @media screen and (width <= 768px) {
    width: 100%;
    padding: 15px;
    overflow-x: hidden;
  }

  .policy-tabs {
    margin-bottom: 30px;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgb(0 0 0 / 5%);

    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }

    :deep(.el-tabs__nav) {
      display: flex;
      width: 100%;
    }

    :deep(.el-tabs__item) {
      flex: 1;
      height: 50px;
      font-size: 16px;
      font-weight: 500;
      line-height: 50px;
      text-align: center;
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
