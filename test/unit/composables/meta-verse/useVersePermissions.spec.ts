import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";

vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: vi.fn().mockReturnValue(false),
  }),
}));

import { useVersePermissions } from "@/views/meta-verse/composables/useVersePermissions";

function mountComposable<T>(fn: () => T): T {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = fn();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  app.unmount();
  return result;
}

describe("useVersePermissions", () => {
  it("is a function", () => {
    expect(typeof useVersePermissions).toBe("function");
  });

  it("returns canManage and canViewSceneFilter", () => {
    const result = mountComposable(() => useVersePermissions());
    expect("canManage" in result).toBe(true);
    expect("canViewSceneFilter" in result).toBe(true);
  });

  it("canManage is false when ability.can always returns false", () => {
    const result = mountComposable(() => useVersePermissions());
    expect(result.canManage.value).toBe(false);
  });

  it("canViewSceneFilter is false when ability.can always returns false", () => {
    const result = mountComposable(() => useVersePermissions());
    expect(result.canViewSceneFilter.value).toBe(false);
  });
});
