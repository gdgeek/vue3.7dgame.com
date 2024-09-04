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

//import { useUserStore } from "@/store/modules/user";
import { createPinia, setActivePinia } from "pinia";

const pinia = createPinia();
setActivePinia(pinia);
//const userStore = useUserStore();

// 静态路由
const routes: RouteRecordRaw[] = [
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
    meta: { hidden: false },
    component: Layout,
    redirect: "/home/index",
    children: [
      {
        path: "/home",
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
          hidden: false,
        },
        children: [
          {
            meta: {
              title: "personalCenter.myHomepage",
              hidden: false,
            },
            path: "/home/index",
            name: "HomeIndex",
            component: () => import("@/views/home/index.vue"),
          },
          {
            meta: {
              title: "personalCenter.document",
              hidden: false,
            },
            path: "/home/document",
            name: "HomeDocument",
            component: () => import("@/views/home/document.vue"),
          },
          {
            meta: {
              title: "personalCenter.category",
              hidden: false,
            },
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
            meta: { title: "personalCenter.processOfCreation", hidden: false },
            path: "/home/creator",
            name: "SettingsCreator",
            component: () => import("@/views/home/creator.vue"),
          },
        ],
      },

      {
        path: "/settings",
        name: "Settings",
        meta: {
          title: "settings.title",
          hidden: true,
        },
        redirect: "/settings/account",
        component: Empty,
        children: [
          {
            path: "/settings/account",
            name: "SettingsAccount",
            meta: { title: "settings.accountSetting", hidden: true },
            component: () => import("@/views/settings/account.vue"),
          },
          {
            meta: { title: "settings.personalData", hidden: true },
            path: "/settings/edit",
            name: "SettingsEdit",
            component: () => import("@/views/settings/edit.vue"),
          },
          {
            meta: { title: "settings.userPresentation", hidden: true },
            path: "/settings/people",
            name: "SettingsPeople",
            component: () => import("@/views/settings/people.vue"),
          },
        ],
      },

      {
        path: "/resource",
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
            path: "/resource/voxel",
            name: "",
            component: Empty,
            redirect: "/resource/voxel/index",
            meta: {
              title: "resourceManagement.voxelManagement.title",
              icon: "",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "/resource/voxel/index",
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
                path: "/resource/voxel/upload",
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
                path: "/resource/voxel/view",
                name: "VoxelView",
                component: () => import("@/views/voxel/view.vue"),
                meta: {
                  title: "resourceManagement.voxelManagement.voxelProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "/resource/polygen",
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
                path: "/resource/polygen/index",
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
                path: "/resource/polygen/upload",
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
                path: "/resource/polygen/view",
                name: "",
                component: () => import("@/views/polygen/view.vue"),
                meta: {
                  title:
                    "resourceManagement.polygenManagement.polygenProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "/resource/picture",
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
                path: "/resource/picture/index",
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
                path: "/resource/picture/upload",
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
                path: "/resource/picture/view",
                name: "",
                component: () => import("@/views/picture/view.vue"),
                meta: {
                  title:
                    "resourceManagement.pictureManagement.pictureProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "/resource/video",
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
                path: "/resource/video/index",
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
                path: "/resource/video/upload",
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
                path: "/resource/video/view",
                name: "",
                component: () => import("@/views/video/view.vue"),
                meta: {
                  title: "resourceManagement.videoManagement.videoProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "/resource/audio",
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
                path: "/resource/audio/index",
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
                path: "/resource/audio/upload",
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
                path: "/resource/audio/view",
                name: "",
                component: () => import("@/views/audio/view.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
        ],
      },
      {
        path: "/meta",
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
            path: "/meta/list",
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
            path: "/meta/prefabs",
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
            path: "/meta/prefab-edit",
            name: "PrefabEdit",
            meta: {
              title: "meta.edit",
              hidden: true,
            },
            component: () => import("@/views/meta/prefab-edit.vue"),
          },
          {
            path: "/meta/meta-edit",
            name: "MetaEdit",
            meta: {
              title: "meta.edit",
              hidden: true,
            },
            component: () => import("@/views/meta/meta-edit.vue"),
          },
          // {
          //   path: "rete-meta",
          //   name: "VerseMetaEditor",
          //   meta: { title: "【元】" },
          //   component: () => import("@/views/meta/rete-meta.vue"),
          // },
          {
            path: "/meta/script",
            name: "MetaScript",
            meta: {
              title: "meta.scriptEditor",
              keepAlive: true,
              hidden: true,
            },
            component: () => import("@/views/meta/script.vue"),
          },
          {
            path: "/meta/scene",
            name: "MetaSceneEditor",
            meta: {
              title: "meta.sceneEditor",
              keepAlive: true,
              hidden: true,
            },
            component: () => import("@/views/meta/scene.vue"),
          },
        ],
      },

      {
        path: "/verse",
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
            path: "/verse/index",
            component: () => import("@/views/meta-verse/index.vue"),
            name: "VerseIndex",
            meta: {
              title: "universe.selfGenerated",
              icon: "cascader",
              hidden: false,
            },
          },
          {
            path: "/verse/open",
            component: () => import("@/views/meta-verse/open.vue"),
            name: "VerseOpen",
            meta: {
              title: "universe.systemRecommendation",
              icon: "cascader",
              hidden: false,
            },
          },
          {
            path: "/verse/share",
            component: () => import("@/views/meta-verse/share.vue"),
            name: "VerseShare",
            meta: {
              title: "universe.shareWithFriends",
              icon: "cascader",
              hidden: false,
            },
          },
          {
            path: "/verse/view",
            name: "VerseView",
            meta: {
              title: "universe.viewTitle",
              hidden: true,
            },
            component: () => import("@/views/verse/view.vue"),
          },
          {
            path: "/verse/script",
            name: "Script",
            meta: {
              title: "universe.scriptEditor",
              keepAlive: true,
              hidden: true,
            },
            component: (): any => import("@/views/verse/script.vue"),
          },
          {
            path: "/verse/scene",
            name: "VerseSceneEditor",
            meta: {
              title: "universe.sceneEditor",
              keepAlive: true,
              hidden: true,
            },
            component: () => import("@/views/verse/scene.vue"),
          },
        ],
      },
      {
        path: "/manager",
        component: null,
        redirect: "/manager/user",
        name: "Manager",
        meta: {
          title: "manager.title",
          icon: "el-icon-Management",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/manager/user",
            component: () => import("@/views/manager/user.vue"),
            name: "ManagerUser",
            meta: {
              title: "manager.userManagement",
              icon: "cascader",
              hidden: false,
            },
          },
        ],
      },
      {
        path: "/game",
        component: null,
        redirect: "/game/index",
        name: "Game",
        meta: {
          title: "game.title",
          icon: "el-icon-monitor",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/game/index",
            component: () => import("@/views/game/index.vue"),
            name: "GameIndex",
            meta: {
              title: "game.gameIndex",
              icon: "cascader",
              hidden: false,
            },
          },
          {
            path: "/game/map",
            component: () => import("@/views/game/map.vue"),
            name: "GameMap",
            meta: {
              title: "game.gameMap",
              icon: "cascader",
              hidden: false,
            },
          },
        ],
      },

      {
        path: "/401",
        component: () => import("@/views/error-page/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "/404",
        component: () => import("@/views/error-page/404.vue"),
        meta: { hidden: true },
      },
    ],
  },
];
export let constantRoutes: RouteRecordRaw[] = routes;
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

