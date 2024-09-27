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
          >{{ translateRouteTitle(item.meta.title) }}</span
        >
        <a v-else @click.prevent="handleLink(item)">
          {{ translateRouteTitle(item.meta.title) }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { RouteLocationMatched } from "vue-router";
import { compile } from "path-to-regexp";
import { useRouter } from "@/router";
const router = useRouter();
import { translateRouteTitle } from "@/utils/i18n";
const currentRoute = useRoute();
const currentQuery = ref();
const fullRouter = ref();
const pathCompile = (path: string) => {
  const { params } = currentRoute;
  const toPath = compile(path);
  return toPath(params);
};

const breadcrumbs = ref<Array<RouteLocationMatched>>([]);

function getBreadcrumb() {
  // 过滤出包含 meta 和 title 的路由
  let matched = currentRoute.matched.filter(
    (item) => item.meta && item.meta.title
  );

  if (
    currentRoute.path === "/verse/scene" ||
    currentRoute.path === "/meta/scene"
  ) {
    fullRouter.value = currentRoute.fullPath;
    currentQuery.value = currentRoute.query;
  }

  // 判断是否是进入 script 模块
  if (
    currentRoute.path === "/verse/script" ||
    currentRoute.path === "/meta/script"
  ) {
    // 创建 sceneBreadcrumb 对象，并携带原有的路由参数
    const sceneBreadcrumb = {
      path: fullRouter.value,
      meta: { title: "project.sceneEditor" },
      enterCallbacks: currentQuery.value,
    } as RouteLocationMatched;

    // 查找 /verse/scene 在 matched 中的位置
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
  const { redirect, path, enterCallbacks } = item;

  if (redirect) {
    router.push({ path: redirect, query: enterCallbacks }).catch((err) => {
      console.warn(err);
    });
    return;
  }

  router.push({ path: path, query: enterCallbacks }).catch((err) => {
    console.warn(err);
  });
}

watch(
  () => currentRoute.path,
  (path) => {
    if (path.startsWith("/redirect/")) {
      return;
    }
    getBreadcrumb();
  }
);

onBeforeMount(() => {
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
