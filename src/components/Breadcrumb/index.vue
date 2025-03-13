<template>
  <el-breadcrumb class="flex-y-center">
    <transition-group enter-active-class="animate__animated animate__fadeInRight">
      <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
        <span v-if="
          item.redirect === 'noredirect' || index === breadcrumbs.length - 1
        " class="color-gray-400">{{ translateRouteTitle(item.meta.title) }}</span>
        <a v-else @click.prevent="handleLink(item)">
          {{ translateRouteTitle(item.meta.title) }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { RouteLocationMatched } from "vue-router";
import { useRouter } from "@/router";
const router = useRouter();
import { translateRouteTitle } from "@/utils/i18n";
const currentRoute = useRoute();

// 使用 Map 存储路由路径和对应的查询参数
const routeQueryMap = ref(new Map<string, any>());

// 从 localStorage 加载保存的路由参数
function loadRouteQueryMap() {
  try {
    const savedMap = localStorage.getItem('routeQueryMap');
    if (savedMap) {
      const parsedMap = JSON.parse(savedMap);
      routeQueryMap.value = new Map(Object.entries(parsedMap));
    }
  } catch (error) {
    console.error('加载路由参数失败:', error);
  }
}

// 保存路由参数到 localStorage
function saveRouteQueryMap() {
  try {
    const mapObject = Object.fromEntries(routeQueryMap.value);
    localStorage.setItem('routeQueryMap', JSON.stringify(mapObject));
  } catch (error) {
    console.error('保存路由参数失败:', error);
  }
}

// 保存当前路由的查询参数
function saveCurrentRouteQuery() {
  if (currentRoute.path) {
    // 为了确保路径的唯一性，我们使用完整的路径作为键
    const key = currentRoute.path;
    routeQueryMap.value.set(key, { ...currentRoute.query });
    saveRouteQueryMap();
  }
}

const breadcrumbs = ref<Array<RouteLocationMatched>>([]);

function getBreadcrumb() {
  // 过滤出包含 meta 和 title 的路由
  let matched = currentRoute.matched.filter(
    (item) => item.meta && item.meta.title
  );

  // 保存当前路由的查询参数
  saveCurrentRouteQuery();

  // 判断是否是进入 script 模块
  if (
    currentRoute.path === "/verse/script" ||
    currentRoute.path === "/meta/script"
  ) {
    // 确定基础路径
    const basePath = currentRoute.path.includes('/verse/') ? '/verse/scene' : '/meta/scene';

    // 获取保存的场景编辑器的查询参数，如果没有则使用当前的
    const savedSceneQuery = routeQueryMap.value.get(basePath) || {
      id: currentRoute.query.id,
      title: currentRoute.query.title
    };

    console.log('使用保存的场景查询参数:', basePath, savedSceneQuery);

    // 创建 sceneBreadcrumb 对象，并携带保存的路由参数
    const sceneBreadcrumb = {
      path: basePath,
      meta: { title: "project.sceneEditor" },
      query: savedSceneQuery,
    } as unknown as RouteLocationMatched;

    // 查找 scene 在 matched 中的位置
    const sceneIndex = matched.findIndex(
      (item) => item.path === "/verse/scene" || item.path === "/meta/scene"
    );

    // 如果没有找到 scene，插入 sceneBreadcrumb
    if (sceneIndex === -1) {
      const scriptIndex = matched.findIndex(
        (item) => item.path === "/verse/script" || item.path === "/meta/script"
      );

      // 在 script 的前面插入 sceneBreadcrumb
      if (scriptIndex !== -1) {
        matched.splice(scriptIndex, 0, sceneBreadcrumb);
      }
    }
  }

  // 如果第一个面包屑不是 dashboard 则添加 dashboard
  const first = matched[0];
  if (!isDashboard(first)) {
    matched = [
      { path: "/home/index", meta: { title: "dashboard" } } as any,
    ].concat(matched);
  }

  breadcrumbs.value = matched.filter((item) => {
    return item.meta && item.meta.title && item.meta.breadcrumb !== false;
  });
}

function isDashboard(route: RouteLocationMatched) {
  const name = route && route.name;
  if (!name) {
    return false;
  }
  return (
    name.toString().trim().toLocaleLowerCase() ===
    "Dashboard".toLocaleLowerCase()
  );
}

function handleLink(item: any) {
  if (!item) return;

  // 构建完整的路由参数
  const routeParams: any = {};

  // 处理路径
  if (item.redirect) {
    routeParams.path = item.redirect;
  } else if (item.path) {
    routeParams.path = item.path;
  } else {
    console.warn('无效的路由路径:', item);
    return;
  }

  // 处理查询参数
  if (item.query) {
    // 使用保存的查询参数
    routeParams.query = item.query;
    console.log('使用item.query:', routeParams.query);
  } else if (item.enterCallbacks) {
    routeParams.query = item.enterCallbacks;
    console.log('使用item.enterCallbacks:', routeParams.query);
  } else if (typeof routeParams.path === 'string' && routeParams.path.includes('/scene')) {
    // 尝试从 Map 中获取保存的查询参数
    const savedQuery = routeQueryMap.value.get(routeParams.path);
    if (savedQuery) {
      routeParams.query = savedQuery;
      console.log('使用保存的查询参数:', routeParams.query);
    } else {
      routeParams.query = {
        id: currentRoute.query.id,
        title: currentRoute.query.title
      };
      console.log('使用当前查询参数:', routeParams.query);
    }
  }

  console.log('路由跳转参数:', routeParams);

  router.push(routeParams).catch((err) => {
    console.warn('路由跳转失败:', err);
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

// 监听查询参数变化，更新保存的查询参数
watch(
  () => currentRoute.query,
  () => {
    saveCurrentRouteQuery();
  },
  { deep: true }
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
