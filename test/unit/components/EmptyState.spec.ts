/**
 * Tests for src/components/StandardPage/EmptyState.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, nextTick, createApp, type App } from "vue";

// Stub font-awesome-icon
const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: { icon: { type: [Array, String], default: () => [] } },
  template: '<span class="fa-stub"></span>',
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

async function mountEmptyState(
  props: Record<string, unknown> = {}
): Promise<{ el: HTMLElement; app: App }> {
  const { default: EmptyState } = await import(
    "@/components/StandardPage/EmptyState.vue"
  );
  const el = document.createElement("div");
  const app = createApp(EmptyState, props);
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

describe("EmptyState", () => {
  it("mounts without throwing", async () => {
    await expect(mountEmptyState()).resolves.not.toThrow();
  });

  it("renders .empty-state container", async () => {
    const { el } = await mountEmptyState();
    expect(el.querySelector(".empty-state")).not.toBeNull();
  });

  it("renders .empty-icon", async () => {
    const { el } = await mountEmptyState();
    expect(el.querySelector(".empty-icon")).not.toBeNull();
  });

  it("renders fa-stub (FontAwesomeIcon)", async () => {
    const { el } = await mountEmptyState();
    expect(el.querySelector(".fa-stub")).not.toBeNull();
  });

  it("renders default text '暂无数据'", async () => {
    const { el } = await mountEmptyState();
    expect(el.querySelector(".empty-text")!.textContent).toBe("暂无数据");
  });

  it("renders custom text when text prop is set", async () => {
    const { el } = await mountEmptyState({ text: "没有内容" });
    expect(el.querySelector(".empty-text")!.textContent).toBe("没有内容");
  });

  it("does NOT render action button when actionText is empty", async () => {
    const { el } = await mountEmptyState({ actionText: "" });
    expect(el.querySelector(".empty-action")).toBeNull();
  });

  it("renders action button when actionText is provided", async () => {
    const { el } = await mountEmptyState({ actionText: "Add Item" });
    expect(el.querySelector(".empty-action")).not.toBeNull();
    expect(el.querySelector(".empty-action")!.textContent).toContain(
      "Add Item"
    );
  });

  it("emits 'action' event when button is clicked", async () => {
    const { default: EmptyState } = await import(
      "@/components/StandardPage/EmptyState.vue"
    );
    const el = document.createElement("div");
    const onAction = vi.fn();
    const app = createApp(EmptyState, { actionText: "Click Me", onAction });
    app.component("FontAwesomeIcon", FontAwesomeIconStub);
    app.mount(el);
    cleanups.push(() => app.unmount());

    const btn = el.querySelector(".empty-action") as HTMLButtonElement;
    btn.click();
    await nextTick();
    expect(onAction).toHaveBeenCalled();
  });
});
