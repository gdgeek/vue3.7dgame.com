import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";
import { useTextDragScroll } from "@/composables/useTextDragScroll";

let app: App, root: HTMLElement, textarea: HTMLTextAreaElement;
let enabled = true,
  sequence = 0;
const frames = new Map<number, FrameRequestCallback>();
function pointer(
  target: EventTarget,
  type: string,
  x: number,
  pointerType = "mouse",
  buttons = 1
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons,
    clientX: x,
    clientY: 10,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: pointerType },
  });
  target.dispatchEvent(event);
}
function frame() {
  const entry = frames.entries().next().value;
  if (!entry) return;
  frames.delete(entry[0]);
  entry[1](16 * sequence);
}
beforeEach(() => {
  frames.clear();
  sequence = 0;
  enabled = true;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  root = document.createElement("div");
  document.body.append(root);
  app = createApp({
    setup() {
      const { startTextDrag } = useTextDragScroll(() => enabled);
      return () => h("textarea", { onPointerdown: startTextDrag });
    },
  });
  app.mount(root);
  textarea = root.querySelector("textarea")!;
  Object.defineProperties(textarea, {
    scrollWidth: { value: 1000 },
    clientWidth: { value: 200 },
  });
  textarea.getBoundingClientRect = () =>
    ({ left: 0, right: 200, width: 200 }) as DOMRect;
  textarea.focus();
});
afterEach(() => {
  app.unmount();
  root.remove();
  vi.unstubAllGlobals();
});

describe("text drag scrolling", () => {
  it("reveals text only during an edge drag and stops on release", () => {
    pointer(textarea, "pointerdown", 100);
    frame();
    expect(textarea.scrollLeft).toBe(0);
    pointer(document, "pointermove", 199);
    frame();
    expect(textarea.scrollLeft).toBeGreaterThan(0);
    const right = textarea.scrollLeft;
    pointer(document, "pointermove", 1);
    frame();
    expect(textarea.scrollLeft).toBeLessThan(right);
    pointer(document, "pointerup", 1, "mouse", 0);
    expect(frames.size).toBe(0);
    expect(textarea.value).toBe("");
  });
  it("leaves touch selection alone and cleans up on blur, disable, and unmount", () => {
    pointer(textarea, "pointerdown", 100, "touch");
    expect(frames.size).toBe(0);
    pointer(textarea, "pointerdown", 100);
    window.dispatchEvent(new Event("blur"));
    expect(frames.size).toBe(0);
    pointer(textarea, "pointerdown", 100);
    enabled = false;
    frame();
    expect(frames.size).toBe(0);
    enabled = true;
    pointer(textarea, "pointerdown", 100);
    app.unmount();
    expect(frames.size).toBe(0);
    pointer(document, "pointermove", 199);
    expect(frames.size).toBe(0);
  });
});
