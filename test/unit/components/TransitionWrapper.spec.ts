import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent, type App } from "vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(Component: unknown): { el: HTMLElement; app: App } {
  const el = document.createElement("div");
  const app = createApp(Component as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

describe("components/TransitionWrapper.vue", () => {
  it("mounts without throwing", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    expect(() => mount(TransitionWrapper)).not.toThrow();
  });

  it("renders a div wrapper", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const { el } = mount(TransitionWrapper);
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders slot content", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const el = document.createElement("div");
    const Wrapper = defineComponent({
      components: { TransitionWrapper },
      template:
        "<TransitionWrapper><span class='slot-content'>hello</span></TransitionWrapper>",
    });
    const app = createApp(Wrapper);
    app.mount(el);
    cleanups.push(() => app.unmount());
    expect(el.querySelector(".slot-content")).not.toBeNull();
    expect(el.querySelector(".slot-content")!.textContent).toBe("hello");
  });

  it("slot content is a child of the wrapper div", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const el = document.createElement("div");
    const Wrapper = defineComponent({
      components: { TransitionWrapper },
      template:
        "<TransitionWrapper><span class='inner'>text</span></TransitionWrapper>",
    });
    const app = createApp(Wrapper);
    app.mount(el);
    cleanups.push(() => app.unmount());
    const inner = el.querySelector(".inner");
    expect(inner).not.toBeNull();
    expect(inner!.parentElement?.tagName).toBe("DIV");
  });

  it("renders without slot and produces empty div", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const { el } = mount(TransitionWrapper);
    // The root div exists even with no slot content
    expect(el.querySelector("div")).not.toBeNull();
  });
});
