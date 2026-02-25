<template>
  <nav class="breadcrumb-nav">
    <span class="breadcrumb-text">{{ breadcrumbText }}</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const route = useRoute();
const { t } = useI18n();

const breadcrumbText = computed(() => {
  const path = route.path;

  const breadcrumbMap: Record<string, string[]> = {
    "/home": ["breadcrumb.workspace", "sidebar.home"],
    "/home/index": ["breadcrumb.workspace", "sidebar.home"],

    "/resource": ["breadcrumb.workspace", "sidebar.resources"],
    "/resource/polygen/index": [
      "breadcrumb.workspace",
      "sidebar.resources",
      "sidebar.model",
    ],
    "/resource/picture/index": [
      "breadcrumb.workspace",
      "sidebar.resources",
      "sidebar.picture",
    ],
    "/resource/audio/index": [
      "breadcrumb.workspace",
      "sidebar.resources",
      "sidebar.audio",
    ],
    "/resource/video/index": [
      "breadcrumb.workspace",
      "sidebar.resources",
      "sidebar.video",
    ],

    "/meta/list": ["breadcrumb.workspace", "sidebar.entity"],
    "/meta/phototype/index": ["breadcrumb.workspace", "sidebar.entity"],

    "/verse": ["breadcrumb.workspace", "sidebar.scene"],
    "/verse/index": [
      "breadcrumb.workspace",
      "sidebar.scene",
      "sidebar.selfCreated",
    ],
    "/verse/public": [
      "breadcrumb.workspace",
      "sidebar.scene",
      "sidebar.systemRecommend",
    ],

    "/help": ["breadcrumb.support", "breadcrumb.helpCenter"],
    "/help/index": ["breadcrumb.support", "breadcrumb.helpCenter"],
    "/help/videos": [
      "breadcrumb.support",
      "breadcrumb.helpCenter",
      "breadcrumb.videoTutorial",
    ],

    "/settings": ["breadcrumb.settings"],
    "/settings/edit": ["breadcrumb.settings", "breadcrumb.profile"],
    "/settings/email": [
      "breadcrumb.settings",
      "homepage.edit.emailVerification",
    ],
    "/settings/account": ["breadcrumb.settings", "breadcrumb.accountSecurity"],
  };

  if (breadcrumbMap[path]) {
    return breadcrumbMap[path].map((key) => t(key)).join(" / ");
  }

  for (const [key, value] of Object.entries(breadcrumbMap)) {
    if (path.startsWith(key + "/") || path.startsWith(key + "?")) {
      return value.map((item) => t(item)).join(" / ");
    }
  }

  return t("breadcrumb.workspace");
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
