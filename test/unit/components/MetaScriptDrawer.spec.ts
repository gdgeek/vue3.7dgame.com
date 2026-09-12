import { createApp, defineComponent, h, nextTick, watch } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MetaScriptDrawer from "@/components/MetaScriptDrawer.vue";
import type { ScriptDrawerHandle } from "@/components/script-drawer-types";

const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
const { loads, mounts, unmounts, resolveClose, saveScript, openVersions } =
  vi.hoisted(() => ({
    loads: vi.fn(),
    mounts: vi.fn(),
    unmounts: vi.fn(),
    resolveClose: vi.fn(),
    saveScript: vi.fn(),
    openVersions: vi.fn(),
  }));

vi.mock("@/views/meta/script.vue", async () => {
  loads();
  const { defineComponent, h, onUnmounted, reactive, toRefs } = await import(
    "vue"
  );
  return {
    default: defineComponent({
      props: {
        metaId: Number,
        embedded: Boolean,
        metaData: Object,
      },
      emits: ["close", "saved"],
      setup(props, { expose, emit }) {
        const state = reactive({
          saveable: true,
          editorContentLoading: false,
          isSaving: false,
          hasUnsavedChanges: false,
          activeName: "blockly",
        });
        mounts(props, state, emit);
        onUnmounted(unmounts);
        expose({
          resolveBeforeClose: resolveClose,
          save: saveScript,
          openVersionDialog: openVersions,
          ...toRefs(state),
        });
        return () =>
          h("button", {
            class: "return-to-entity",
            onClick: (event: MouseEvent) => emit("close", event),
          });
      },
    }),
  };
});

const Drawer = defineComponent({
  props: { modelValue: Boolean },
  emits: ["closed"],
  setup(props, { slots, emit }) {
    watch(
      () => props.modelValue,
      (visible, wasVisible) => {
        if (!visible && wasVisible) void nextTick().then(() => emit("closed"));
      }
    );
    return () =>
      props.modelValue
        ? h("section", [
            slots.header?.({ titleId: "script-title", titleClass: "title" }),
            slots.default?.(),
          ])
        : null;
  },
});
const cleanups: Array<() => void> = [];
const createDrawer = () => {
  const closed = vi.fn();
  const saved = vi.fn();
  const metaData = {
    children: { entities: [{ parameters: { uuid: "live" } }] },
  };
  const app = createApp(MetaScriptDrawer, {
    metaId: 102,
    title: "实体标题",
    metaData,
    onClosed: closed,
    onSaved: saved,
  });
  app.component("ElDrawer", Drawer);
  app.component(
    "ElTooltip",
    defineComponent({
      inheritAttrs: false,
      setup:
        (_, { slots }) =>
        () =>
          slots.default?.(),
    })
  );
  app.component(
    "ElButton",
    defineComponent({
      setup:
        (_, { slots, attrs }) =>
        () =>
          h("button", attrs, slots.default?.()),
    })
  );
  app.component(
    "FontAwesomeIcon",
    defineComponent({ setup: () => () => h("span") })
  );
  app.config.globalProperties.$t = (key: string) => key;
  const element = document.createElement("div");
  document.body.append(element);
  const vm = app.mount(element) as unknown as ScriptDrawerHandle;
  cleanups.push(() => {
    app.unmount();
    element.remove();
  });
  return { vm, element, metaData, closed, saved };
};

describe("entity script drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveClose.mockResolvedValue(true);
  });
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  });

  it("loads the entity script lazily and forwards the live entity snapshot", async () => {
    const { vm, element, metaData } = createDrawer();
    expect(loads).not.toHaveBeenCalled();
    expect(mounts).not.toHaveBeenCalled();
    vm.open();
    await flushPromises();

    expect(loads).toHaveBeenCalledOnce();
    expect(mounts).toHaveBeenCalledOnce();
    expect(mounts.mock.calls[0][0]).toMatchObject({
      metaId: 102,
      embedded: true,
    });
    expect(mounts.mock.calls[0][0].metaData).toBe(metaData);
    expect(
      element.querySelector(".meta-script-drawer.editor-script-drawer")
    ).not.toBeNull();
    expect(element.querySelector("h2")?.textContent).toContain(
      "route.meta.scriptEditor · 实体标题"
    );
  });

  it("forwards header actions and the saved receipt without altering the payload", async () => {
    const { vm, element, saved } = createDrawer();
    vm.open();
    await flushPromises();
    element
      .querySelector<HTMLButtonElement>(".script-drawer-action--save")!
      .click();
    element
      .querySelector<HTMLButtonElement>(
        ".script-drawer-action:not(.script-drawer-action--save)"
      )!
      .click();
    expect(saveScript).toHaveBeenCalledOnce();
    expect(openVersions).toHaveBeenCalledOnce();
    const receipt = {
      entityId: 102,
      previousRevision: "previous",
      serverRevision: "saved",
      metaCode: { blockly: "{}", lua: "return 1", js: "return 1" },
    };
    mounts.mock.calls[0][2]("saved", receipt);

    expect(saved).toHaveBeenCalledOnce();
    expect(saved.mock.calls[0][0]).toBe(receipt);
  });

  it("forwards state and close guards while preserving cancelled dirty work", async () => {
    const { vm, closed } = createDrawer();
    vm.open();
    await flushPromises();
    Object.assign(mounts.mock.calls[0][1], {
      hasUnsavedChanges: true,
      activeName: "script",
    });
    expect(vm.getState()).toEqual({
      open: true,
      ready: true,
      dirty: true,
      saving: false,
      tab: "script",
    });
    resolveClose.mockResolvedValue(false);
    await expect(vm.resolveBeforeLeave()).resolves.toBe(false);
    await expect(vm.close()).resolves.toBe(false);
    expect(vm.getState().open).toBe(true);
    expect(closed).not.toHaveBeenCalled();

    resolveClose.mockResolvedValue(true);
    const assertActive = vi.fn();
    const closing = vm.close(assertActive);
    await flushPromises();
    await expect(closing).resolves.toBe(true);
    expect(assertActive).toHaveBeenCalledTimes(2);
    expect(closed).toHaveBeenCalledOnce();
    vm.open();
    await flushPromises();
    const navigation = vm.closeAfterNavigation();
    await flushPromises();
    await expect(navigation).resolves.toBe(true);
    expect(mounts).toHaveBeenCalledTimes(2);
    expect(unmounts).toHaveBeenCalledTimes(2);
  });

  it("does not treat an editor close event's MouseEvent as a caller guard", async () => {
    const { vm, element, closed } = createDrawer();
    vm.open();
    await flushPromises();
    element.querySelector<HTMLButtonElement>(".return-to-entity")!.click();
    await flushPromises();

    expect(resolveClose).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
    expect(vm.getState().open).toBe(false);
  });
});
