import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import EditorLoadingOverlay from "@/components/EditorLoadingOverlay.vue";
import EditorVersionToolbar from "@/layout/components/NavBar/components/EditorVersionToolbar.vue";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("local editor loading", () => {
  it("keeps the overlay inside its editor without disabling or focusing the surrounding page", async () => {
    const page = document.createElement("div");
    page.id = "app";
    const navigation = document.createElement("button");
    const frameContainer = document.createElement("section");
    page.append(navigation, frameContainer);
    document.body.append(page);
    navigation.focus();
    const state = reactive({ blocked: true, failed: false });
    const retry = vi.fn();
    const app = createApp({
      render: () => h(EditorLoadingOverlay, { ...state, onRetry: retry }),
    });
    app.component(
      "ElIcon",
      defineComponent({
        setup:
          (_, { slots }) =>
          () =>
            h("span", slots.default?.()),
      })
    );
    app.mount(frameContainer);
    cleanups.push(() => {
      app.unmount();
      page.remove();
    });
    await nextTick();
    expect(
      frameContainer.querySelector(".editor-loading-overlay")
    ).not.toBeNull();
    expect(page.inert).not.toBe(true);
    expect(document.activeElement).toBe(navigation);
    expect(page.querySelector('[aria-modal="true"]')).toBeNull();
    state.failed = true;
    await nextTick();
    expect(frameContainer.querySelector(".editor-loading-spinner")).toBeNull();
    frameContainer.querySelector<HTMLButtonElement>("button")!.click();
    expect(retry).toHaveBeenCalledOnce();
    state.blocked = false;
    await nextTick();
    expect(frameContainer.querySelector(".editor-loading-overlay")).toBeNull();
    expect(document.activeElement).toBe(navigation);
  });

  it("shows counted progress and escapes item names, with indeterminate initialization", async () => {
    const container = document.createElement("div");
    const state = reactive({
      blocked: true,
      failed: false,
      progress: {
        phase: "assets" as const,
        completed: 2,
        total: 5,
        currentKind: "model",
        currentItem: "<script>bad</script>",
      },
    });
    const app = createApp({ render: () => h(EditorLoadingOverlay, state) });
    app.component(
      "ElIcon",
      defineComponent({
        setup:
          (_, { slots }) =>
          () =>
            h("span", slots.default?.()),
      })
    );
    app.mount(container);
    cleanups.push(() => app.unmount());
    expect(container.querySelector("progress")?.getAttribute("value")).toBe(
      "40"
    );
    expect(container.textContent).toContain("40%");
    expect(container.textContent).toContain("<script>bad</script>");
    expect(container.querySelector("script")).toBeNull();
    state.progress.total = 0;
    await nextTick();
    expect(container.querySelector("progress")?.hasAttribute("value")).toBe(
      false
    );
    state.failed = true;
    await nextTick();
    expect(container.querySelector("progress")).toBeNull();
  });

  it("loads dependent toolbar buttons independently while server history stays usable", async () => {
    const state = reactive({ loading: true, blocked: true });
    const onRun = vi.fn();
    const onVersions = vi.fn();
    const onScript = vi.fn();
    const onPublications = vi.fn();
    const toolbar = useEditorVersionToolbar();
    toolbar.registerToolbar("local-loading-test", {
      getLoadingState: () => state,
      onRunPreview: onRun,
      onOpen: onVersions,
      onOpenScript: onScript,
      onOpenPublications: onPublications,
    });
    const app = createApp(EditorVersionToolbar);
    app.component(
      "ElTooltip",
      defineComponent({
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
          (_, { attrs, slots }) =>
          () =>
            h("button", attrs, slots.default?.()),
      })
    );
    app.component(
      "FontAwesomeIcon",
      defineComponent({ setup: () => () => h("span") })
    );
    const root = document.createElement("div");
    document.body.append(root);
    app.mount(root);
    cleanups.push(() => {
      app.unmount();
      root.remove();
      toolbar.unregisterToolbar("local-loading-test");
    });
    const button = (label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    const dependentLabels = [
      "common.unityPreview.entry",
      "common.scriptDraft.entry",
      "route.project.scriptEditor",
    ];
    for (const label of dependentLabels) {
      expect(button(label).disabled).toBe(true);
      expect(button(label).getAttribute("aria-busy")).toBe("true");
      button(label).click();
    }
    toolbar.runPreview();
    toolbar.openDialog();
    toolbar.openScript();
    expect(onRun).not.toHaveBeenCalled();
    expect(onVersions).not.toHaveBeenCalled();
    expect(onScript).not.toHaveBeenCalled();
    button("common.publicationHistory.title").click();
    expect(onPublications).toHaveBeenCalledOnce();
    state.loading = false;
    await nextTick();
    for (const label of dependentLabels) {
      expect(button(label).disabled).toBe(true);
      expect(button(label).getAttribute("aria-busy")).toBe("false");
    }
    state.blocked = false;
    await nextTick();
    for (const label of dependentLabels) button(label).click();
    expect(onRun).toHaveBeenCalledOnce();
    expect(onVersions).toHaveBeenCalledOnce();
    expect(onScript).toHaveBeenCalledOnce();
  });
});
