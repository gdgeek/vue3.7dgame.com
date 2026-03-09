<template>
  <el-breadcrumb class="flex-y-center">
    <transition-group
      enter-active-class="animate__animated animate__fadeInRight"
    >
      <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
        <span
          v-if="
            item.redirect === 'noredirect' || index === breadcrumbs.length - 1
          "
          class="color-gray-400"
          >{{ translateRouteTitle(item.meta?.title || "") }}</span
        >
        <a v-else @click.prevent="handleLink(item)">
          {{ translateRouteTitle(item.meta?.title || "") }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import SecureLS from "secure-ls";
const ls = new SecureLS({ encodingType: "aes" });
import { RouteLocationMatched, type LocationQuery } from "vue-router";
import { useRouter } from "@/router";
const router = useRouter();
import { translateRouteTitle } from "@/utils/i18n";
import i18n from "@/lang";
const currentRoute = useRoute();

// 使用 Map 存储路由路径和对应的查询参数
type StoredQuery = Record<string, unknown>;

type BreadcrumbRoute = {
  path?: string;
  redirect?: string;
  query?: StoredQuery;
  enterCallbacks?: StoredQuery;
  meta?: { title?: string; breadcrumb?: boolean; [key: string]: unknown };
  [key: string]: unknown;
};

const routeQueryMap = ref(new Map<string, StoredQuery>());

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

const extractNameFromRouteTitle = (title: string): string => {
  const normalized = decodeRouteText(title).trim();
  if (!normalized) return "";
  const bracketMatch = normalized.match(/【([^】]+)】/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim();
  }
  return normalized;
};

const resolveSceneQuery = (scenePath: string): StoredQuery => {
  const saved = routeQueryMap.value.get(scenePath) || {};
  const id =
    getQueryString(currentRoute.query.id) ||
    getQueryString((saved as StoredQuery).id);
  const title =
    getQueryString(currentRoute.query.title) ||
    getQueryString((saved as StoredQuery).title);

  const query: StoredQuery = {};
  if (id) query.id = id;
  if (title) query.title = title;
  return query;
};

const getScriptCrumbLabel = (moduleType: "meta" | "verse"): string => {
  const key =
    moduleType === "meta" ? "meta.script.title" : "verse.view.script.title";
  const text = i18n.global.t(key);
  return typeof text === "string" && text !== key ? text : "脚本";
};

const buildEditorBreadcrumbs = (
  moduleType: "meta" | "verse",
  isScript: boolean
): Array<BreadcrumbRoute> => {
  const isMeta = moduleType === "meta";
  const scenePath = isMeta ? "/meta/scene" : "/verse/scene";
  const modulePath = isMeta ? "/meta/list" : "/verse/index";
  const moduleTitle = isMeta ? "meta.title" : "project.title";
  const fallbackEditorTitle = isMeta
    ? "meta.sceneEditor"
    : "project.sceneEditor";
  const sceneQuery = resolveSceneQuery(scenePath);
  const entityName = extractNameFromRouteTitle(
    getQueryString(sceneQuery.title)
  );

  const result: Array<BreadcrumbRoute> = [
    { path: "/home/index", meta: { title: "dashboard" } },
    { path: modulePath, meta: { title: moduleTitle } },
    {
      path: scenePath,
      query: sceneQuery,
      meta: { title: entityName || fallbackEditorTitle },
    },
  ];

  if (isScript) {
    result.push({
      path: currentRoute.path,
      query: normalizeQuery(currentRoute.query),
      meta: { title: getScriptCrumbLabel(moduleType) },
    });
  }

  return result;
};

function normalizeQuery(query: LocationQuery): StoredQuery {
  return Object.fromEntries(Object.entries(query));
}

// 从 secure-ls 加载保存的路由参数
function loadRouteQueryMap() {
  try {
    const savedMap = ls.get("routeQueryMap") as Record<string, StoredQuery> | null;
    if (savedMap && typeof savedMap === "object") {
      routeQueryMap.value = new Map(Object.entries(savedMap));
    }
  } catch (error) {
    logger.error("加载路由参数失败:", error);
  }
}

// 保存路由参数到 secure-ls
function saveRouteQueryMap() {
  try {
    const mapObject = Object.fromEntries(routeQueryMap.value);
    ls.set("routeQueryMap", mapObject);
  } catch (error) {
    logger.error("保存路由参数失败:", error);
  }
}

// 保存当前路由的查询参数
function saveCurrentRouteQuery() {
  if (currentRoute.path) {
    // 为了确保路径的唯一性，我们使用完整的路径作为键
    const key = currentRoute.path;
    routeQueryMap.value.set(key, normalizeQuery(currentRoute.query));
    saveRouteQueryMap();
  }
}

const breadcrumbs = ref<Array<BreadcrumbRoute>>([]);

function getBreadcrumb() {
  // 保存当前路由的查询参数
  saveCurrentRouteQuery();

  if (currentRoute.path === "/meta/scene") {
    breadcrumbs.value = buildEditorBreadcrumbs("meta", false);
    return;
  }

  if (currentRoute.path === "/meta/script") {
    breadcrumbs.value = buildEditorBreadcrumbs("meta", true);
    return;
  }

  if (currentRoute.path === "/verse/scene") {
    breadcrumbs.value = buildEditorBreadcrumbs("verse", false);
    return;
  }

  if (currentRoute.path === "/verse/script") {
    breadcrumbs.value = buildEditorBreadcrumbs("verse", true);
    return;
  }

  // 过滤出包含 meta 和 title 的路由
  let matched = currentRoute.matched.filter(
    (item) => item.meta && item.meta.title
  );

  // 如果第一个面包屑不是 dashboard 则添加 dashboard
  const first = matched[0];
  if (!isDashboard(first as unknown as BreadcrumbRoute)) {
    const dashboard = {
      path: "/home/index",
      meta: { title: "dashboard" },
    } as RouteLocationMatched;
    matched = [dashboard].concat(matched);
  }

  breadcrumbs.value = matched.filter((item) => {
    return item.meta && item.meta.title && item.meta.breadcrumb !== false;
  }) as unknown as BreadcrumbRoute[];
}

function isDashboard(route: BreadcrumbRoute) {
  const name = route && route.name;
  if (!name) {
    return false;
  }
  return (
    name.toString().trim().toLocaleLowerCase() ===
    "Dashboard".toLocaleLowerCase()
  );
}

function handleLink(item: BreadcrumbRoute) {
  if (!item) return;

  // 构建完整的路由参数
  const routeParams: { path?: string; query?: StoredQuery } = {};

  // 处理路径
  if (item.redirect) {
    routeParams.path = item.redirect;
  } else if (item.path) {
    routeParams.path = item.path;
  } else {
    logger.warn("无效的路由路径:", item);
    return;
  }

  // 处理查询参数
  if (item.query) {
    // 使用保存的查询参数
    routeParams.query = item.query;
    logger.log("使用item.query:", routeParams.query);
  } else if (item.enterCallbacks) {
    routeParams.query = item.enterCallbacks;
    logger.log("使用item.enterCallbacks:", routeParams.query);
  } else if (
    typeof routeParams.path === "string" &&
    routeParams.path.includes("/scene")
  ) {
    // 尝试从 Map 中获取保存的查询参数
    const savedQuery = routeQueryMap.value.get(routeParams.path);
    if (savedQuery) {
      routeParams.query = savedQuery;
      logger.log("使用保存的查询参数:", routeParams.query);
    } else {
      routeParams.query = {
        id: currentRoute.query.id,
        title: currentRoute.query.title,
      };
      logger.log("使用当前查询参数:", routeParams.query);
    }
  }

  logger.log("路由跳转参数:", routeParams);

  router
    .push({
      path: routeParams.path!,
      query: routeParams.query as Record<string, string>,
    })
    .catch((err) => {
      logger.warn("路由跳转失败:", err);
    });
}

// 监听路由变化，更新面包屑
watch(
  () => currentRoute.path,
  (path) => {
    if (path.startsWith("/redirect/")) {
      return;
    }
    getBreadcrumb();
  }
);

// 监听完整路径变化（包含 query），避免 deep watch 路由对象
watch(
  () => currentRoute.fullPath,
  () => {
    saveCurrentRouteQuery();
    getBreadcrumb();
  }
);

onBeforeMount(() => {
  // 加载保存的路由参数
  loadRouteQueryMap();
  getBreadcrumb();
});
</script>

<style lang="scss" scoped>
// 覆盖 element-plus 的样式
.el-breadcrumb__inner,
.el-breadcrumb__inner a {
  font-weight: 400 !important;
}
</style>
