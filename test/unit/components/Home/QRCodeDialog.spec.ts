import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

const { getUserLinkedMock } = vi.hoisted(() => ({
  getUserLinkedMock: vi.fn(),
}));

vi.mock("@/api/v1/tools", () => ({
  getUserLinked: getUserLinkedMock,
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: { seconds?: number }) =>
      params?.seconds === undefined ? key : `${key}:${params.seconds}`,
  }),
}));

vi.mock("qrcode.vue", async () => {
  const { defineComponent } = await import("vue");
  return {
    default: defineComponent({
      name: "QrcodeVueStub",
      props: {
        value: {
          type: String,
          required: true,
        },
      },
      template: '<div class="qrcode-vue-stub" :data-value="value"></div>',
    }),
  };
});

type DialogExpose = {
  openDialog: () => void;
};

const cleanups: Array<() => void> = [];

const flushAsync = async () => {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

const mountDialog = async () => {
  const { default: QRCodeDialog } = await import(
    "@/components/Home/QRCodeDialog.vue"
  );
  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(QRCodeDialog);
  app.component("el-dialog", {
    props: {
      modelValue: Boolean,
    },
    emits: ["update:modelValue", "close"],
    methods: {
      closeDialog() {
        this.$emit("update:modelValue", false);
        this.$emit("close");
      },
    },
    template: `
      <section v-if="modelValue" class="dialog-stub">
        <slot name="header"></slot>
        <slot></slot>
        <button class="dialog-close-stub" @click="closeDialog">close</button>
      </section>
    `,
  });
  app.component("el-button", {
    emits: ["click"],
    template:
      '<button class="el-button-stub" @click="$emit(\'click\')"><slot></slot></button>',
  });
  app.component("font-awesome-icon", {
    template: '<i class="font-awesome-icon-stub"></i>',
  });
  app.directive("loading", {});

  const vm = app.mount(el) as unknown as DialogExpose;
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    el.remove();
  };
  cleanups.push(unmount);
  await nextTick();

  return { el, unmount, vm };
};

afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("QRCodeDialog", () => {
  it("does not poll for another login code after loading or expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    getUserLinkedMock.mockResolvedValue({
      data: { key: "single-request", expires_in: 1 },
    });
    const { el, vm } = await mountDialog();

    vm.openDialog();
    await flushAsync();
    expect(
      el.querySelector(".qrcode-vue-stub")?.getAttribute("data-value")
    ).toBe("web_single-request");
    expect(getUserLinkedMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    await nextTick();
    expect(getUserLinkedMock).toHaveBeenCalledTimes(1);
  });

  it("covers an expired code and refreshes only after user action", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    getUserLinkedMock
      .mockResolvedValueOnce({ data: { key: "expired", expires_in: 1 } })
      .mockResolvedValueOnce({ data: { key: "fresh", expires_in: 60 } });
    const { el, vm } = await mountDialog();

    vm.openDialog();
    await flushAsync();
    await vi.advanceTimersByTimeAsync(1_000);
    await nextTick();

    expect(el.querySelector(".qrcode-blocker")).not.toBeNull();
    expect(el.textContent).toContain("login.loginCodeExpired");
    expect(getUserLinkedMock).toHaveBeenCalledTimes(1);

    (el.querySelector(".qrcode-refresh") as HTMLButtonElement).click();
    await flushAsync();
    expect(
      el.querySelector(".qrcode-vue-stub")?.getAttribute("data-value")
    ).toBe("web_fresh");
    expect(el.querySelector(".qrcode-blocker")).toBeNull();
    expect(getUserLinkedMock).toHaveBeenCalledTimes(2);
  });

  it("requests a new code every time the dialog opens", async () => {
    getUserLinkedMock
      .mockResolvedValueOnce({ data: { key: "first", expires_in: 60 } })
      .mockResolvedValueOnce({ data: { key: "second", expires_in: 60 } });
    const { el, vm } = await mountDialog();

    vm.openDialog();
    await flushAsync();
    expect(
      el.querySelector(".qrcode-vue-stub")?.getAttribute("data-value")
    ).toBe("web_first");

    (el.querySelector(".dialog-close-stub") as HTMLButtonElement).click();
    await nextTick();
    expect(el.querySelector(".qrcode-vue-stub")).toBeNull();

    vm.openDialog();
    await flushAsync();
    expect(
      el.querySelector(".qrcode-vue-stub")?.getAttribute("data-value")
    ).toBe("web_second");
    expect(getUserLinkedMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a pending response after the dialog closes", async () => {
    let resolveFirstRequest: ((value: unknown) => void) | undefined;
    getUserLinkedMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          })
      )
      .mockResolvedValueOnce({ data: { key: "next-open", expires_in: 60 } });
    const { el, vm } = await mountDialog();

    vm.openDialog();
    await nextTick();
    (el.querySelector(".dialog-close-stub") as HTMLButtonElement).click();
    await nextTick();

    resolveFirstRequest?.({ data: { key: "stale", expires_in: 60 } });
    await flushAsync();
    expect(el.querySelector(".qrcode-vue-stub")).toBeNull();

    vm.openDialog();
    await flushAsync();
    expect(
      el.querySelector(".qrcode-vue-stub")?.getAttribute("data-value")
    ).toBe("web_next-open");
    expect(el.textContent).not.toContain("web_stale");
  });

  it("invalidates a pending response when the component unmounts", async () => {
    vi.useFakeTimers();
    let resolveRequest: ((value: unknown) => void) | undefined;
    getUserLinkedMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const { unmount, vm } = await mountDialog();

    vm.openDialog();
    await nextTick();
    unmount();
    resolveRequest?.({ data: { key: "stale", expires_in: 60 } });
    await flushAsync();

    expect(vi.getTimerCount()).toBe(0);
  });
});
