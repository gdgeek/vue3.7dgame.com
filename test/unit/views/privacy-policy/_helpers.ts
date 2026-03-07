/**
 * Shared test helpers for privacy-policy component tests.
 * Provides Element Plus component stubs and a mountComponent utility.
 */
import { createApp, defineComponent, h, nextTick, type Component } from "vue";

// ---------------------------------------------------------------------------
// Element Plus stubs
// ---------------------------------------------------------------------------

/**
 * Generic stub: renders title/label text + all named slots inside a div.
 * Exposes data-stub, data-label, data-ts attributes for selector-based assertions.
 */
function makeSlotStub(stubName: string) {
  return defineComponent({
    name: stubName,
    props: {
      modelValue: { default: undefined },
      label: { type: String, default: "" },
      title: { type: String, default: "" }, // el-collapse-item uses "title"
      name: { type: String, default: "" },
      timestamp: { type: String, default: "" },
      type: { type: String, default: "" },
      size: { type: String, default: "" },
    },
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          {
            "data-stub": stubName,
            "data-label": props.label || props.title,
            "data-ts": props.timestamp,
          },
          [
            // Render title/label so content-based assertions can find them
            props.title
              ? h("span", { class: "stub-title" }, props.title)
              : null,
            props.label
              ? h("span", { class: "stub-label" }, props.label)
              : null,
            slots.header?.() ?? [],
            slots.default?.() ?? [],
          ]
        );
    },
  });
}

const EL_STUB_NAMES = [
  "ElCard",
  "ElCollapse",
  "ElCollapseItem",
  "ElTable",
  "ElTableColumn",
  "ElDescriptions",
  "ElDescriptionsItem",
  "ElTag",
  "ElTimeline",
  "ElTimelineItem",
  "ElTabs",
  "ElTabPane",
];

// ---------------------------------------------------------------------------
// mountComponent
// ---------------------------------------------------------------------------

export interface MountResult {
  el: HTMLElement;
  app: ReturnType<typeof createApp>;
  unmount: () => void;
}

export async function mountComponent(
  Component: Component,
  props: Record<string, unknown> = {}
): Promise<MountResult> {
  const el = document.createElement("div");
  const app = createApp(Component as any, props);

  EL_STUB_NAMES.forEach((name) => app.component(name, makeSlotStub(name)));

  app.mount(el);
  await nextTick();

  return {
    el,
    app,
    unmount: () => app.unmount(),
  };
}

/** Helper: collect textContent of all matching elements */
export function textContents(root: HTMLElement, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (n) => n.textContent?.trim() ?? ""
  );
}

/** Wait for all pending promises + multiple ticks (useful for async components) */
export async function flushAll(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  await nextTick();
}
