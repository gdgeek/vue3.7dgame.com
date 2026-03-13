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

const getQueryString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (typeof value === "number") return String(value);
  return "";
};

const decodeRouteText = (value: string): string => {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
};

const extractNameFromTitle = (title: string): string => {
  const normalized = decodeRouteText(title).trim();
  if (!normalized) return "";
  const match = normalized.match(/【([^】]+)】/);
  if (match?.[1]) return match[1].trim();
  return normalized;
};

const getScriptLabel = (): string => {
  const metaScript = t("meta.script.title");
  if (metaScript && metaScript !== "meta.script.title") {
    return String(metaScript);
  }
  const verseScript = t("verse.view.script.title");
  if (verseScript && verseScript !== "verse.view.script.title") {
    return String(verseScript);
  }
  return "脚本";
};

const resolveEditorName = (): string => {
  const queryTitle = getQueryString(route.query.title);
  if (queryTitle) return extractNameFromTitle(queryTitle);
  const metaTitle =
    typeof route.meta.title === "string" ? route.meta.title : "";
  if (metaTitle) {
    const translatedTitle = String(t(metaTitle));
    const normalizedTitle =
      translatedTitle && translatedTitle !== metaTitle
        ? translatedTitle
        : metaTitle;
    return extractNameFromTitle(normalizedTitle);
  }
  return "";
};

const breadcrumbText = computed(() => {
  const path = route.path;

  const workspace = String(t("breadcrumb.workspace"));
  const entity = String(t("sidebar.entity"));
  const scene = String(t("sidebar.scene"));
  const script = getScriptLabel();
  const editorName = resolveEditorName();

  if (path === "/meta/scene") {
    const name = editorName || String(t("route.meta.sceneEditor"));
    return [workspace, entity, name].join(" / ");
  }

  if (path === "/meta/script") {
    const name = editorName || String(t("route.meta.sceneEditor"));
    return [workspace, entity, name, script].join(" / ");
  }

  if (path === "/verse/scene") {
    const name = editorName || String(t("route.project.sceneEditor"));
    return [workspace, scene, name].join(" / ");
  }

  if (path === "/verse/script") {
    const name = editorName || String(t("route.project.sceneEditor"));
    return [workspace, scene, name, script].join(" / ");
  }

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
