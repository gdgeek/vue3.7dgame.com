/**
 * Tests for src/components/CustomUI/RadiantText.vue
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";
import RadiantText from "@/components/CustomUI/RadiantText.vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const app = createApp(RadiantText, props);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

function mountWithSlot(slotText: string, props: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const Parent = defineComponent({
    components: { RadiantText },
    setup() {
      return { p: props };
    },
    template: `<RadiantText v-bind="p"><span class="slot-content">${slotText}</span></RadiantText>`,
  });
  const app = createApp(Parent);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("RadiantText.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders a <p> element", () => {
    const { el } = mount();
    expect(el.querySelector("p")).not.toBeNull();
  });

  it("slot content is rendered in the DOM", () => {
    const { el } = mountWithSlot("glowing text");
    expect(el.querySelector(".slot-content")).not.toBeNull();
    expect(el.querySelector(".slot-content")!.textContent).toBe("glowing text");
  });

  it("fontSize prop sets inline font-size style", () => {
    const { el } = mount({ fontSize: 24 });
    const p = el.querySelector("p") as HTMLElement;
    expect(p.style.fontSize).toBe("24px");
  });

  it("textColor prop sets inline color style", () => {
    const { el } = mount({ textColor: "#ff0000" });
    const p = el.querySelector("p") as HTMLElement;
    expect(p.style.color).toBe("rgb(255, 0, 0)");
  });

  it("radiant-animation class is applied to <p>", () => {
    const { el } = mount();
    const p = el.querySelector("p")!;
    expect(p.className).toContain("radiant-animation");
  });
});
