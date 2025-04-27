<template>
  <el-card v-if="!isMobile">
    <div :class="{ 'background-screen-max': props.maxwidth }">
      <div style="float: right; height: 40px; padding-right: 10px">
        <span v-for="item in informationStore.companies" :key="item.name">
          <el-link :href="item.url" target="_blank" :underline="false">
            <el-icon>
              <HomeFilled></HomeFilled>
            </el-icon>
            <span class="font-text">
              {{ item.name }} ({{ informationStore.description }})
            </span>
          </el-link>
        </span>

        <span v-if="informationStore.beian">
          |
          <el-link href="https://beian.miit.gov.cn/" target="_blank" :underline="false">
            <el-icon>
              <Grid></Grid>
            </el-icon>
            <span class="font-text">
              {{ informationStore.beian }}
            </span>
          </el-link>
        </span>

        <!-- <span>
          |
          <el-link @click="goToContact" :underline="false">
            <el-icon>
              <Phone />
            </el-icon>
            <span class="font-text">
              联系我们
            </span>
          </el-link>
        </span> -->

        <span v-if="informationStore.privacyPolicy">
          |
          <el-link :href="informationStore.privacyPolicy.url" target="_blank" :underline="false">
            <el-icon>
              <Briefcase></Briefcase>
            </el-icon>
            <span class="font-text">
              {{ informationStore.privacyPolicy.name }}
            </span>
          </el-link>
        </span>

        <span v-if="informationStore.version">
          |
          <el-link target="_blank" :underline="false">
            <el-icon>
              <InfoFilled></InfoFilled>
            </el-icon>
            <span class="font-text">
              {{ informationStore.version }}
            </span>
          </el-link>
        </span>
      </div>
    </div>
  </el-card>
  <el-card v-if="isMobile" style="width: 100%">
    <div class="background-screen-max">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <span v-for="item in informationStore.companies" :key="item.name"
          style="display: flex; align-items: center; width: 100%">
          <el-link :href="item.url" target="_blank" :underline="false" style="display: flex; align-items: center">
            <el-icon>
              <HomeFilled></HomeFilled>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ item.name }} ({{ informationStore.description }})
            </span>
          </el-link>
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 10px">
        <span v-if="informationStore.beian" style="display: flex; align-items: center; flex: 2">
          <el-link href="https://beian.miit.gov.cn/" target="_blank" :underline="false"
            style="display: flex; align-items: center">
            <el-icon>
              <Grid></Grid>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ informationStore.beian }}
            </span>
          </el-link>
        </span>

        <!-- <span style="
            display: flex;
            align-items: center;
            flex: 1;
            justify-content: center;
          ">
          <el-link @click="goToContact" :underline="false" style="display: flex; align-items: center">
            <el-icon>
              <PhoneFilled></PhoneFilled>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              联系我们
            </span>
          </el-link>
        </span> -->

        <span v-if="informationStore.privacyPolicy" style="
            display: flex;
            align-items: center;
            flex: 1;
            justify-content: center;
          ">
          <el-link :href="informationStore.privacyPolicy.url" target="_blank" :underline="false"
            style="display: flex; align-items: center">
            <el-icon>
              <Briefcase></Briefcase>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ informationStore.privacyPolicy.name }}
            </span>
          </el-link>
        </span>

        <span v-if="informationStore.version" style="
            display: flex;
            align-items: center;
            flex: 1;
            justify-content: flex-end;
          ">
          <el-link target="_blank" :underline="false" style="display: flex; align-items: center">
            <el-icon>
              <InfoFilled></InfoFilled>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ informationStore.version }}
            </span>
          </el-link>
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useScreenStore } from "@/store";
import { useInfomationStore } from "@/store/modules/information";
import { useRouter } from "vue-router";
import { Phone, PhoneFilled } from "@element-plus/icons-vue";

const informationStore = useInfomationStore();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);
const router = useRouter();

const props = defineProps<{
  maxwidth: boolean;
}>();

// 跳转到联系我们部分
const goToContact = () => {
  // 先跳转到首页
  if (router.currentRoute.value.path !== '/web/index') {
    router.push('/web/index');
    // 给页面加载一些时间后再滚动
    setTimeout(() => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  } else {
    // 如果已经在首页，直接滚动
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
};
</script>
