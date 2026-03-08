/**
 * Tests for src/components/CustomUI/GlowBorder.vue
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";
import GlowBorder from "@/components/CustomUI/GlowBorder.vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const app = createApp(GlowBorder, props);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

function mountWithSlot(slotText: string) {
  const el = document.createElement("div");
  const Parent = defineComponent({
    components: { GlowBorder },
    template: `<GlowBorder><span class="slot-content">${slotText}</span></GlowBorder>`,
  });
  const app = createApp(Parent);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("GlowBorder.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders an outer div with glow-border class", () => {
    const { el } = mount();
    expect(el.querySelector(".glow-border")).not.toBeNull();
  });

  it("slot content is rendered in the DOM", () => {
    const { el } = mountWithSlot("glow content");
    expect(el.querySelector(".slot-content")).not.toBeNull();
    expect(el.querySelector(".slot-content")!.textContent).toBe("glow content");
  });

  it("default borderRadius sets --border-radius CSS var on parent div", () => {
    const { el } = mount({ borderRadius: 10 });
    const div = el.querySelector(".glow-border") as HTMLElement;
    expect(div.style.getPropertyValue("--border-radius")).toBe("10px");
  });

  it("custom borderRadius is reflected in parent style", () => {
    const { el } = mount({ borderRadius: 20 });
    const div = el.querySelector(".glow-border") as HTMLElement;
    expect(div.style.getPropertyValue("--border-radius")).toBe("20px");
  });

  it("color as array is handled without error", () => {
    expect(() => mount({ color: ["#f00", "#0f0", "#00f"] })).not.toThrow();
  });
});
