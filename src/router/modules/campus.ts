/**
 * 校园管理路由模块
 */
import type { RouteRecordRaw } from "vue-router";

const SimpleStructure = () => import("@/layout/structure/simple.vue");

export const campusRoutes: RouteRecordRaw = {
  path: "/campus",
  component: SimpleStructure,
  redirect: "/campus/school",
  name: "Campus",
  meta: {
    title: "campus.title",
    icon: "el-icon-School",
    hidden: false,
    alwaysShow: true,
    params: null,
  },
  children: [
    {
      path: "/campus/school",
      component: () => import("@/views/campus/school.vue"),
      name: "CampusSchool",
      meta: {
        title: "campus.schoolManagement",
        icon: "el-icon-OfficeBuilding",
        hidden: false,
      },
    },
    {
      path: "/campus/teacher",
      component: () => import("@/views/campus/teacher.vue"),
      name: "CampusTeacher",
      meta: {
        title: "campus.teacher",
        icon: "el-icon-UserFilled",
        hidden: false,
      },
    },
    {
      path: "/campus/student",
      component: () => import("@/views/campus/student.vue"),
      name: "CampusStudent",
      meta: {
        title: "campus.student",
        icon: "el-icon-User",
        hidden: false,
      },
    },
    {
      path: "/campus/group",
      component: () => import("@/views/campus/group.vue"),
      name: "CampusGroup",
      meta: {
        title: "personalCenter.campus.groupList",
        icon: "el-icon-User",
        hidden: true,
      },
    },
    {
      path: "/campus/class",
      component: () => import("@/views/campus/class.vue"),
      name: "CampusClass",
      meta: {
        title: "campus.classDetail",
        icon: "el-icon-Collection",
        hidden: true,
      },
    },
  ],
};
