import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, createApp, nextTick } from "vue";

vi.mock("@/store/modules/user", () => ({
  useUserStore: vi.fn(() => ({
    userInfo: {
      userData: {
        nickname: "Ada",
        username: "ada",
      },
    },
  })),
}));

vi.mock("@/store", () => ({
  useScreenStore: vi.fn(() => ({
    isMobile: false,
  })),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/composables/useIdentityDisplay", () => ({
  useIdentityDisplay: vi.fn(() =>
    computed(() => ({
      siteLabel: "Rokid AR Studio",
      organizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
        { id: 3, name: "teachers-team", title: "Teachers Team" },
      ],
      visibleOrganizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
      ],
      overflowCount: 1,
      hasOrganizations: true,
    }))
  ),
}));

vi.mock("@/components/Home/QRCodeDialog.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "QRCodeDialog",
      template: "<div class='qr-code-dialog-stub'></div>",
    }),
  };
});

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((fn) => fn());
  vi.clearAllMocks();
});

async function mount() {
  const { default: HomeHeader } = await import(
    "@/components/Home/HomeHeader.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(HomeHeader as Parameters<typeof createApp>[0]);
  app.component("el-row", {
    template: "<div class='el-row-stub'><slot /></div>",
  });
  app.component("el-col", {
    template: "<div class='el-col-stub'><slot /></div>",
  });
  app.component("font-awesome-icon", {
    template: "<i class='fa-stub'></i>",
  });
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  await nextTick();
  return { el };
}

describe("HomeHeader", () => {
  it("renders the identity strip below the subtitle", async () => {
    const { el } = await mount();

    expect(el.querySelector(".home-identity-strip")).not.toBeNull();
    expect(el.textContent).toContain("Rokid AR Studio");
    expect(el.textContent).toContain("North Campus");
    expect(el.textContent).toContain("Research Lab");
    expect(el.textContent).toContain("Teachers Team");
  });
});
