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

describe("useVersePermissions — role-based permission switching", () => {
  it("canManage is true and canViewSceneFilter is false for manager-only role", async () => {
    vi.doMock("@casl/vue", () => ({
      useAbility: () => ({ can: (action: string) => action === "manager" }),
    }));
    vi.resetModules();
    const { useVersePermissions: useVP } = await import(
      "@/views/meta-verse/composables/useVersePermissions"
    );
    const result = mountComposable(() => useVP());
    expect(result.canManage.value).toBe(true);
    expect(result.canViewSceneFilter.value).toBe(false);
    vi.doUnmock("@casl/vue");
    vi.resetModules();
  });

  it("canManage and canViewSceneFilter are both true for admin role", async () => {
    vi.doMock("@casl/vue", () => ({
      useAbility: () => ({ can: (action: string) => action === "admin" }),
    }));
    vi.resetModules();
    const { useVersePermissions: useVP } = await import(
      "@/views/meta-verse/composables/useVersePermissions"
    );
    const result = mountComposable(() => useVP());
    expect(result.canManage.value).toBe(true);
    expect(result.canViewSceneFilter.value).toBe(true);
    vi.doUnmock("@casl/vue");
    vi.resetModules();
  });

  it("canManage and canViewSceneFilter are both true for root role", async () => {
    vi.doMock("@casl/vue", () => ({
      useAbility: () => ({ can: (action: string) => action === "root" }),
    }));
    vi.resetModules();
    const { useVersePermissions: useVP } = await import(
      "@/views/meta-verse/composables/useVersePermissions"
    );
    const result = mountComposable(() => useVP());
    expect(result.canManage.value).toBe(true);
    expect(result.canViewSceneFilter.value).toBe(true);
    vi.doUnmock("@casl/vue");
    vi.resetModules();
  });

  it("canManage and canViewSceneFilter are both false for unprivileged user", async () => {
    vi.doMock("@casl/vue", () => ({
      useAbility: () => ({ can: () => false }),
    }));
    vi.resetModules();
    const { useVersePermissions: useVP } = await import(
      "@/views/meta-verse/composables/useVersePermissions"
    );
    const result = mountComposable(() => useVP());
    expect(result.canManage.value).toBe(false);
    expect(result.canViewSceneFilter.value).toBe(false);
    vi.doUnmock("@casl/vue");
    vi.resetModules();
  });
});
