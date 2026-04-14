import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  type App,
  type ComponentPublicInstance,
} from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "manager.editor.form.username": "Username",
          "manager.editor.form.nickname": "Nickname",
          "manager.editor.form.cancel": "Cancel",
          "manager.editor.form.submit": "Save",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock("@/api/v1/person", () => ({
  putPersonNickname: vi.fn(),
}));

const cleanups: Array<() => void> = [];

const ElDialogStub = defineComponent({
  name: "ElDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    return () =>
      props.modelValue
        ? h("section", { class: "el-dialog-stub" }, [
            h("header", slots.header?.()),
            h("div", slots.default?.()),
            h("footer", slots.footer?.()),
          ])
        : null;
  },
});

const ElFormStub = defineComponent({
  name: "ElForm",
  setup(_props, { slots, expose }) {
    expose({
      validate: () => Promise.resolve(true),
      clearValidate: () => undefined,
    });

    return () => h("form", { class: "el-form-stub" }, slots.default?.());
  },
});

const ElFormItemStub = defineComponent({
  name: "ElFormItem",
  props: {
    label: {
      type: String,
      default: "",
    },
  },
  setup(props, { slots }) {
    return () =>
      h("label", { class: "el-form-item-stub", "data-label": props.label }, [
        h("span", { class: "el-form-item-label" }, props.label),
        ...(slots.default?.() ?? []),
      ]);
  },
});

const ElInputStub = defineComponent({
  name: "ElInput",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        class: "el-input-stub",
        disabled: props.disabled,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit(
            "update:modelValue",
            (event.target as HTMLInputElement).value ?? ""
          ),
      });
  },
});

const ElButtonStub = defineComponent({
  name: "ElButton",
  emits: ["click"],
  setup(_props, { slots, emit }) {
    return () =>
      h(
        "button",
        {
          class: "el-button-stub",
          type: "button",
          onClick: () => emit("click"),
        },
        slots.default?.()
      );
  },
});

function mount(Component: unknown): {
  el: HTMLElement;
  app: App;
  vm: ComponentPublicInstance & {
    show: (user: { id: number; username: string; nickname?: string | null }) => void;
  };
} {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(Component as Parameters<typeof createApp>[0]);
  app.component("el-dialog", ElDialogStub);
  app.component("el-form", ElFormStub);
  app.component("el-form-item", ElFormItemStub);
  app.component("el-input", ElInputStub);
  app.component("el-button", ElButtonStub);
  const vm = app.mount(el) as ComponentPublicInstance & {
    show: (user: { id: number; username: string; nickname?: string | null }) => void;
  };
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  return { el, app, vm };
}

describe("MrPP Person Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ElMessage", {
      success: vi.fn(),
      error: vi.fn(),
    });
  });

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.unstubAllGlobals();
  });

  it("renders username as a disabled input and nickname as editable", async () => {
    const { default: Editor } = await import("@/components/MrPP/Person/Editor.vue");
    const { el, vm } = mount(Editor);

    vm.show({
      id: 7,
      username: "login@example.com",
      nickname: "Old Name",
    });
    await nextTick();

    const inputs = Array.from(
      el.querySelectorAll<HTMLInputElement>("input.el-input-stub")
    );

    expect(inputs).toHaveLength(2);
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[0].value).toBe("login@example.com");
    expect(inputs[1].disabled).toBe(false);
    expect(inputs[1].value).toBe("Old Name");
  });

  it("submits nickname updates without sending username", async () => {
    const { putPersonNickname } = await import("@/api/v1/person");
    vi.mocked(putPersonNickname).mockResolvedValue({ data: { success: true } });

    const { default: Editor } = await import("@/components/MrPP/Person/Editor.vue");
    const { el, vm } = mount(Editor);

    vm.show({
      id: 9,
      username: "immutable-login",
      nickname: "Before",
    });
    await nextTick();

    const inputs = Array.from(
      el.querySelectorAll<HTMLInputElement>("input.el-input-stub")
    );
    inputs[1].value = "After";
    inputs[1].dispatchEvent(new Event("input"));
    await nextTick();

    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>("button.el-button-stub")
    );
    buttons[1].click();
    await nextTick();

    expect(putPersonNickname).toHaveBeenCalledWith(9, {
      nickname: "After",
    });
  });
});
