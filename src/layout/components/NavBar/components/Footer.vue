<template>
  <el-card v-if="!isMobile">
    <div :class="{ 'background-screen-max': props.maxwidth }">
      <div
        style="
          float: right;
          height: 40px;
          padding-right: 10px;
          display: flex;
          align-items: center;
        "
      >
        <template v-for="(link, index) in domainStore.links" :key="link.url">
          <el-link :href="link.url" target="_blank" :underline="false">
            <span class="font-text">{{ link.name }}</span>
          </el-link>
          <span
            v-if="index < domainStore.links.length - 1"
            style="margin: 0 8px"
            >|</span
          >
        </template>
      </div>
    </div>
  </el-card>
  <el-card v-if="isMobile" style="width: 100%">
    <div class="background-screen-max">
      <div
        style="
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        "
      >
        <template v-for="(link, index) in domainStore.links" :key="link.url">
          <el-link :href="link.url" target="_blank" :underline="false">
            <span class="font-text">{{ link.name }}</span>
          </el-link>
          <span v-if="index < domainStore.links.length - 1">|</span>
        </template>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useScreenStore } from "@/store";
import { useDomainStore } from "@/store/modules/domain";
import { useRouter } from "vue-router";

const domainStore = useDomainStore();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);
const router = useRouter();

const props = defineProps<{
  maxwidth: boolean;
}>();

// 跳转到联系我们部分
const goToContact = () => {
  // 先跳转到首页
  if (router.currentRoute.value.path !== "/web/index") {
    router.push("/web/index");
    // 给页面加载一些时间后再滚动
    setTimeout(() => {
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  } else {
    // 如果已经在首页，直接滚动
    const contactSection = document.getElementById("contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  }
};
</script>
