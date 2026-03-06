/**
 * Unit tests for src/components/Dialog/InputDialog.vue
 * 覆盖：visible ref、watch 回调、validate()、handleInput()、
 *       handleConfirm()、handleCancel()、errorMessage 显示
 *
 * 使用 createApp + jsdom 挂载（项目未安装 @vue/test-utils）。
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, nextTick, defineComponent, ref } from "vue";
import type { App } from "vue";
import InputDialog from "@/components/Dialog/InputDialog.vue";

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ElDialogStub = defineComponent({
  name: "ElDialog",
  props: {
    modelValue: { type: Boolean, default: false },
    title: String,
    width: String,
    appendToBody: Boolean,
    destroyOnClose: Boolean,
    closeOnClickModal: Boolean,
    showClose: Boolean,
    class: String,
  },
  emits: ["update:modelValue"],
  template: `<div class="el-dialog-stub" v-if="modelValue"><slot /></div>`,
});

// ── 挂载辅助 ──────────────────────────────────────────────────────────────────

interface EmittedMap {
  confirm: unknown[][];
  cancel: unknown[][];
  "update:modelValue": unknown[][];
}

function mountInputDialog(props: Record<string, unknown> = {}): {
  el: HTMLElement;
  app: App;
  emitted: EmittedMap;
  unmount: () => void;
} {
  const emitted: EmittedMap = {
    confirm: [],
    cancel: [],
    "update:modelValue": [],
  };

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(InputDialog, {
    modelValue: true,
    title: "输入标题",
    onConfirm: (value: string) => emitted.confirm.push([value]),
    onCancel: () => emitted.cancel.push([]),
    "onUpdate:modelValue": (v: boolean) =>
      emitted["update:modelValue"].push([v]),
    ...props,
  });

  app.component("el-dialog", ElDialogStub);
  app.mount(el);

  return {
    el,
    app,
    emitted,
    unmount: () => {
      app.unmount();
      if (document.body.contains(el)) document.body.removeChild(el);
    },
  };
}

// ── 清理 ─────────────────────────────────────────────────────────────────────

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: Record<string, unknown> = {}) {
  const result = mountInputDialog(props);
  cleanups.push(result.unmount);
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("InputDialog.vue", () => {
  // ── 初始渲染 ────────────────────────────────────────────────────────────────

  describe("初始渲染", () => {
    it("modelValue=true 时 el-dialog stub 可见", () => {
      const { el } = mount({ modelValue: true });
      expect(el.querySelector(".el-dialog-stub")).not.toBeNull();
    });

    it("modelValue=false 时 el-dialog stub 不渲染", () => {
      const { el } = mount({ modelValue: false });
      expect(el.querySelector(".el-dialog-stub")).toBeNull();
    });

    it("默认 placeholder 为 '请输入'", () => {
      const { el } = mount({ modelValue: true });
      const input = el.querySelector<HTMLInputElement>("input");
      expect(input?.getAttribute("placeholder")).toBe("请输入");
    });

    it("自定义 placeholder 生效", () => {
      const { el } = mount({ modelValue: true, placeholder: "请输入名称" });
      const input = el.querySelector<HTMLInputElement>("input");
      expect(input?.getAttribute("placeholder")).toBe("请输入名称");
    });

    it("defaultValue 作为 input 初始值", () => {
      const { el } = mount({ modelValue: true, defaultValue: "初始值" });
      const input = el.querySelector<HTMLInputElement>("input");
      expect(input?.value).toBe("初始值");
    });

    it("description 存在时渲染到 DOM", () => {
      const { el } = mount({
        modelValue: true,
        description: "请填写有效的名称",
      });
      expect(el.textContent).toContain("请填写有效的名称");
    });

    it("label 存在时渲染到 DOM", () => {
      const { el } = mount({ modelValue: true, label: "名称" });
      expect(el.textContent).toContain("名称");
    });

    it("默认 cancelText 为 '取消'", () => {
      const { el } = mount({ modelValue: true });
      const btn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      expect(btn?.textContent?.trim()).toBe("取消");
    });

    it("默认 confirmText 为 '确认'", () => {
      const { el } = mount({ modelValue: true });
      const btn = el.querySelector<HTMLButtonElement>(".btn-primary");
      expect(btn?.textContent?.trim()).toBe("确认");
    });
  });

  // ── handleConfirm（无 validator）─────────────────────────────────────────

  describe("handleConfirm — 无 inputValidator", () => {
    it("点击确认 → emit confirm 并携带输入值", async () => {
      const { el, emitted } = mount({
        modelValue: true,
        defaultValue: "hello",
      });
      const confirmBtn = el.querySelector<HTMLButtonElement>(".btn-primary");
      confirmBtn?.click();
      await nextTick();
      expect(emitted.confirm.length).toBe(1);
      expect(emitted.confirm[0][0]).toBe("hello");
    });

    it("按 Enter 键触发 handleConfirm", async () => {
      const { el, emitted } = mount({
        modelValue: true,
        defaultValue: "enter-test",
      });
      const input = el.querySelector<HTMLInputElement>("input");
      const event = new KeyboardEvent("keyup", { key: "Enter", bubbles: true });
      input?.dispatchEvent(event);
      await nextTick();
      expect(emitted.confirm.length).toBe(1);
      expect(emitted.confirm[0][0]).toBe("enter-test");
    });
  });

  // ── handleConfirm（有 validator）─────────────────────────────────────────

  describe("handleConfirm — 有 inputValidator", () => {
    it("validator 返回 true 时 emit confirm", async () => {
      const { el, emitted } = mount({
        modelValue: true,
        defaultValue: "valid",
        inputValidator: (v: string) => v.length > 0,
      });
      const confirmBtn = el.querySelector<HTMLButtonElement>(".btn-primary");
      confirmBtn?.click();
      await nextTick();
      expect(emitted.confirm.length).toBe(1);
    });

    it("validator 返回 false 时不 emit confirm，显示默认错误信息", async () => {
      const { el, emitted } = mount({
        modelValue: true,
        defaultValue: "",
        inputValidator: (_v: string) => false,
      });
      const confirmBtn = el.querySelector<HTMLButtonElement>(".btn-primary");
      confirmBtn?.click();
      await nextTick();
      expect(emitted.confirm.length).toBe(0);
      // 错误信息出现
      const errSpan = el.querySelector(".error-message");
      expect(errSpan).not.toBeNull();
    });

    it("validator 返回字符串时显示该字符串为错误信息", async () => {
      const { el } = mount({
        modelValue: true,
        defaultValue: "bad",
        inputValidator: (_v: string) => "自定义错误",
      });
      const confirmBtn = el.querySelector<HTMLButtonElement>(".btn-primary");
      confirmBtn?.click();
      await nextTick();
      expect(el.textContent).toContain("自定义错误");
    });
  });

  // ── handleInput — 有错误时触发 validate ────────────────────────────────────

  describe("handleInput — 有错误时触发 validate", () => {
    it("先出错再改为有效输入，错误信息消失", async () => {
      const { el } = mount({
        modelValue: true,
        defaultValue: "",
        inputValidator: (v: string) => (v.length > 0 ? true : "不能为空"),
      });

      // 先触发确认，产生错误
      const confirmBtn = el.querySelector<HTMLButtonElement>(".btn-primary");
      confirmBtn?.click();
      await nextTick();
      expect(el.querySelector(".error-message")).not.toBeNull();

      // 输入有效值后触发 input 事件
      const input = el.querySelector<HTMLInputElement>("input");
      if (input) {
        // 直接设置 value 并派发 input 事件
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )?.set?.call(input, "valid");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await nextTick();
      // 错误信息应消失
      expect(el.querySelector(".error-message")).toBeNull();
    });
  });

  // ── handleCancel ────────────────────────────────────────────────────────────

  describe("handleCancel", () => {
    it("点击取消 → emit cancel", async () => {
      const { el, emitted } = mount({ modelValue: true });
      const cancelBtn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      cancelBtn?.click();
      await nextTick();
      expect(emitted.cancel.length).toBe(1);
    });

    it("点击取消 → emit update:modelValue=false", async () => {
      const { el, emitted } = mount({ modelValue: true });
      const cancelBtn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      cancelBtn?.click();
      await nextTick();
      expect(
        emitted["update:modelValue"].some((args) => args[0] === false)
      ).toBe(true);
    });
  });

  // ── watch: props.modelValue → visible ──────────────────────────────────────

  describe("watch: props.modelValue 响应式同步", () => {
    it("modelValue 由 true → false → el-dialog 隐藏", async () => {
      const visible = ref(true);

      const Parent = defineComponent({
        components: { InputDialog },
        setup() {
          return { visible };
        },
        template: `<InputDialog :modelValue="visible" title="test" />`,
      });

      const el = document.createElement("div");
      document.body.appendChild(el);
      const app = createApp(Parent);
      app.component("el-dialog", ElDialogStub);
      app.mount(el);
      cleanups.push(() => {
        app.unmount();
        if (document.body.contains(el)) document.body.removeChild(el);
      });

      expect(el.querySelector(".el-dialog-stub")).not.toBeNull();

      visible.value = false;
      await nextTick();

      expect(el.querySelector(".el-dialog-stub")).toBeNull();
    });

    it("modelValue 由 false → true 时 input 重置为 defaultValue", async () => {
      const visible = ref(false);

      const Parent = defineComponent({
        components: { InputDialog },
        setup() {
          return { visible };
        },
        template: `<InputDialog :modelValue="visible" defaultValue="默认值" title="t" />`,
      });

      const el = document.createElement("div");
      document.body.appendChild(el);
      const app = createApp(Parent);
      app.component("el-dialog", ElDialogStub);
      app.mount(el);
      cleanups.push(() => {
        app.unmount();
        if (document.body.contains(el)) document.body.removeChild(el);
      });

      visible.value = true;
      await nextTick();

      const input = el.querySelector<HTMLInputElement>("input");
      expect(input?.value).toBe("默认值");
    });
  });
});
