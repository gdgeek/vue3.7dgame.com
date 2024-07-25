<template>
  <el-card>
    <div :class="{ 'background-screen-max': maxwidth }">
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
            <el-icon><List></List></el-icon>
            <span class="font-text">
              {{ informationStore.beian }}
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
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useInfomationStore } from "@/store/modules/information";

const informationStore = useInfomationStore();
const props = defineProps<{
  maxwidth: boolean;
}>();
</script>
