<template>
  <nav class="breadcrumb-nav">
    <template
      v-for="(item, index) in breadcrumbItems"
      :key="`${item.label}-${index}`"
    >
      <component
        :is="item.clickable ? 'button' : 'span'"
        :type="item.clickable ? 'button' : undefined"
        class="crumb-link"
        :class="{
          'is-clickable': item.clickable,
          'is-current': item.isCurrent,
          'is-static': !item.clickable,
        }"
        @click="handleNavigate(item)"
      >
        {{ item.label }}
        <span
          v-if="item.isCurrent && showUnsavedDot"
          class="crumb-unsaved-dot"
        ></span>
      </component>
      <span v-if="index < breadcrumbItems.length - 1" class="crumb-separator">
        /
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { editorVersionToolbarState } = useEditorVersionToolbar();

const showUnsavedDot = computed(
  () =>
    editorVersionToolbarState.active &&
    editorVersionToolbarState.status === "dirty"
);

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

interface BreadcrumbSegment {
  label: string;
  to?: RouteLocationRaw;
  clickable: boolean;
  isCurrent: boolean;
}

const HOME_PATH: RouteLocationRaw = { path: "/home/index" };
const ENTITY_LIST_PATH: RouteLocationRaw = { path: "/meta/list" };
const SCENE_LIST_PATH: RouteLocationRaw = { path: "/verse/index" };

const resolveMapSegments = (
  path: string
): Array<{ key: string; to?: RouteLocationRaw; clickable?: boolean }> => {
  const breadcrumbMap: Record<
    string,
    Array<{ key: string; to?: RouteLocationRaw; clickable?: boolean }>
  > = {
    "/home": [{ key: "breadcrumb.workspace" }],
    "/home/index": [{ key: "breadcrumb.workspace" }],
    "/resource": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.resources" },
    ],
    "/resource/polygen/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.resources" },
      { key: "sidebar.model" },
    ],
    "/resource/picture/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.resources" },
      { key: "sidebar.picture" },
    ],
    "/resource/audio/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.resources" },
      { key: "sidebar.audio" },
    ],
    "/resource/video/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.resources" },
      { key: "sidebar.video" },
    ],
    "/meta/list": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.entity" },
    ],
    "/meta/phototype/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.entity" },
    ],
    "/verse": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.scene" },
    ],
    "/verse/index": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.scene" },
      { key: "sidebar.selfCreated" },
    ],
    "/verse/public": [
      { key: "breadcrumb.workspace", to: HOME_PATH, clickable: true },
      { key: "sidebar.scene" },
      { key: "sidebar.systemRecommend" },
    ],
    "/help": [{ key: "breadcrumb.support" }],
    "/help/index": [
      { key: "breadcrumb.support" },
      { key: "breadcrumb.helpCenter" },
    ],
    "/help/videos": [
      { key: "breadcrumb.support" },
      { key: "breadcrumb.helpCenter" },
      { key: "breadcrumb.videoTutorial" },
    ],
    "/settings": [{ key: "breadcrumb.settings" }],
    "/settings/edit": [
      { key: "breadcrumb.settings" },
      { key: "breadcrumb.profile" },
    ],
    "/settings/email": [
      { key: "breadcrumb.settings" },
      { key: "homepage.edit.emailVerification" },
    ],
    "/settings/account": [
      { key: "breadcrumb.settings" },
      { key: "breadcrumb.accountSecurity" },
    ],
  };

  if (breadcrumbMap[path]) {
    return breadcrumbMap[path];
  }

  const prefixKey = Object.keys(breadcrumbMap)
    .sort((a, b) => b.length - a.length)
    .find((key) => path.startsWith(`${key}/`) || path.startsWith(`${key}?`));
  if (prefixKey) {
    return breadcrumbMap[prefixKey];
  }

  return [{ key: "breadcrumb.workspace" }];
};

const breadcrumbItems = computed<BreadcrumbSegment[]>(() => {
  const path = route.path;

  const workspace = String(t("breadcrumb.workspace"));
  const entity = String(t("sidebar.entity"));
  const scene = String(t("sidebar.scene"));
  const script = getScriptLabel();
  const editorName = resolveEditorName();

  const buildSegments = (
    segments: Array<{
      label: string;
      to?: RouteLocationRaw;
      clickable?: boolean;
    }>
  ): BreadcrumbSegment[] => {
    const lastIndex = segments.length - 1;
    return segments.map((segment, index) => {
      const isCurrent = index === lastIndex;
      const canClick =
        !isCurrent && Boolean(segment.clickable) && Boolean(segment.to);
      return {
        label: segment.label,
        to: segment.to,
        clickable: canClick,
        isCurrent,
      };
    });
  };

  if (path === "/meta/scene") {
    const name = editorName || String(t("route.meta.sceneEditor"));
    return buildSegments([
      { label: workspace, to: HOME_PATH, clickable: true },
      { label: entity, to: ENTITY_LIST_PATH, clickable: true },
      { label: name },
    ]);
  }

  if (path === "/meta/script") {
    const name = editorName || String(t("route.meta.sceneEditor"));
    return buildSegments([
      { label: workspace, to: HOME_PATH, clickable: true },
      { label: entity, to: ENTITY_LIST_PATH, clickable: true },
      {
        label: name,
        to: { path: "/meta/scene", query: route.query },
        clickable: true,
      },
      { label: script },
    ]);
  }

  if (path === "/verse/scene") {
    const name = editorName || String(t("route.project.sceneEditor"));
    return buildSegments([
      { label: workspace, to: HOME_PATH, clickable: true },
      { label: scene, to: SCENE_LIST_PATH, clickable: true },
      { label: name },
    ]);
  }

  if (path === "/verse/script") {
    const name = editorName || String(t("route.project.sceneEditor"));
    return buildSegments([
      { label: workspace, to: HOME_PATH, clickable: true },
      { label: scene, to: SCENE_LIST_PATH, clickable: true },
      {
        label: name,
        to: { path: "/verse/scene", query: route.query },
        clickable: true,
      },
      { label: script },
    ]);
  }

  const segments = resolveMapSegments(path);
  return buildSegments(
    segments.map((segment) => ({
      label: String(t(segment.key)),
      to: segment.to,
      clickable: segment.clickable,
    }))
  );
});

const handleNavigate = (item: BreadcrumbSegment) => {
  if (!item.clickable || !item.to) return;
  router.push(item.to);
};
</script>

<style lang="scss" scoped>
.breadcrumb-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.crumb-link {
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--ar-text-muted) !important;
  text-transform: none;
  letter-spacing: 0;
  background: transparent;
  border: none;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;

  &.is-clickable {
    color: #409eff !important;
    cursor: pointer;

    &:hover {
      color: #1d4ed8 !important;
      text-decoration: none;
    }
  }

  &.is-static,
  &.is-current {
    color: var(--ar-text-muted) !important;
    cursor: default;
  }
}

.crumb-unsaved-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  background: #f59a23;
  border-radius: 50%;
}

.crumb-separator {
  font-size: 13px;
  line-height: 20px;
  color: var(--ar-text-muted);
}
</style>
