import { describe, it, expectTypeOf } from "vitest";
import type { RouteVO, Meta } from "@/api/menu/model";

describe("src/api/menu/model.ts round15", () => {
  it("RouteVO supports optional path/name", () => {
    expectTypeOf<RouteVO>().toMatchTypeOf<{ path?: string; name?: string }>();
  });

  it("RouteVO supports optional component", () => {
    expectTypeOf<RouteVO>().toMatchTypeOf<{ component?: string }>();
  });

  it("RouteVO supports optional redirect", () => {
    expectTypeOf<RouteVO>().toMatchTypeOf<{ redirect?: string }>();
  });

  it("RouteVO supports nested children", () => {
    expectTypeOf<RouteVO>().toMatchTypeOf<{ children?: RouteVO[] }>();
  });

  it("RouteVO supports meta field", () => {
    expectTypeOf<RouteVO>().toMatchTypeOf<{ meta?: Meta }>();
  });

  it("Meta supports hidden/icon/title", () => {
    expectTypeOf<Meta>().toMatchTypeOf<{ hidden?: boolean; icon?: string; title?: string }>();
  });

  it("Meta supports alwaysShow/keepAlive", () => {
    expectTypeOf<Meta>().toMatchTypeOf<{ alwaysShow?: boolean; keepAlive?: boolean }>();
  });

  it("Meta supports roles and params", () => {
    expectTypeOf<Meta>().toMatchTypeOf<{ roles?: string[]; params?: string }>();
  });
});
