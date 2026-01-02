/**
 * 资源管理路由模块
 * 包含：Voxel、Polygen、Picture、Video、Audio、Particle 等资源管理
 */
import type { RouteRecordRaw } from "vue-router";

const Empty = () => import("@/layout/empty/index.vue");

export const resourceRoutes: RouteRecordRaw = {
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
    // Voxel 管理
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

    // Polygen 管理
    {
      path: "/resource/polygen/index",
      name: "PolygenIndex",
      component: () => import("@/views/polygen/index.vue"),
      meta: {
        title: "resourceManagement.polygenManagement.title",
        icon: "el-icon-pear",
        hidden: true,
        alwaysShow: false,
        params: null,
      },
    },
    {
      path: "/resource/polygen/view",
      name: "",
      component: () => import("@/views/polygen/view.vue"),
      meta: {
        title: "resourceManagement.polygenManagement.polygenProcessing",
        icon: "el-icon-uploadFilled",
        hidden: true,
        private: true,
        alwaysShow: false,
        params: null,
      },
    },

    // Picture 管理
    {
      path: "/resource/picture/index",
      name: "",
      component: () => import("@/views/picture/index.vue"),
      meta: {
        title: "resourceManagement.pictureManagement.title",
        icon: "el-icon-picture",
        hidden: true,
        alwaysShow: false,
        params: null,
      },
    },
    {
      path: "/resource/picture/view",
      name: "",
      component: () => import("@/views/picture/view.vue"),
      meta: {
        title: "resourceManagement.pictureManagement.pictureProcessing",
        icon: "el-icon-uploadFilled",
        hidden: true,
        private: true,
        alwaysShow: false,
        params: null,
      },
    },

    // Video 管理
    {
      path: "/resource/video/index",
      name: "VideoIndex",
      component: () => import("@/views/video/index.vue"),
      meta: {
        title: "resourceManagement.videoManagement.title",
        icon: "el-icon-video-camera",
        hidden: true,
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
        private: true,
        alwaysShow: false,
        params: null,
      },
    },

    // Audio 管理
    {
      path: "/resource/audio/index",
      name: "",
      component: () => import("@/views/audio/index.vue"),
      meta: {
        title: "resourceManagement.audioManagement.title",
        icon: "el-icon-headset",
        hidden: true,
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
        private: true,
        alwaysShow: false,
        params: null,
      },
    },

    // Particle 管理
    {
      path: "/resource/particle",
      name: "Particle",
      redirect: "/resource/particle/index",
      component: Empty,
      meta: {
        title: "resourceManagement.particleManagement.title",
        icon: "el-icon-SetUp",
        hidden: true,
        private: true,
        alwaysShow: false,
        params: null,
      },
      children: [
        {
          path: "/resource/particle/index",
          name: "ParticleIndex",
          component: () => import("@/views/particle/index.vue"),
          meta: {
            title: "resourceManagement.particleManagement.particleList",
            icon: "el-icon-list",
            hidden: true,
            alwaysShow: false,
            params: null,
          },
        },
        {
          path: "/resource/particle/view",
          name: "",
          component: () => import("@/views/particle/view.vue"),
          meta: {
            title: "resourceManagement.particleManagement.particleProcessing",
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
};
