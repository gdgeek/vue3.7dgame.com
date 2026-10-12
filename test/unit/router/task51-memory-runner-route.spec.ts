// @vitest-environment-options {"url":"https://d.xrugc.com/"}
import { describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalized } from "vue-router";

import {
  createTask51MemoryRunnerBeforeEnter,
  getTask51PrimaryRole,
  isPermanentlyHiddenRoute,
  isWarmTask51Navigation,
  shouldRegisterTask51MemoryRunnerRoute,
  TASK51_MEMORY_RUNNER_ORIGIN,
  TASK51_MEMORY_RUNNER_PATH,
  TASK51_MEMORY_RUNNER_ROUTE_NAME,
  task51MemoryRunnerRoute,
} from "@/router";

const locationWithMatchedCount = (count: number) =>
  ({ matched: Array.from({ length: count }, () => ({})) }) as Pick<
    RouteLocationNormalized,
    "matched"
  >;

describe("Task 5.1 memory runner route", () => {
  it("registers only for the exact Production origin", () => {
    expect(
      shouldRegisterTask51MemoryRunnerRoute(true, TASK51_MEMORY_RUNNER_ORIGIN)
    ).toBe(true);

    for (const [isProduction, origin] of [
      [false, TASK51_MEMORY_RUNNER_ORIGIN],
      [true, "http://d.xrugc.com"],
      [true, "https://d.xrugc.com:443"],
      [true, "https://sub.d.xrugc.com"],
      [true, "https://xrugc.com"],
    ] as const) {
      expect(shouldRegisterTask51MemoryRunnerRoute(isProduction, origin)).toBe(
        false
      );
    }
  });

  it("is permanently hidden, unlinked, private, and root-only", () => {
    expect(task51MemoryRunnerRoute).toMatchObject({
      path: TASK51_MEMORY_RUNNER_PATH,
      name: TASK51_MEMORY_RUNNER_ROUTE_NAME,
      meta: {
        hidden: true,
        private: true,
        roles: ["root"],
      },
    });
    expect(task51MemoryRunnerRoute.redirect).toBeUndefined();
    expect(task51MemoryRunnerRoute.children).toBeUndefined();
    expect(isPermanentlyHiddenRoute(task51MemoryRunnerRoute)).toBe(true);
    expect(isPermanentlyHiddenRoute({ name: "Home" })).toBe(false);
  });

  it("rejects cold navigation before loading operator identity", async () => {
    const loadFreshRoles = vi.fn().mockResolvedValue(["root"]);
    const guard = createTask51MemoryRunnerBeforeEnter({
      origin: () => TASK51_MEMORY_RUNNER_ORIGIN,
      loadFreshRoles,
    });

    await expect(
      guard(
        {} as RouteLocationNormalized,
        locationWithMatchedCount(0) as RouteLocationNormalized
      )
    ).resolves.toBe("/404");
    expect(loadFreshRoles).not.toHaveBeenCalled();
  });

  it("fails closed on the wrong origin", async () => {
    const loadFreshRoles = vi.fn().mockResolvedValue(["root"]);
    const guard = createTask51MemoryRunnerBeforeEnter({
      origin: () => "https://xrugc.com",
      loadFreshRoles,
    });

    await expect(
      guard(
        {} as RouteLocationNormalized,
        locationWithMatchedCount(1) as RouteLocationNormalized
      )
    ).resolves.toBe("/404");
    expect(loadFreshRoles).not.toHaveBeenCalled();
  });

  it("always reloads operator roles and admits only primary root", async () => {
    for (const [roles, expected] of [
      [["user"], "/401"],
      [["manager"], "/401"],
      [["admin"], "/401"],
      [["user", "root"], true],
    ] as const) {
      const loadFreshRoles = vi.fn().mockResolvedValue(roles);
      const guard = createTask51MemoryRunnerBeforeEnter({
        origin: () => TASK51_MEMORY_RUNNER_ORIGIN,
        loadFreshRoles,
      });

      await expect(
        guard(
          {} as RouteLocationNormalized,
          locationWithMatchedCount(1) as RouteLocationNormalized
        )
      ).resolves.toBe(expected);
      expect(loadFreshRoles).toHaveBeenCalledOnce();
    }
  });

  it("fails closed when the fresh operator lookup fails", async () => {
    const guard = createTask51MemoryRunnerBeforeEnter({
      origin: () => TASK51_MEMORY_RUNNER_ORIGIN,
      loadFreshRoles: vi.fn().mockRejectedValue(new Error("unavailable")),
    });

    await expect(
      guard(
        {} as RouteLocationNormalized,
        locationWithMatchedCount(1) as RouteLocationNormalized
      )
    ).resolves.toBe("/401");
  });

  it("uses the existing root > admin > manager > user role order", () => {
    expect(getTask51PrimaryRole(["user", "root"])).toBe("root");
    expect(getTask51PrimaryRole(["user", "admin"])).toBe("admin");
    expect(getTask51PrimaryRole(["user", "manager"])).toBe("manager");
    expect(getTask51PrimaryRole(["user"])).toBe("user");
    expect(getTask51PrimaryRole([])).toBeNull();
    expect(isWarmTask51Navigation(locationWithMatchedCount(1))).toBe(true);
    expect(isWarmTask51Navigation(locationWithMatchedCount(0))).toBe(false);
  });

  it("keeps the real Production route hidden and rejects a cold deep-link", async () => {
    vi.stubEnv("PROD", true);
    vi.stubGlobal("scrollTo", vi.fn());
    vi.resetModules();

    try {
      const productionRouterModule = await import("@/router");
      const findRegisteredRoute = () =>
        productionRouterModule.constantRoutes
          .find((route) => route.path === "/")
          ?.children?.find(
            (route) =>
              route.name ===
              productionRouterModule.TASK51_MEMORY_RUNNER_ROUTE_NAME
          );

      expect(window.location.origin).toBe(
        productionRouterModule.TASK51_MEMORY_RUNNER_ORIGIN
      );
      expect(findRegisteredRoute()).toMatchObject({
        path: productionRouterModule.TASK51_MEMORY_RUNNER_PATH,
        name: productionRouterModule.TASK51_MEMORY_RUNNER_ROUTE_NAME,
        meta: { hidden: true, private: true, roles: ["root"] },
      });

      const productionRouter = productionRouterModule.useRouter();
      const initialResolution = productionRouter.resolve(
        productionRouterModule.TASK51_MEMORY_RUNNER_PATH
      );
      expect(initialResolution.name).toBe(
        productionRouterModule.TASK51_MEMORY_RUNNER_ROUTE_NAME
      );
      expect(initialResolution.matched.at(-1)?.meta.hidden).toBe(true);

      const ability = { can: vi.fn(() => true) };
      await productionRouterModule.UpdateRoutes(
        ability as Parameters<typeof productionRouterModule.UpdateRoutes>[0]
      );

      expect(findRegisteredRoute()?.meta?.hidden).toBe(true);
      expect(
        productionRouterModule.routerData.value.find(
          (route) =>
            route.name ===
            productionRouterModule.TASK51_MEMORY_RUNNER_ROUTE_NAME
        )?.meta?.hidden
      ).toBe(true);
      expect(
        productionRouter.resolve(
          productionRouterModule.TASK51_MEMORY_RUNNER_PATH
        ).name
      ).toBe(productionRouterModule.TASK51_MEMORY_RUNNER_ROUTE_NAME);

      await productionRouter.push(
        productionRouterModule.TASK51_MEMORY_RUNNER_PATH
      );
      expect(productionRouter.currentRoute.value.path).toBe("/404");
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
