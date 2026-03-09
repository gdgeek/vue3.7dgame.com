import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

vi.mock("@/components/MrPP/MrPPVerse/InfoContent.vue", () => ({
  default: defineComponent({
    name: "InfoContent",
    template: "<div class='info-content-stub'></div>",
  }),
}));

vi.mock("@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue", () => ({
  default: defineComponent({
    name: "VerseToolbar",
    emits: ["changed", "deleted"],
    template:
      "<div class='verse-toolbar-stub'><button class='toolbar-changed' @click=\"$emit('changed')\">changed</button><button class='toolbar-deleted' @click=\"$emit('deleted')\">deleted</button></div>",
  }),
}));

vi.mock("@/components/MrPP/MrPPVerse/VerseDetail.vue", () => ({
  default: defineComponent({
    name: "VerseDetail",
    emits: ["changed", "deleted"],
    template:
      "<div class='verse-detail-stub'><button class='detail-changed' @click=\"$emit('changed')\">changed</button><button class='detail-deleted' @click=\"$emit('deleted')\">deleted</button></div>",
  }),
}));

vi.mock("@/components/MrPP/MrPPCard/index.vue", () => ({
  default: defineComponent({
    name: "MrPPCard",
    template:
      "<div class='mrpp-card-stub'><slot></slot><slot name='enter'></slot></div>",
  }),
}));

const ElDialogStub = defineComponent({
  name: "ElDialog",
  props: ["modelValue", "title"],
  template: "<div class='el-dialog-stub' v-if='modelValue'><slot /></div>",
});

const ElButtonGroupStub = defineComponent({
  name: "ElButtonGroup",
  template: "<div class='el-button-group-stub'><slot /></div>",
});

const ElButtonStub = defineComponent({
  name: "ElButton",
  emits: ["click"],
  template:
    "<button class='open-detail-btn' @click='$emit(\"click\")'><slot /></button>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

async function mount(props: Record<string, unknown> = {}) {
  const Comp = (await import("@/components/VerseCard.vue")).default;
  const el = document.createElement("div");
  const app = createApp(Comp as Parameters<typeof createApp>[0], {
    item: {
      id: 42,
      title: "Demo Verse",
    },
    ...props,
  });
  app.component("ElDialog", ElDialogStub);
  app.component("ElButtonGroup", ElButtonGroupStub);
  app.component("ElButton", ElButtonStub);
  app.config.globalProperties.$t = (key: string) => key;
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("components/VerseCard.vue", () => {
  it("mounts and renders base card content", async () => {
    const { el } = await mount();
    expect(el.querySelector(".mrpp-card-stub")).not.toBeNull();
    expect(el.querySelector(".info-content-stub")).not.toBeNull();
  });

  it("renders open button with translated text", async () => {
    const { el } = await mount();
    expect(el.querySelector(".open-detail-btn")?.textContent).toContain(
      "common.open"
    );
  });

  it("opens detail dialog when open button is clicked", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-dialog-stub")).toBeNull();

    (el.querySelector(".open-detail-btn") as HTMLButtonElement).click();
    await nextTick();

    expect(el.querySelector(".el-dialog-stub")).not.toBeNull();
    expect(el.querySelector(".verse-detail-stub")).not.toBeNull();
  });

  it("emits changed when toolbar emits changed", async () => {
    const onChanged = vi.fn();
    const { el } = await mount({ onChanged });

    (el.querySelector(".toolbar-changed") as HTMLButtonElement).click();
    await nextTick();

    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("emits deleted when toolbar emits deleted", async () => {
    const onDeleted = vi.fn();
    const { el } = await mount({ onDeleted });

    (el.querySelector(".toolbar-deleted") as HTMLButtonElement).click();
    await nextTick();

    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("detail deleted closes dialog and emits deleted", async () => {
    const onDeleted = vi.fn();
    const { el } = await mount({ onDeleted });

    (el.querySelector(".open-detail-btn") as HTMLButtonElement).click();
    await nextTick();
    expect(el.querySelector(".el-dialog-stub")).not.toBeNull();

    (el.querySelector(".detail-deleted") as HTMLButtonElement).click();
    await nextTick();

    expect(onDeleted).toHaveBeenCalled();
    expect(el.querySelector(".el-dialog-stub")).toBeNull();
  });
});
