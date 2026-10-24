import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  withDirectives,
  type App,
  type ShallowRef,
} from "vue";
import { vLongPress } from "@/directive/longPress";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: {
    icon: {
      type: [Array, String],
      default: () => [],
    },
  },
  template: '<span class="fa-stub"></span>',
});

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
  vi.useRealTimers();
});

async function mountStandardCard(
  props: Record<string, unknown> = {},
  longPress?: ShallowRef<(() => void) | undefined>
): Promise<{ el: HTMLElement; app: App }> {
  const { default: StandardCard } = await import(
    "@/components/StandardPage/StandardCard.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp({
    render: () =>
      withDirectives(
        h(StandardCard, {
          title: "Resource Card",
          image: "/cover.png",
          ...props,
        }),
        [[vLongPress, longPress?.value]]
      ),
  });
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  return { el, app };
}

function pointer(target: Element, type: string, init: MouseEventInit = {}) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 30,
    clientY: 30,
    ...init,
  });
  Object.defineProperty(event, "pointerId", { value: 1 });
  target.dispatchEvent(event);
  return event;
}

describe("StandardCard", () => {
  it("keeps media thumbnails filled with cover by default", async () => {
    const { el } = await mountStandardCard();
    const image = el.querySelector(".thumbnail-inner img") as HTMLElement;

    expect(image.getAttribute("style")).toContain("object-fit: cover");
  });

  it("updates thumbnail aspect ratio from loaded image dimensions", async () => {
    const { el } = await mountStandardCard();
    const thumbnail = el.querySelector(".card-thumbnail") as HTMLElement;
    const image = el.querySelector(".thumbnail-inner img") as HTMLImageElement;

    expect(thumbnail.getAttribute("style")).toContain("aspect-ratio: 1 / 1");

    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      value: 640,
    });

    image.dispatchEvent(new Event("load"));
    await nextTick();

    expect(thumbnail.getAttribute("style")).toContain(
      "aspect-ratio: 320 / 640"
    );
  });

  it("opens information on a short click and opens the editor only once on a long press", async () => {
    const onView = vi.fn();
    const edit = vi.fn();
    const { el } = await mountStandardCard({ onView }, shallowRef(edit));
    const image = el.querySelector("img")!;
    vi.useFakeTimers();

    pointer(image, "pointerdown");
    expect(document.querySelector(".long-press-hint")?.textContent).toBe(
      "长按 1 秒直接进入编辑"
    );
    expect(document.querySelector(".long-press-hint strong")?.textContent).toBe(
      "1 秒"
    );
    vi.advanceTimersByTime(200);
    pointer(image, "pointerup");
    expect(document.querySelector(".long-press-hint")).toBeNull();
    pointer(image, "click");
    expect(onView).toHaveBeenCalledTimes(1);
    expect(edit).not.toHaveBeenCalled();

    onView.mockClear();
    pointer(image, "pointerdown");
    vi.advanceTimersByTime(999);
    expect(edit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".long-press-hint")).toBeNull();
    vi.advanceTimersByTime(1000);
    pointer(image, "pointerup");
    const click = pointer(image, "click");
    expect(click.defaultPrevented).toBe(true);
    expect(onView).not.toHaveBeenCalled();
    expect(edit).toHaveBeenCalledTimes(1);

    pointer(image, "pointerdown");
    pointer(image, "pointerup");
    pointer(image, "click");
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it.each([
    "pointerup",
    "pointerleave",
    "pointercancel",
    "pointermove",
    "scroll",
    "blur",
  ])("cancels editing on %s before the long press completes", async (type) => {
    const edit = vi.fn();
    const { el } = await mountStandardCard({}, shallowRef(edit));
    const card = el.querySelector(".standard-card")!;
    vi.useFakeTimers();
    pointer(card, "pointerdown");
    vi.advanceTimersByTime(200);
    if (type === "scroll" || type === "blur")
      window.dispatchEvent(new Event(type));
    else pointer(card, type, { clientX: 50 });
    expect(document.querySelector(".long-press-hint")).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(edit).not.toHaveBeenCalled();
  });

  it("keeps selection and footer actions separate from editing and information", async () => {
    const edit = vi.fn();
    const onView = vi.fn();
    const onSelect = vi.fn();
    const onAction = vi.fn();
    const { el } = await mountStandardCard(
      { onView, onSelect, onAction, actionText: "Open example" },
      shallowRef(edit)
    );
    vi.useFakeTimers();
    for (const selector of [".checkbox-inner", ".card-action"]) {
      const control = el.querySelector(selector)!;
      pointer(control, "pointerdown");
      expect(document.querySelector(".long-press-hint")).toBeNull();
      vi.advanceTimersByTime(1100);
      pointer(control, "pointerup");
      pointer(control, "click");
    }
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(true);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onView).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it("cancels a pending gesture when editing is disabled or the card is removed", async () => {
    const edit = vi.fn();
    const handler = shallowRef<(() => void) | undefined>(edit);
    const { el } = await mountStandardCard({}, handler);
    const card = el.querySelector(".standard-card")!;
    vi.useFakeTimers();
    pointer(card, "pointerdown");
    handler.value = undefined;
    await nextTick();
    vi.advanceTimersByTime(1100);
    expect(edit).not.toHaveBeenCalled();
    expect(document.querySelector(".long-press-hint")).toBeNull();

    handler.value = edit;
    await nextTick();
    pointer(card, "pointerdown");
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.advanceTimersByTime(1100);
    expect(edit).not.toHaveBeenCalled();
    expect(document.querySelector(".long-press-hint")).toBeNull();
  });

  it("preserves normal clicking when long press is disabled", async () => {
    const onView = vi.fn();
    const { el } = await mountStandardCard({ onView });
    const image = el.querySelector("img")!;
    vi.useFakeTimers();
    pointer(image, "pointerdown");
    expect(document.querySelector(".long-press-hint")).toBeNull();
    vi.advanceTimersByTime(1200);
    pointer(image, "pointerup");
    pointer(image, "click");
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
