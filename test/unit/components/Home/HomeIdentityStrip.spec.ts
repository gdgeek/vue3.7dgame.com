import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
});

async function mount(props: Record<string, unknown>) {
  const { default: HomeIdentityStrip } = await import(
    "@/components/Home/HomeIdentityStrip.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(
    HomeIdentityStrip as Parameters<typeof createApp>[0],
    props
  );
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  await nextTick();
  return { el };
}

describe("HomeIdentityStrip", () => {
  it("renders the site label even when the organization list is empty", async () => {
    const { el } = await mount({
      siteLabel: "Rokid AR Studio",
      organizations: [],
    });

    expect(el.textContent).toContain("Rokid AR Studio");
    expect(el.querySelectorAll(".home-identity-chip--org")).toHaveLength(0);
  });

  it("renders every organization as its own chip for the homepage summary", async () => {
    const { el } = await mount({
      siteLabel: "Rokid AR Studio",
      organizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
        { id: 3, name: "teachers-team", title: "Teachers Team" },
      ],
    });

    const chips = Array.from(el.querySelectorAll(".home-identity-chip--org")).map(
      (node) => node.textContent?.trim()
    );

    expect(chips).toEqual(["North Campus", "Research Lab", "Teachers Team"]);
  });
});
