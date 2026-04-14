import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, type App } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "manager.list.roles.root": "Root",
          "manager.list.roles.admin": "Admin",
          "manager.list.roles.manager": "Manager",
          "manager.list.roles.user": "User",
          "manager.list.label": "Perms",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: () => true,
  }),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({
    userInfo: {
      roles: ["admin"],
    },
  }),
}));

vi.mock("@/utils/avatar", () => ({
  getUserAvatarUrl: () => "/avatar.png",
}));

vi.mock("@/api/v1/person", () => ({
  deletePerson: vi.fn(),
  putPerson: vi.fn(),
  putPersonNickname: vi.fn(),
}));

vi.mock("vue-waterfall-plugin-next", async () => {
  const { defineComponent, h } = await import("vue");

  return {
    Waterfall: defineComponent({
      name: "Waterfall",
      props: {
        list: {
          type: Array,
          default: () => [],
        },
      },
      setup(props, { slots }) {
        return () =>
          h(
            "div",
            { class: "waterfall-stub" },
            (props.list as unknown[]).map((item, index) =>
              h(
                "div",
                { class: "waterfall-item", key: index },
                slots.default?.({ item, index })
              )
            )
          );
      },
    }),
    LazyImg: defineComponent({
      name: "LazyImg",
      props: {
        url: {
          type: String,
          default: "",
        },
      },
      setup(props) {
        return () => h("img", { class: "lazy-img-stub", src: props.url });
      },
    }),
  };
});

const cleanups: Array<() => void> = [];

function mount(Component: unknown, props: Record<string, unknown>) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(Component as Parameters<typeof createApp>[0], props);
  app.config.globalProperties.$t = (key: string) =>
    (
      {
        "manager.list.roles.root": "Root",
        "manager.list.roles.admin": "Admin",
        "manager.list.roles.manager": "Manager",
        "manager.list.roles.user": "User",
        "manager.list.label": "Perms",
        "manager.list.organization": "Organizations",
        "common.edit": "Edit",
      } as Record<string, string>
    )[key] ?? key;
  app.component(
    "el-dialog",
    defineComponent({
      name: "ElDialog",
      setup(_props, { slots }) {
        return () => h("div", { class: "el-dialog-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-form",
    defineComponent({
      name: "ElForm",
      setup(_props, { slots, expose }) {
        expose({
          validate: () => Promise.resolve(true),
        });
        return () => h("form", { class: "el-form-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-form-item",
    defineComponent({
      name: "ElFormItem",
      setup(_props, { slots }) {
        return () => h("div", { class: "el-form-item-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-input",
    defineComponent({
      name: "ElInput",
      setup() {
        return () => h("input", { class: "el-input-stub" });
      },
    })
  );
  app.component(
    "el-card",
    defineComponent({
      name: "ElCard",
      setup(_props, { slots }) {
        return () => h("article", { class: "el-card-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-descriptions",
    defineComponent({
      name: "ElDescriptions",
      setup(_props, { slots }) {
        return () =>
          h("section", { class: "el-descriptions-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-descriptions-item",
    defineComponent({
      name: "ElDescriptionsItem",
      props: {
        label: {
          type: String,
          default: "",
        },
      },
      setup(props, { slots }) {
        return () =>
          h("div", { class: "el-descriptions-item-stub" }, [
            h("span", { class: "el-descriptions-item-label" }, props.label),
            ...(slots.default?.() ?? []),
          ]);
      },
    })
  );
  app.component(
    "el-select",
    defineComponent({
      name: "ElSelect",
      setup(_props, { slots }) {
        return () => h("div", { class: "el-select-stub" }, slots.default?.());
      },
    })
  );
  app.component(
    "el-option",
    defineComponent({
      name: "ElOption",
      props: {
        label: {
          type: String,
          default: "",
        },
      },
      setup(props) {
        return () => h("span", { class: "el-option-stub" }, props.label);
      },
    })
  );
  app.component(
    "el-button",
    defineComponent({
      name: "ElButton",
      setup(_props, { slots }) {
        return () => h("button", { class: "el-button-stub" }, slots.default?.());
      },
    })
  );
  const instance = app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  return { el, app, instance };
}

describe("MrPP Person List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  });

  it("renders organization titles for each user card", async () => {
    const { default: List } = await import("@/components/MrPP/Person/List.vue");
    const { el } = mount(List, {
      items: [
        {
          id: "1",
          username: "alice",
          nickname: "Alice",
          roles: ["user"],
          avatar: { url: "/avatar.png" },
          organizations: [
            { id: 11, name: "north-team", title: "North Team" },
            { id: 12, name: "global-team", title: "Global Team" },
          ],
        },
      ],
    });

    expect(el.textContent).toContain("North Team");
    expect(el.textContent).toContain("Global Team");
  });
});
