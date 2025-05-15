import type { App } from "vue";
import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  RouteRecordRaw,
} from "vue-router";

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
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect/index.vue"),
      },
    ],
  },

  {
    path: "/web",
    meta: { hidden: true, private: true },

    component: () => import("@/views/web/index.vue"),
    redirect: "/web/index",
    children: [
      {
        path: "/web/index",
        name: "WebIndex",
        component: () => import("@/views/web/home.vue"),
      },
      {
        path: "/web/bbs",
        name: "WebBBS",
        component: () => import("@/views/web/bbs.vue"),
      },
      {
        path: "/web/category",
        name: "WebCategory",
        component: () => import("@/views/web/category.vue"),
      },
      {
        path: "/web/buy",
        name: "WebBuy",
        component: () => import("@/views/web/buy.vue"),
      },
      {
        path: "/web/document",
        name: "WebDocument",
        component: () => import("@/views/web/document.vue"),
      },
    ],
  },

  {
    path: "/medical",
    component: () => import("@/views/medical/index.vue"),
    redirect: "/medical/index",
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/medical/index",
        name: "MedicalIndex",
        component: () => import("@/views/medical/home.vue"),
      },
      {
        path: "/medical/ar-solutions",
        name: "ARSolutions",
        component: () => import("@/views/medical/components/ARSolutions.vue"),
      },
      {
        path: "/medical/dental-cases",
        name: "DentalCases",
        component: () => import("@/views/medical/components/DentalCases.vue"),
      },
    ],
  },

  {
    path: "/education",
    component: () => import("@/views/education/index.vue"),
    redirect: "/education/index",
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/education/index",
        name: "EducationIndex",
        component: () => import("@/views/education/home.vue"),
      },
      {
        path: "/education/solutions",
        name: "EducationSolutions",
        component: () =>
          import("@/views/education/components/AREducationSolutions.vue"),
      },
      {
        path: "/education/scenes",
        name: "EducationScenes",
        component: () =>
          import("@/views/education/components/AREducationScenes.vue"),
      },
    ],
  },

  {
    path: "/site",
    // component: () => import("@/views/site/index.vue"),
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/site/login",
        redirect: "/web/index",
        // component: () => import("@/views/site/login/index.vue"),
      },
      {
        path: "/site/logout",
        component: () => import("@/views/site/logout/index.vue"),
      },
      {
        path: "/site/register",
        component: () => import("@/views/site/register/index.vue"),
      },
    ],
  },

  { path: "/login", redirect: "/web/index" },

  {
    path: "/privacy-policy",
    component: () => import("@/views/privacy-policy/index.vue"),
    meta: { hidden: true, private: true },
    name: "PrivacyPolicy",
  },
  { path: "/terms", redirect: "/privacy-policy?tab=terms" },
  { path: "/privacy", redirect: "/privacy-policy?tab=privacy" },

  {
    path: "/",
    name: "/",
    meta: { hidden: true },
    redirect: "/home",
    component: Layout,
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
          hidden: true,
        },
        children: [
          {
            meta: {
              title: "personalCenter.myHomepage",
              affix: true,
              keepAlive: true,
              hidden: true,
            },
            path: "/home/index",
            name: "HomeIndex",
            component: () => import("@/views/home/index.vue"),
          },
          {
            meta: {
              title: "personalCenter.document",
              hidden: true,
              private: true,
            },
            path: "/home/document",
            name: "HomeDocument",
            component: () => import("@/views/home/document.vue"),
          },
          {
            meta: {
              title: "personalCenter.category",
              hidden: true,
              private: true,
            },
            path: "/home/category",
            name: "HomeCategory",
            component: () => import("@/views/home/category.vue"),
          },

          {
            meta: {
              title: "personalCenter.processOfCreation",
              hidden: true,
              private: true,
            },
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
          private: true,
        },
        component: Empty,
        children: [
          /*
          {
            path: "/settings/account",
            name: "SettingsAccount",
            meta: {
              title: "settings.accountSetting",
              hidden: true,
              private: true,
            },
            component: () => import("@/views/settings/account.vue"),
          },*/
          {
            meta: {
              title: "settings.personalData",
              hidden: true,
              private: true,
            },
            path: "/settings/edit",
            name: "SettingsEdit",
            component: () => import("@/views/settings/edit.vue"),
          },
          {
            meta: {
              title: "settings.userPresentation",
              hidden: true,
              private: true,
            },
            path: "/settings/people",
            name: "SettingsPeople",
            component: () => import("@/views/settings/people.vue"),
          },
        ],
      },
      {
        path: "/resource",
        component: null,
        name: "/resource",
        meta: {
          title: "resourceManagement.title",
          icon: "system",
          hidden: true,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/resource/voxel",
            name: "Voxel",
            component: Empty,
            redirect: "/resource/voxel/index",
            meta: {
              title: "resourceManagement.voxelManagement.title",
              icon: "",
              hidden: true,
              private: true,
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
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
              // {
              //   path: "/resource/voxel/upload",
              //   name: "VoxelUpload",
              //   component: () => import("@/views/voxel/upload.vue"),
              //   meta: {
              //     title: "resourceManagement.voxelManagement.voxelUpload",
              //     icon: "el-icon-uploadFilled",
              //     hidden: true,
              //     alwaysShow: false,
              //     params: null,
              //   },
              // },
              {
                path: "/resource/voxel/view",
                name: "VoxelView",
                component: () => import("@/views/voxel/view.vue"),
                meta: {
                  title: "resourceManagement.voxelManagement.voxelProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  private: true,
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
              hidden: true,
              // private: true,
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
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
              // {
              //   path: "/resource/polygen/upload",
              //   name: "",
              //   component: () => import("@/views/polygen/upload.vue"),
              //   meta: {
              //     title: "resourceManagement.polygenManagement.polygenUpload",
              //     icon: "el-icon-uploadFilled",
              //     hidden: true,
              //     alwaysShow: false,
              //     params: null,
              //   },
              // },
              {
                path: "/resource/polygen/view",
                name: "",
                component: () => import("@/views/polygen/view.vue"),
                meta: {
                  title:
                    "resourceManagement.polygenManagement.polygenProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  private: true,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "/resource/picture",
            name: "Picture",
            component: Empty,
            redirect: "/resource/picture/index",
            meta: {
              title: "resourceManagement.pictureManagement.title",
              icon: "el-icon-picture",
              hidden: true,
              // private: true,
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
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
              // {
              //   path: "/resource/picture/upload",
              //   name: "",
              //   component: () => import("@/views/picture/upload.vue"),
              //   meta: {
              //     title: "resourceManagement.pictureManagement.pictureUpload",
              //     icon: "el-icon-uploadFilled",
              //     hidden: true,
              //     alwaysShow: false,
              //     params: null,
              //   },
              // },
              {
                path: "/resource/picture/view",
                name: "",
                component: () => import("@/views/picture/view.vue"),
                meta: {
                  title:
                    "resourceManagement.pictureManagement.pictureProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  private: true,
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
              hidden: true,
              private: true,
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
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
              // {
              //   path: "/resource/video/upload",
              //   name: "",
              //   component: () => import("@/views/video/upload.vue"),
              //   meta: {
              //     title: "resourceManagement.videoManagement.videoUpload",
              //     icon: "el-icon-uploadFilled",
              //     hidden: true,
              //     alwaysShow: false,
              //     params: null,
              //   },
              // },
              {
                path: "/resource/video/view",
                name: "",
                component: () => import("@/views/video/view.vue"),
                meta: {
                  title: "resourceManagement.videoManagement.videoProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  private: true,
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
              hidden: true,
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
                  hidden: true,
                  alwaysShow: false,
                  params: null,
                },
              },
              // {
              //   path: "/resource/audio/upload",
              //   name: "",
              //   component: () => import("@/views/audio/upload.vue"),
              //   meta: {
              //     title: "resourceManagement.audioManagement.audioUpload",
              //     icon: "el-icon-uploadFilled",
              //     hidden: true,
              //     alwaysShow: false,
              //     params: null,
              //   },
              // },
              /*
              {
                path: "/resource/audio/tts",
                name: "",
                component: () => import("@/views/audio/tts.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioTTS",
                  icon: "el-icon-helpFilled",
                  hidden: true,
                  private: true,
                  alwaysShow: false,
                  params: null,
                },
              },*/
              {
                path: "/resource/audio/view",
                name: "",
                component: () => import("@/views/audio/view.vue"),
                meta: {
                  title: "resourceManagement.audioManagement.audioProcessing",
                  icon: "el-icon-uploadFilled",
                  hidden: true,
                  private: true,
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
          hidden: true,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/meta/list",
            component: () => import("@/views/meta/list.vue"),
            name: "MetaList",
            meta: {
              title: "meta.metaList",
              icon: "cascader",
              hidden: true,
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
              hidden: true,
              private: true,
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
              private: true,
            },
            component: () => import("@/views/meta/prefab-edit.vue"),
          },
          {
            path: "/meta/meta-edit",
            name: "MetaEdit",
            meta: {
              title: "meta.edit",
              hidden: true,
              private: true,
            },
            component: () => import("@/views/meta/meta-edit.vue"),
          },
          {
            path: "/meta/script",
            name: "MetaScript",
            meta: {
              title: "meta.scriptEditor",
              keepAlive: true,
              hidden: true,
              private: true,
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
              private: true,
            },
            component: () => import("@/views/meta/scene.vue"),
          },
        ],
      },

      {
        path: "/ai",
        component: null,
        name: "AI",
        meta: {
          title: "ai.title",
          icon: "el-icon-opportunity",
          hidden: true,
          private: true,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/ai/list",
            component: () => import("@/views/ai/index.vue"),
            name: "AIList",
            meta: {
              title: "ai.list",
              icon: "cascader",
              hidden: true,
              keepAlive: true,
              alwaysShow: false,
              params: null,
            },
          },
          {
            path: "/ai/generation",
            component: () => import("@/views/ai/generation.vue"),
            name: "AIGeneration",
            meta: {
              title: "ai.generation",
              icon: "cascader",
              hidden: true,
              keepAlive: true,
              alwaysShow: false,
              params: null,
            },
          },
          // {
          //   path: "/ai/view",
          //   component: () => import("@/views/ai/view.vue"),
          //   name: "AIView",
          //   meta: {
          //     title: "ai.view",
          //     icon: "cascader",
          //     hidden: true,
          //     keepAlive: true,
          //     alwaysShow: false,
          //     private: true,
          //     params: null,
          //   },
          // },
        ],
      },

      {
        path: "/verse",
        component: null,
        redirect: "/verse/index",
        name: "Verse",
        meta: {
          title: "project.title",
          icon: "el-icon-sunrise",
          hidden: true,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "/verse/index",
            component: () => import("@/views/meta-verse/index.vue"),
            name: "VerseIndex",
            meta: {
              title: "project.selfGenerated",
              icon: "cascader",
              hidden: true,
            },
          },
          {
            path: "/verse/public",
            component: () => import("@/views/meta-verse/public.vue"),
            name: "VersePublic",
            meta: {
              title: "project.systemRecommendation",
              icon: "cascader",
              hidden: true,
            },
          },

          {
            path: "/verse/view",
            name: "VerseView",
            meta: {
              title: "project.viewTitle",
              hidden: true,
              private: true,
            },
            component: () => import("@/views/verse/view.vue"),
          },
          {
            path: "/verse/script",
            name: "Script",
            meta: {
              title: "project.scriptEditor",
              keepAlive: true,
              hidden: true,
              private: true,
            },
            component: (): any => import("@/views/verse/script.vue"),
          },
          {
            path: "/verse/scene",
            name: "VerseSceneEditor",
            meta: {
              title: "project.sceneEditor",
              keepAlive: true,
              hidden: true,
              private: true,
            },
            component: () => import("@/views/verse/scene.vue"),
          },
        ],
      },
      {
        path: "/manager",
        component: null,
        name: "Manager",
        meta: {
          title: "manager.title",
          icon: "el-icon-Management",
          hidden: true,
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
              hidden: true,
            },
          },
        ],
      },
      {
        path: "/game",
        component: null,
        name: "Game",
        meta: {
          title: "game.title",
          icon: "el-icon-monitor",
          hidden: true,
          private: true,
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
              hidden: true,
            },
          },
          {
            path: "/game/map",
            component: () => import("@/views/game/map.vue"),
            name: "GameMap",
            meta: {
              title: "game.gameMap",
              icon: "cascader",
              hidden: true,
            },
          },
        ],
      },

      {
        path: "/site/logout",
        name: "LogOut",
        component: null,
        redirect: "/logout",
        meta: {
          title: "logout.title",
          icon: "el-icon-back",
          hidden: false,
          private: false,
          alwaysShow: false,
          params: null,
        },
        children: [],
      },
      /**/

      {
        path: "/401",
        component: () => import("@/views/error-page/401.vue"),
        meta: { hidden: true, private: true },
      },
      {
        path: "/404",
        component: () => import("@/views/error-page/404.vue"),
        meta: { hidden: true, private: true },
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

// 将路由转换为 RouteVO 格式的函数，只获取根路由 "/" 下的子路由数据，并且子路由路径前添加 "/"
const convertRoutes = (routes: RouteRecordRaw[], isRoot = false): RouteVO[] => {
  return (
    routes
      // .filter((route) => !isRemoveRoute(route.path))
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
      })
  );
};

export const routerData = ref<RouteVO[]>([]);

// 初始化路由
const initRoutes = async () => {
  const mainRoute = constantRoutes.find((route) => route.path === "/");
  if (mainRoute) {
    routerData.value = convertRoutes(mainRoute.children || [], true);
  } else {
    routerData.value = [];
  }
};

import type { AnyAbility } from "@casl/ability";

import { AbilityRouter } from "@/utils/ability";
import { useUserStore } from "@/store";
import { tr } from "element-plus/es/locale";
const check = (route: RouteRecordRaw[], ability: AnyAbility) => {
  const can = ability.can.bind(ability);
  route.forEach((route) => {
    if (route.meta) {
      route.meta.hidden = !can("open", new AbilityRouter(route.path));
    }
    if (route.children) {
      check(route.children, ability);
    }
  });
};
export const UpdateRoutes = async (ability: AnyAbility) => {
  constantRoutes = JSON.parse(JSON.stringify(routes));
  check(constantRoutes, ability);
  initRoutes();
};
export const useRouter = () => {
  initRoutes();
  return router;
};
