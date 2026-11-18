<template>
  <SubtitleLibrary
    v-if="domain.subtitleEnabled && user.userInfo?.id"
    :key="user.userInfo?.id ?? undefined"
  ></SubtitleLibrary>
  <el-empty v-else description="当前无法使用字幕资源"></el-empty>
</template>

<script setup lang="ts">
import { useDomainStore } from "@/store/modules/domain";
import { useUserStore } from "@/store/modules/user";
import SubtitleLibrary from "./SubtitleLibrary.vue";

const domain = useDomainStore();
const user = useUserStore();
</script>
