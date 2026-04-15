import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, type App } from "vue";

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
});

async function mountStandardCard(
  props: Record<string, unknown> = {}
): Promise<{ el: HTMLElement; app: App }> {
  const { default: StandardCard } = await import(
    "@/components/StandardPage/StandardCard.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(StandardCard, {
    title: "Resource Card",
    image: "/cover.png",
    ...props,
  });
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  return { el, app };
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
});
