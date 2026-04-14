import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((fn) => fn());
});

async function mount(props: Record<string, unknown>) {
  const { default: IdentityChips } = await import(
    "@/layout/components/NavBar/components/IdentityChips.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(
    IdentityChips as Parameters<typeof createApp>[0],
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

describe("IdentityChips", () => {
  it("always renders the site label", async () => {
    const { el } = await mount({
      siteLabel: "Rokid AR Studio",
      visibleOrganizations: [],
      overflowCount: 0,
    });

    expect(el.textContent).toContain("Rokid AR Studio");
    expect(el.querySelector(".identity-chip--site")).not.toBeNull();
  });

  it("renders at most the explicit visible organizations passed from the composable", async () => {
    const { el } = await mount({
      siteLabel: "Rokid AR Studio",
      visibleOrganizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
      ],
      overflowCount: 1,
    });

    const chips = Array.from(el.querySelectorAll(".identity-chip--org")).map(
      (node) => node.textContent?.trim()
    );

    expect(chips).toEqual(["North Campus", "Research Lab"]);
    expect(el.textContent).toContain("+1");
  });
});
