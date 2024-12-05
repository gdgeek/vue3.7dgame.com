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
          <el-link
            href="https://beian.miit.gov.cn/"
            target="_blank"
            :underline="false"
          >
            <el-icon><Grid></Grid></el-icon>
            <span class="font-text">
              {{ informationStore.beian }}
            </span>
          </el-link>
        </span>

        <span v-if="informationStore.privacyPolicy">
          |
          <el-link
            :href="informationStore.privacyPolicy.url"
            target="_blank"
            :underline="false"
          >
            <el-icon><Briefcase></Briefcase></el-icon>
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
      <div
        style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"
      >
        <span
          v-for="item in informationStore.companies"
          :key="item.name"
          style="display: flex; align-items: center; width: 100%"
        >
          <el-link
            :href="item.url"
            target="_blank"
            :underline="false"
            style="display: flex; align-items: center"
          >
            <el-icon>
              <HomeFilled></HomeFilled>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ item.name }} ({{ informationStore.description }})
            </span>
          </el-link>
        </span>
      </div>
      <div
        style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"
      >
        <span
          v-if="informationStore.beian"
          style="display: flex; align-items: center"
        >
          <el-link
            href="https://beian.miit.gov.cn/"
            target="_blank"
            :underline="false"
            style="display: flex; align-items: center"
          >
            <el-icon>
              <Grid></Grid>
            </el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ informationStore.beian }}
            </span>
          </el-link>
        </span>

        <span
          v-if="informationStore.privacyPolicy"
          style="display: flex; align-items: center; margin-left: 9.5%"
        >
          <el-link
            :href="informationStore.privacyPolicy.url"
            target="_blank"
            :underline="false"
            style="display: flex; align-items: center"
          >
            <el-icon><Briefcase></Briefcase></el-icon>
            <span class="font-text" style="margin-left: 5px">
              {{ informationStore.privacyPolicy.name }}
            </span>
          </el-link>
        </span>

        <span
          v-if="informationStore.version"
          style="display: flex; align-items: center; margin-left: 9.5%"
        >
          <el-link
            target="_blank"
            :underline="false"
            style="display: flex; align-items: center"
          >
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

const informationStore = useInfomationStore();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);
const props = defineProps<{
  maxwidth: boolean;
}>();
</script>
