/**
 * Tests for src/views/settings/email.vue
 * Email verification page with TransitionWrapper and EmailVerificationPanel.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

vi.mock("@/components/TransitionWrapper.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "TransitionWrapper",
      template: "<div class='tw-stub'><slot /></div>",
    }),
  };
});

vi.mock("@/components/Account/EmailVerificationPanel.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "EmailVerificationPanel",
      template: "<div class='email-panel-stub'></div>",
    }),
  };
});

const ElCardStub = defineComponent({
  name: "ElCard",
  template: "<div class='el-card'><slot /><slot name='header' /></div>",
});
const ElRowStub = defineComponent({
  name: "ElRow",
  template: "<div class='el-row'><slot /></div>",
});
const ElColStub = defineComponent({
  name: "ElCol",
  props: ["xs", "sm", "md", "lg", "xl", "align"],
  template: "<div class='el-col'><slot /></div>",
});
const ElDividerStub = defineComponent({
  name: "ElDivider",
  template: "<hr class='el-divider' />",
});
const ElButtonStub = defineComponent({
  name: "ElButton",
  props: ["size"],
  template: "<button class='el-button'><slot /></button>",
});
const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: ["to"],
  template: "<a class='router-link-stub'><slot /></a>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: EmailView } = await import("@/views/settings/email.vue");
  const el = document.createElement("div");
  const app = createApp(EmailView as Parameters<typeof createApp>[0]);
  app.component("ElCard", ElCardStub);
  app.component("ElRow", ElRowStub);
  app.component("ElCol", ElColStub);
  app.component("ElDivider", ElDividerStub);
  app.component("ElButton", ElButtonStub);
  app.component("RouterLink", RouterLinkStub);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/settings/email.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders TransitionWrapper stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".tw-stub")).not.toBeNull();
  });

  it("renders el-card", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-card")).not.toBeNull();
  });

  it("renders EmailVerificationPanel stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".email-panel-stub")).not.toBeNull();
  });

  it("renders back button link", async () => {
    const { el } = await mount();
    expect(el.querySelector(".router-link-stub")).not.toBeNull();
  });

  it("renders i18n key for email verification heading", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("homepage.edit.emailVerification");
  });
});