// 指定要移除的路由路径列表
const pathsToRemove = ref([
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
]);
import { useAbility } from "@casl/vue";

//const ability = useAbility();

//const can = ability.can.bind(ability);
//alert(can('root','all'))
const checkAndRemovePaths = async () => {
  if (!false) {
    //  pathsToRemove.value.push("manager", "game");
  }
};

// 检查路径是否在移除列表中
const isRemoveRoute = (path: string): boolean => {
  return pathsToRemove.value.includes(path);
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

export const routerData = ref<RouteVO[]>([]);

// 初始化路由
export const initRoutes = async () => {
  await checkAndRemovePaths();

  const mainRoute = constantRoutes.find((route) => route.path === "/");
  if (mainRoute) {
    routerData.value = convertRoutes(mainRoute.children || [], true);
  } else {
    routerData.value = [];
  }
};

import type { AnyAbility } from "@casl/ability";
/*const ability = useAbility();
const can = ability.can.bind(ability);
 */
//initRoutes();

import { AbilityRouter } from "@/utils/ability";
const check = (route: RouteRecordRaw[], ability: AnyAbility) => {
  const can = ability.can.bind(ability);
  route.forEach((route) => {
    // alert(route.path)

    console.error(
      route.path,
      route.path,
      can("open", new AbilityRouter(route.path))
    );

    console.error(route.meta?.hidden);
    if (route.meta && !route.meta.hidden) {
      route.meta.hidden = !can("open", new AbilityRouter(route.path));
    }
    //route.meta.hidden = true//!can("open", new AbilityRouter(route.path))
    //route.meta.hidden = true; //!can("open", new AbilityRouter(route.path))
    if (route.children) {
      check(route.children, ability);
    }
  });
};
export const UpdateRoutes = async (ability: AnyAbility) => {
  constantRoutes = routes;
  const can = ability.can.bind(ability);
  //alert(can("open", new AbilityRouter("game/")))
  check(constantRoutes, ability);

  initRoutes();
  //pathsToRemove.value.push("manager", "game");
};
export const useRouter = () => {
  initRoutes();
  return router;
};
