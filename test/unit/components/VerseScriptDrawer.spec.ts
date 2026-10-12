import { createApp, defineComponent, h, nextTick, watch } from "vue";
const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerseScriptDrawer from "@/components/VerseScriptDrawer.vue";

const { resolveClose, mounts, unmounts, saveScript, openVersions } = vi.hoisted(
  () => ({
    resolveClose: vi.fn(),
    mounts: vi.fn(),
    unmounts: vi.fn(),
    saveScript: vi.fn(),
    openVersions: vi.fn(),
  })
);
vi.mock("@/views/verse/script.vue", async () => {
  const { defineComponent, h, onUnmounted, reactive, toRefs } = await import(
    "vue"
  );
  return {
    default: defineComponent({
      props: {
        verseId: Number,
        embedded: Boolean,
        sceneData: Object,
        beforePublish: Function,
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
        mounts(props, state);
        onUnmounted(unmounts);
        expose({
          resolveBeforeClose: resolveClose,
          save: saveScript,
          openVersionDialog: openVersions,
          ...toRefs(state),
        });
        return () =>
          h(
            "button",
            { class: "return-to-scene", onClick: () => emit("close") },
            "Scene"
          );
      },
    }),
  };
});
let deferClosed = false;
let pendingAnimations: Array<() => void> = [];
const Drawer = defineComponent({
  props: {
    modelValue: Boolean,
    beforeClose: { type: Function, required: true },
  },
  emits: ["update:modelValue", "closed"],
  setup(props, { slots, emit }) {
    watch(
      () => props.modelValue,
      (visible, wasVisible) => {
        if (visible || !wasVisible) return;
        const finish = () => emit("closed");
        if (deferClosed) pendingAnimations.push(finish);
        else void nextTick().then(finish);
      }
    );
    return () =>
      props.modelValue
        ? h("section", [
            slots.header?.({
              titleId: "script-title",
              titleClass: "el-drawer__title",
            }),
            h(
              "button",
              {
                class: "close",
                onClick: () =>
                  props.beforeClose(() => {
                    emit("update:modelValue", false);
                  }),
              },
              "Close"
            ),
            slots.default?.(),
          ])
        : null;
  },
});
const cleanups: Array<() => void> = [];
const createDrawer = () => {
  const closed = vi.fn();
  const app = createApp(VerseScriptDrawer, {
    verseId: 2329,
    title: "Scene",
    sceneData: { children: { modules: [] } },
    onClosed: closed,
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
  const el = document.createElement("div");
  document.body.append(el);
  const vm = app.mount(el) as unknown as {
    open: () => void;
    close: (assertActive?: () => void) => Promise<boolean>;
    getState: () => {
      open: boolean;
      ready: boolean;
      dirty: boolean;
      saving: boolean;
      tab: "blockly" | "script" | null;
    };
    resolveBeforeLeave: () => Promise<boolean>;
    closeAfterNavigation: () => Promise<boolean>;
  };
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    el.remove();
  };
  cleanups.push(unmount);
  return {
    vm,
    closed,
    get: (selector: string) => ({
      trigger: async (_event: string) => {
        const button = el.querySelector<HTMLButtonElement>(selector);
        if (!button) throw new Error(`Missing ${selector}`);
        button.click();
        await nextTick();
      },
    }),
    find: (selector: string) => ({
      exists: () => !!el.querySelector(selector),
    }),
    finishAnimation: () => {
      const animations = pendingAnimations;
      pendingAnimations = [];
      animations.forEach((finish) => finish());
    },
    unmount,
  };
};

const deferredDecision = () => {
  let finish!: (result: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
};

describe("scene script drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveClose.mockResolvedValue(true);
    deferClosed = false;
    pendingAnimations = [];
  });
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  });
  it("loads the full script surface lazily with the same scene and disposes it on close", async () => {
    const wrapper = createDrawer();
    expect(mounts).not.toHaveBeenCalled();
    wrapper.vm.open();
    await flushPromises();
    expect(mounts).toHaveBeenCalledOnce();
    expect(mounts.mock.calls[0][0]).toMatchObject({
      verseId: 2329,
      embedded: true,
    });
    await wrapper.get(".close").trigger("click");
    await flushPromises();
    expect(unmounts).toHaveBeenCalledOnce();
    expect(wrapper.closed).toHaveBeenCalledOnce();
    wrapper.vm.open();
    await flushPromises();
    expect(mounts).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
  it("keeps the editor mounted when the unsaved decision cancels leaving", async () => {
    resolveClose.mockResolvedValue(false);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    await wrapper.get(".close").trigger("click");
    await flushPromises();
    expect(wrapper.find(".return-to-scene").exists()).toBe(true);
    expect(unmounts).not.toHaveBeenCalled();
    expect(await wrapper.vm.resolveBeforeLeave()).toBe(false);
    await wrapper.get(".return-to-scene").trigger("click");
    await flushPromises();
    expect(wrapper.find(".return-to-scene").exists()).toBe(true);
    wrapper.unmount();
  });
  it("shares one pending save decision between close and route navigation", async () => {
    let finish!: (value: boolean) => void;
    resolveClose.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const first = wrapper.vm.resolveBeforeLeave();
    const second = wrapper.vm.resolveBeforeLeave();
    expect(resolveClose).toHaveBeenCalledOnce();
    finish(true);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    wrapper.vm.closeAfterNavigation();
    await flushPromises();
    expect(unmounts).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it("uses the editor's save and history actions from the header and respects readiness and permissions", async () => {
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const save = wrapper.get(".script-drawer-action--save");
    const history = wrapper.get(
      ".script-drawer-action:not(.script-drawer-action--save)"
    );
    const state = mounts.mock.calls[0][1];
    await save.trigger("click");
    await history.trigger("click");
    expect(saveScript).toHaveBeenCalledOnce();
    expect(openVersions).toHaveBeenCalledOnce();

    state.editorContentLoading = true;
    await nextTick();
    await save.trigger("click");
    await history.trigger("click");
    expect(saveScript).toHaveBeenCalledOnce();
    expect(openVersions).toHaveBeenCalledOnce();

    state.editorContentLoading = false;
    state.isSaving = true;
    await nextTick();
    await save.trigger("click");
    await history.trigger("click");
    expect(saveScript).toHaveBeenCalledOnce();
    expect(openVersions).toHaveBeenCalledOnce();

    state.isSaving = false;
    state.saveable = false;
    await nextTick();
    await save.trigger("click");
    await history.trigger("click");
    expect(saveScript).toHaveBeenCalledOnce();
    expect(openVersions).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
  it("shares one confirmation across the programmatic close, close button, and navigation", async () => {
    const decision = deferredDecision();
    resolveClose.mockReturnValue(decision.promise);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();

    await wrapper.get(".close").trigger("click");
    const closing = wrapper.vm.close();
    const leaving = wrapper.vm.resolveBeforeLeave();
    expect(resolveClose).toHaveBeenCalledOnce();

    decision.finish(true);
    await expect(leaving).resolves.toBe(true);
    await flushPromises();
    await expect(closing).resolves.toBe(true);
    expect(wrapper.closed).toHaveBeenCalledOnce();
    expect(wrapper.vm.getState().open).toBe(false);
  });
  it("returns false and keeps dirty work when the editor cancels or cannot save", async () => {
    resolveClose.mockResolvedValue(false);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    mounts.mock.calls[0][1].hasUnsavedChanges = true;

    await expect(wrapper.vm.close()).resolves.toBe(false);
    expect(wrapper.vm.getState()).toMatchObject({
      open: true,
      dirty: true,
    });
    expect(unmounts).not.toHaveBeenCalled();
    expect(wrapper.closed).not.toHaveBeenCalled();
    expect(saveScript).not.toHaveBeenCalled();
  });
  it("does not report success until the closing animation emits closed", async () => {
    deferClosed = true;
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const settled = vi.fn();
    const closing = wrapper.vm.close();
    void closing.then(settled);
    await flushPromises();

    expect(settled).not.toHaveBeenCalled();
    expect(wrapper.closed).not.toHaveBeenCalled();
    expect(wrapper.vm.getState()).toMatchObject({
      open: true,
      ready: false,
    });
    wrapper.finishAnimation();
    await expect(closing).resolves.toBe(true);
    expect(wrapper.closed).toHaveBeenCalledOnce();
    expect(wrapper.vm.getState().open).toBe(false);
  });
  it("rechecks the caller guard after the asynchronous confirmation", async () => {
    const decision = deferredDecision();
    resolveClose.mockReturnValue(decision.promise);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    let active = true;
    const assertActive = vi.fn(() => {
      if (!active) throw new Error("场景会话已切换");
    });
    const closing = wrapper.vm.close(assertActive);
    active = false;
    decision.finish(true);

    await expect(closing).rejects.toThrow("场景会话已切换");
    expect(assertActive).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.getState().open).toBe(true);
    expect(wrapper.closed).not.toHaveBeenCalled();
  });
  it("settles an animation-waiting close as false when the drawer is unmounted", async () => {
    deferClosed = true;
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const closing = wrapper.vm.close();
    await flushPromises();
    wrapper.unmount();

    await expect(closing).resolves.toBe(false);
  });
  it("does not leave a close waiting on confirmation after unmount", async () => {
    const decision = deferredDecision();
    resolveClose.mockReturnValue(decision.promise);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const settled = vi.fn();
    void wrapper.vm.close().then(settled);
    wrapper.unmount();
    await flushPromises();

    try {
      expect(settled).toHaveBeenCalledWith(false);
    } finally {
      decision.finish(false);
    }
  });
  it("does not let an old confirmation close a reopened drawer session", async () => {
    const decision = deferredDecision();
    resolveClose.mockReturnValue(decision.promise);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const oldClosing = wrapper.vm.close();
    wrapper.vm.closeAfterNavigation();
    await flushPromises();
    wrapper.vm.open();
    await flushPromises();
    decision.finish(true);

    await expect(oldClosing).resolves.toBe(false);
    expect(wrapper.vm.getState().open).toBe(true);
    expect(mounts).toHaveBeenCalledTimes(2);
  });
  it("starts a separate confirmation when closing a new session before the old decision finishes", async () => {
    const oldDecision = deferredDecision();
    const newDecision = deferredDecision();
    resolveClose
      .mockReturnValueOnce(oldDecision.promise)
      .mockReturnValueOnce(newDecision.promise);
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const oldClosing = wrapper.vm.close();
    wrapper.vm.closeAfterNavigation();
    await flushPromises();
    wrapper.vm.open();
    await flushPromises();
    const newClosing = wrapper.vm.close();

    try {
      expect(resolveClose).toHaveBeenCalledTimes(2);
      oldDecision.finish(true);
      await expect(oldClosing).resolves.toBe(false);
      expect(wrapper.vm.getState().open).toBe(true);
      newDecision.finish(false);
      await expect(newClosing).resolves.toBe(false);
      expect(wrapper.vm.getState().open).toBe(true);
    } finally {
      oldDecision.finish(false);
      newDecision.finish(false);
    }
  });
  it("finishes navigation closing before allowing a new drawer session to open", async () => {
    deferClosed = true;
    const wrapper = createDrawer();
    wrapper.vm.open();
    await flushPromises();
    const settled = vi.fn();
    const leaving = wrapper.vm.closeAfterNavigation();
    void leaving.then(settled);
    await flushPromises();

    expect(settled).not.toHaveBeenCalled();
    expect(() => wrapper.vm.open()).toThrow("正在关闭");
    wrapper.finishAnimation();
    await expect(leaving).resolves.toBe(true);
    wrapper.vm.open();
    await flushPromises();
    expect(wrapper.vm.getState()).toMatchObject({ open: true, ready: true });
    expect(mounts).toHaveBeenCalledTimes(2);
  });
  it("reports the script editor's readiness, unsaved work, saving state, and selected tab", async () => {
    const wrapper = createDrawer();
    expect(wrapper.vm.getState()).toEqual({
      open: false,
      ready: false,
      dirty: false,
      saving: false,
      tab: null,
    });
    wrapper.vm.open();
    expect(wrapper.vm.getState()).toMatchObject({ open: true, ready: false });
    await flushPromises();
    expect(wrapper.vm.getState()).toMatchObject({
      open: true,
      ready: true,
      tab: "blockly",
    });
    Object.assign(mounts.mock.calls[0][1], {
      editorContentLoading: true,
      hasUnsavedChanges: true,
      isSaving: true,
      activeName: "script",
    });

    expect(wrapper.vm.getState()).toEqual({
      open: true,
      ready: false,
      dirty: true,
      saving: true,
      tab: "script",
    });
  });
});
