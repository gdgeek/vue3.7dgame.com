import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const ElCardStub = defineComponent({
  name: "ElCard",
  template: "<section class='el-card-stub'><slot name='header' /><slot /></section>",
});

const ElButtonStub = defineComponent({
  name: "ElButton",
  props: ["type", "size"],
  template: "<button class='el-button-stub'><slot /></button>",
});

const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: ["icon"],
  template: "<i class='fa-icon-stub' :data-icon='icon'></i>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: OpenPanel } = await import(
    "@/components/MrPP/MrPPVerse/Open.vue"
  );
  const el = document.createElement("div");
  const app = createApp(OpenPanel as Parameters<typeof createApp>[0]);
  app.component("ElCard", ElCardStub);
  app.component("ElButton", ElButtonStub);
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("components/MrPP/MrPPVerse/Open.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders two card sections", async () => {
    const { el } = await mount();
    expect(el.querySelectorAll(".el-card-stub").length).toBe(2);
  });

  it("renders header texts", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("开放场景给项目（管理员专用）");
    expect(el.textContent).toContain("生成共享码（24小时）");
  });

  it("shows open label and does not render close label", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("verse.view.verseOpen");
    expect(el.textContent).not.toContain("verse.view.verseClose");
  });

  it("renders two buttons and icon markers", async () => {
    const { el } = await mount();
    expect(el.querySelectorAll(".el-button-stub").length).toBe(2);
    expect(el.querySelectorAll(".fa-icon-stub").length).toBe(2);
    expect(el.querySelector(".fa-icon-stub[data-icon='eye']")).not.toBeNull();
    expect(el.querySelector(".fa-icon-stub[data-icon='eye-slash']")).not.toBeNull();
  });
});
