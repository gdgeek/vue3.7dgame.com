import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { settingsRoutes } from "@/router/modules/home";
import { managerRoutes } from "@/router/modules/manager";
import { resourceRoutes } from "@/router/modules/resource";

const TestView = { template: "<div />" };

function cloneRouteForNavigation(route: RouteRecordRaw): RouteRecordRaw {
  const cloned = {
    ...route,
    component: TestView,
    children: route.children?.map(cloneRouteForNavigation),
  } as RouteRecordRaw;
  delete (cloned as { components?: unknown }).components;
  return cloned;
}

function createProductionParentRouter() {
  const productionSettings = cloneRouteForNavigation({
    ...settingsRoutes,
    children: settingsRoutes.children?.filter(
      (child) => child.path !== "/settings/people"
    ),
  });
  const productionManager = cloneRouteForNavigation({
    ...managerRoutes,
    children: managerRoutes.children?.filter(
      (child) => child.path !== "/test/vue-form-demo"
    ),
  });

  return createRouter({
    history: createMemoryHistory(),
    routes: [
      productionSettings,
      productionManager,
      cloneRouteForNavigation(resourceRoutes),
      { path: "/404", component: TestView },
      { path: "/:pathMatch(.*)*", redirect: "/404" },
    ],
  });
}

async function navigateFromFreshBrowser(path: string) {
  const router = createProductionParentRouter();
  await router.push(path);
  await router.isReady();
  return router.currentRoute.value.path;
}

describe("Production parent route direct navigation and refresh", () => {
  it.each([
    ["/settings", "/settings/edit"],
    ["/manager", "/manager/user"],
    ["/resource", "/resource/voxel/index"],
  ])("resolves a fresh navigation to %s through %s", async (path, target) => {
    await expect(navigateFromFreshBrowser(path)).resolves.toBe(target);
  });

  it.each(["/settings/people", "/game", "/game/index"])(
    "keeps unsupported Production route %s out of a fresh route graph",
    async (path) => {
      await expect(navigateFromFreshBrowser(path)).resolves.toBe("/404");
    }
  );

  it("serves fresh extensionless requests through the SPA fallback", () => {
    const nginxConfig = readFileSync(
      resolve(process.cwd(), "nginx.conf.template"),
      "utf8"
    );

    expect(nginxConfig).toContain("try_files $uri /index.html");
    expect(nginxConfig).not.toContain("try_files $uri $uri/ /index.html");
  });
});
