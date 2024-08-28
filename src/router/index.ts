import type { App } from "vue";
import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  RouteRecordRaw,
} from "vue-router";

import { useI18n } from "vue-i18n";

export const Layout = () => import("@/layout/index.vue");

import Structure from "@/layout/structure/index.vue";
import Empty from "@/layout/empty/index.vue";
import { Meta, RouteVO } from "@/api/menu/model";
import { useUserStore } from "@/store/modules/user";
import { createPinia, setActivePinia } from "pinia";

const pinia = createPinia();
setActivePinia(pinia);
const userStore = useUserStore();

// 静态路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect/index.vue"),
      },
    ],
  },

  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },

  {
    path: "/",
    name: "/",
    component: Layout,
    redirect: "/home/index",
    children: [
      {
        path: "home",
        component: Structure,
        // 用于 keep-alive 功能，需要与 SFC 中自动推导或显式声明的组件名称一致
        // 参考文档: https://cn.vuejs.org/guide/built-ins/keep-alive.html#include-exclude
        name: "Home",
        redirect: "/home/index",
        meta: {
          title: "personalCenter.title",
          icon: "homepage",
          affix: true,
          keepAlive: true,
        },
        children: [
          {
            meta: { title: "personalCenter.myHomepage" },
            path: "index",
            name: "HomeIndex",
            component: () => import("@/views/home/index.vue"),
          },
          {
            meta: { title: "personalCenter.document" },
            path: "/home/document",
            name: "HomeDocument",
            component: () => import("@/views/home/document.vue"),
          },
          {
            meta: { title: "personalCenter.category" },
            path: "/home/category",
            name: "HomeCategory",
            component: () => import("@/views/home/category.vue"),
          },
          // {
          //   meta: { title: "支付中心" },
          //   path: "pay",
          //   name: "SettingsPay",
          //   component: () => import("@/views/settings/pay.vue"),
          // },
          {
            meta: { title: "personalCenter.processOfCreation" },
            path: "/home/creator",
            name: "SettingsCreator",
            component: () => import("@/views/home/creator.vue"),
          },
        ],
      },

      {
        path: "settings",
        name: "Settings",
        meta: { title: "settings.title" },
        redirect: "/settings/account",
        component: Empty,
        children: [
          {
            path: "account",
            name: "SettingsAccount",
            meta: { title: "settings.accountSetting" },
            component: () => import("@/views/settings/account.vue"),
          },
          {
            meta: { title: "settings.personalData" },
            path: "edit",
            name: "SettingsEdit",
            component: () => import("@/views/settings/edit.vue"),
          },
          {
            meta: { title: "settings.userPresentation" },
            path: "people",
            name: "SettingsPeople",
            component: () => import("@/views/settings/people.vue"),
          },
        ],
      },

      {
        path: "resource",
        component: null,
        redirect: "/resource/voxel",
        name: "/resource",
        meta: {
          title: "resourceManagement.title",
          icon: "system",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "voxel",
            name: "",
            component: Empty,
            redirect: "index",
            meta: {
              title: "resourceManagement.voxelManagement.title",
              icon: "",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "",
                component: () => import("@/views/voxel/index.vue"),
                meta: {
                  title: "resourceManagement.voxelManagement.voxelList",
                  icon: "el-icon-list",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "upload",
                name: "VoxelUpload",
                component: () => import("@/views/voxel/upload.vue"),
                meta: {
                  title: "resourceManagement.voxelManagement.voxelUpload",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "view",
                name: "VoxelView",
                component: () => import("@/views/voxel/view.vue"),
                meta: {
                  title: "resourceManagement.voxelManagement.voxelProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "polygen",
            name: "Polygen",
            redirect: "/resource/polygen/index",
            component: Empty,
            meta: {
              title: "resourceManagement.polygenManagement.title",
              icon: "system",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "PolygenIndex",
                component: () => import("@/views/polygen/index.vue"),
                meta: {
                  title: "resourceManagement.polygenManagement.polygenList",
                  icon: "el-icon-list",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "upload",
                name: "",
                component: () => import("@/views/polygen/upload.vue"),
                meta: {
                  title: "resourceManagement.polygenManagement.polygenUpload",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "view",
                name: "",
                component: () => import("@/views/polygen/view.vue"),
                meta: {
                  title:
                    "resourceManagement.polygenManagement.polygenProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "picture",
            name: "",
            component: Empty,
            redirect: "/resource/picture/index",
            meta: {
              title: "resourceManagement.pictureManagement.title",
              icon: "el-icon-picture",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "",
                component: () => import("@/views/picture/index.vue"),
                meta: {
                  title: "resourceManagement.pictureManagement.pictureList",
                  icon: "el-icon-list",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "upload",
                name: "",
                component: () => import("@/views/picture/upload.vue"),
                meta: {
                  title: "resourceManagement.pictureManagement.pictureUpload",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "view",
                name: "",
                component: () => import("@/views/picture/view.vue"),
                meta: {
                  title:
                    "resourceManagement.pictureManagement.pictureProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "video",
            name: "Video",
            redirect: "/resource/video/index",
            component: Empty,
            meta: {
              title: "resourceManagement.videoManagement.title",
              icon: "el-icon-video-camera",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "VideoIndex",
                component: () => import("@/views/video/index.vue"),
                meta: {
                  title: "resourceManagement.videoManagement.videoList",
                  icon: "el-icon-list",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "upload",
                name: "",
                component: () => import("@/views/video/upload.vue"),
                meta: {
                  title: "resourceManagement.videoManagement.videoUpload",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "view",
                name: "",
                component: () => import("@/views/video/view.vue"),
                meta: {
                  title: "resourceManagement.videoManagement.videoProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "audio",
            name: "Audio",
            component: Empty,

            redirect: "/resource/audio/index",
            meta: {
              title: "resourceManagement.audioManagement.title",
              icon: "el-icon-headset",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "",
                component: () => import("@/views/audio/index.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioList",
                  icon: "el-icon-list",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "upload",
                name: "",
                component: () => import("@/views/audio/upload.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioUpload",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
              {
                path: "view",
                name: "",
                component: () => import("@/views/audio/view.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
        ],
      },
      {
        path: "meta",
        component: null,
        redirect: "/meta/list",
        name: "/system",
        meta: {
          title: "meta.title",
          icon: "el-icon-StarFilled",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "list",
            component: () => import("@/views/meta/list.vue"),
            name: "List",
            meta: {
              title: "meta.metaList",
              icon: "cascader",
              hidden: false,
              keepAlive: true,
              alwaysShow: false,
              params: null,
            },
          },
          {
            path: "prefabs",
            component: () => import("@/views/meta/prefabs.vue"),
            name: "Role",
            meta: {
              title: "meta.systemDefault",
              icon: "",
              hidden: false,
              keepAlive: true,
              alwaysShow: false,
              params: null,
            },
          },
          {
            path: "prefab-edit",
            name: "PrefabEdit",
            meta: { title: "meta.edit" },
            component: () => import("@/views/meta/prefab-edit.vue"),
          },
          {
            path: "meta-edit",
            name: "MetaEdit",
            meta: { title: "meta.edit" },
            component: () => import("@/views/meta/meta-edit.vue"),
          },
          // {
          //   path: "rete-meta",
          //   name: "VerseMetaEditor",
          //   meta: { title: "【元】" },
          //   component: () => import("@/views/meta/rete-meta.vue"),
          // },
          {
            path: "script",
            name: "MetaScript",
            meta: { title: "meta.scriptEditor", keepAlive: true },
            component: () => import("@/views/meta/script.vue"),
          },
          {
            path: "scene",
            name: "MetaSceneEditor",
            meta: { title: "meta.sceneEditor", keepAlive: true },
            component: () => import("@/views/meta/scene.vue"),
          },
        ],
      },

      {
        path: "verse",
        component: null,
        redirect: "/verse/index",
        name: "",
        meta: {
          title: "universe.title",
          icon: "el-icon-sunrise",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "index",
            component: () => import("@/views/meta-verse/index.vue"),
            name: "VerseIndex",
            meta: {
              title: "universe.selfGenerated",
              icon: "cascader",
            },
          },
          {
            path: "open",
            component: () => import("@/views/meta-verse/open.vue"),
            name: "VerseOpen",
            meta: {
              title: "universe.systemRecommendation",
              icon: "cascader",
            },
          },
          {
            path: "share",
            component: () => import("@/views/meta-verse/share.vue"),
            name: "VerseShare",
            meta: {
              title: "universe.shareWithFriends",
              icon: "cascader",
            },
          },
          {
            path: "view",
            name: "VerseView",
            meta: { title: "universe.viewTitle" },
            component: () => import("@/views/verse/view.vue"),
          },
          {
            path: "script",
            name: "Script",
            meta: { title: "universe.scriptEditor", keepAlive: true },
            component: (): any => import("@/views/verse/script.vue"),
          },
          {
            path: "scene",
            name: "VerseSceneEditor",
            meta: { title: "universe.sceneEditor", keepAlive: true },
            component: () => import("@/views/verse/scene.vue"),
          },
        ],
      },

      {
        path: "manager",
        component: null,
        redirect: "/manager/user",
        name: "",
        meta: {
          title: "manager.title",
          icon: "el-icon-Management",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "user",
            component: () => import("@/views/manager/user.vue"),
            name: "ManagerUser",
            meta: {
              title: "manager.userManagement",
              icon: "cascader",
            },
          },
        ],
      },

      {
        path: "401",
        component: () => import("@/views/error-page/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "404",
        component: () => import("@/views/error-page/404.vue"),
        meta: { hidden: true },
      },
    ],
  },
];

/**
 * 创建路由
 */
const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

/**
 * 重置路由
 */
export function resetRouter() {
  router.replace({ path: "/login" });
}

//await userStore.getUserInfo();

// 指定要移除的路由路径列表
const pathsToRemove = [
  "/home/document",
  "/home/category",
  "/home/creator",
  "settings",
  "view",
  "prefab-edit",
  "meta-edit",
  "rete-meta",
  "script",
  "scene",
];

console.log("roles", userStore.userInfo.roles);
const isRoot = computed(async () => {
  await userStore.getUserInfo();
  return userStore.userInfo.roles.includes("manager");
});

if (!isRoot.value) {
  pathsToRemove.push("manager");
}

// 检查路径是否在移除列表中
const isRemoveRoute = (path: string): boolean => {
  return pathsToRemove.includes(path);
};

// 将路由转换为 RouteVO 格式的函数，只获取根路由 "/" 下的子路由数据，并且子路由路径前添加 "/"
const convertRoutes = (routes: RouteRecordRaw[], isRoot = false): RouteVO[] => {
  return routes
    .filter((route) => !isRemoveRoute(route.path))
    .map((route) => {
      const { path, component, redirect, name, meta, children } = route;

      // 根据是否是根路径来决定是否在路径前添加 `/`
      const formattedPath = isRoot ? `/${path}` : path;

      return {
        path: formattedPath,
        component: component ? (component as any).name : undefined,
        redirect: (redirect as string) || undefined,
        name: typeof name === "string" ? name : undefined,
        meta: meta as Meta,
        children: children ? convertRoutes(children) : [],
      };
    });
};

// 提取 path 为 "/" 及其子路由的部分
const mainRoute = constantRoutes.find((route) => route.path === "/");
export const routerData: RouteVO[] = mainRoute
  ? convertRoutes(mainRoute.children || [], true)
  : [];

export default router;
