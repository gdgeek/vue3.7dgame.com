import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  Transition,
} from "vue";
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  type RouteLocationNormalizedLoaded,
} from "vue-router";
import { getPageTransitionKey } from "@/router/pageTransitionKey";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
});

async function flushNavigation() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe("plugin route navigation lifecycle", () => {
  it("builds stable keys while excluding only configured query keys", () => {
    const route = {
      path: "/plugins/example",
      params: { pluginId: "example" },
      hash: "#overview",
      query: { z: "last", pluginUrl: "/a", a: "first" },
      meta: { preserveComponentOnQueryKeys: ["pluginUrl"] },
    } as unknown as RouteLocationNormalizedLoaded;
    const reorderedRoute = {
      ...route,
      query: { a: "first", pluginUrl: "/b", z: "last" },
    } as RouteLocationNormalizedLoaded;

    expect(getPageTransitionKey(route)).toBe(
      getPageTransitionKey(reorderedRoute)
    );
    expect(
      getPageTransitionKey({
        ...reorderedRoute,
        query: { ...reorderedRoute.query, a: "changed" },
      } as RouteLocationNormalizedLoaded)
    ).not.toBe(getPageTransitionKey(route));
    expect(
      getPageTransitionKey({
        ...reorderedRoute,
        hash: "#details",
      } as RouteLocationNormalizedLoaded)
    ).not.toBe(getPageTransitionKey(route));
  });

  it("preserves or remounts a real RouterView across query history navigation", async () => {
    const stats = { mounted: 0, unmounted: 0 };
    const ProbePage = defineComponent({
      name: "PluginProbePage",
      setup() {
        onMounted(() => {
          stats.mounted += 1;
        });
        onUnmounted(() => {
          stats.unmounted += 1;
        });
        return () => h("div", "plugin");
      },
    });
    const RouteHost = defineComponent({
      name: "RouteHost",
      setup() {
        return () =>
          h(RouterView, null, {
            default: ({ Component, route }) =>
              h(
                Transition,
                {
                  css: false,
                  mode: "out-in",
                  key: getPageTransitionKey(route),
                },
                { default: () => (Component ? h(Component) : undefined) }
              ),
          });
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/plugins/:pluginId?",
          component: ProbePage,
          meta: { preserveComponentOnQueryKeys: ["pluginUrl"] },
        },
      ],
    });

    await router.push({
      path: "/plugins/example",
      query: { pluginUrl: "/a", panel: "wide" },
    });
    await router.isReady();

    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp(RouteHost);
    app.use(router);
    app.mount(el);
    cleanups.push(() => {
      app.unmount();
      el.remove();
    });
    await flushNavigation();
    expect(stats).toEqual({ mounted: 1, unmounted: 0 });

    await router.push({
      path: "/plugins/example",
      query: { pluginUrl: "/b", panel: "wide" },
    });
    await flushNavigation();
    expect(stats).toEqual({ mounted: 1, unmounted: 0 });

    await router.push({
      path: "/plugins/example",
      query: { pluginUrl: "/b", panel: "compact" },
    });
    await flushNavigation();
    expect(stats).toEqual({ mounted: 2, unmounted: 1 });

    async function moveHistory(move: () => void) {
      const navigated = new Promise<void>((resolve) => {
        const removeGuard = router.afterEach(() => {
          removeGuard();
          resolve();
        });
      });
      move();
      await navigated;
      await flushNavigation();
    }

    await moveHistory(() => router.back());
    expect(router.currentRoute.value.query).toEqual({
      pluginUrl: "/b",
      panel: "wide",
    });
    expect(stats).toEqual({ mounted: 3, unmounted: 2 });

    await moveHistory(() => router.back());
    expect(router.currentRoute.value.query).toEqual({
      pluginUrl: "/a",
      panel: "wide",
    });
    expect(stats).toEqual({ mounted: 3, unmounted: 2 });

    await moveHistory(() => router.forward());
    expect(stats).toEqual({ mounted: 3, unmounted: 2 });

    await moveHistory(() => router.forward());
    expect(stats).toEqual({ mounted: 4, unmounted: 3 });
  });
});
