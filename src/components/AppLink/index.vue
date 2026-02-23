<template>
  <component :is="linkType" v-bind="linkProps(to)">
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
defineOptions({
  name: "AppLink",
  inheritAttrs: false,
});

import { computed } from "vue";
import { isExternal } from "@/utils/index";

type AppLinkTo = {
  path?: string;
} & Record<string, unknown>;

const props = defineProps<{
  to: AppLinkTo;
}>();

const isExternalLink = computed(() => {
  return isExternal(props.to.path || "");
});

const linkType = computed(() => (isExternalLink.value ? "a" : "router-link"));

const linkProps = (to: AppLinkTo) => {
  if (isExternalLink.value) {
    return {
      href: to.path,
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }
  return { to: to };
};
</script>
