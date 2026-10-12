import { describe, it, expect } from "vitest";
import type { RouteRecordRaw, RouteLocationNormalizedLoaded } from "vue-router";
import { resourceRoutes } from "@/router/modules/resource";
import { getPageTransitionKey } from "@/router/pageTransitionKey";
const flatten = (route: RouteRecordRaw): RouteRecordRaw[] => [
  route,
  ...(route.children ?? []).flatMap(flatten),
];
describe("upload intent route consumption", () => {
  it.each(["picture", "video", "audio", "particle", "voxel", "polygen"])(
    "keeps the %s upload dialog mounted while consuming intent",
    (type) => {
      const path = `/resource/${type}/index`;
      const record = flatten(resourceRoutes).find(
        (route) => route.path === path
      )!;
      const before = {
        path,
        meta: record.meta,
        params: {},
        hash: "",
        query: {
          lang: "zh-CN",
          webmcpUpload: "1",
          webmcpUploadId: "receipt-id",
        },
      } as unknown as RouteLocationNormalizedLoaded;
      const after = {
        ...before,
        query: { lang: "zh-CN" },
      } as RouteLocationNormalizedLoaded;
      expect(getPageTransitionKey(before)).toBe(getPageTransitionKey(after));
    }
  );
});
