/**
 * Unit tests for src/components/Dialog/ConfirmDialog.vue
 * 覆盖：visible ref、watch 回调、iconName/confirmBtnClass computed、
 *       handleConfirm、handleCancel
 *
 * 使用 createApp + jsdom 挂载（项目未安装 @vue/test-utils）。
 * el-dialog / font-awesome-icon 注册为轻量 stub。
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, nextTick, defineComponent, ref } from "vue";
import type { App } from "vue";
import ConfirmDialog from "@/components/Dialog/ConfirmDialog.vue";

// ── Stubs ─────────────────────────────────────────────────────────────────────

/** el-dialog stub：modelValue=true 时渲染默认插槽 */
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

const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: ["icon"],
  template: `<i class="fa-icon-stub" />`,
});

// ── 挂载辅助 ──────────────────────────────────────────────────────────────────

interface EmittedMap {
  confirm: unknown[][];
  cancel: unknown[][];
  "update:modelValue": unknown[][];
}

function mountConfirmDialog(props: Record<string, unknown> = {}): {
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

  const app = createApp(ConfirmDialog, {
    modelValue: true,
    message: "确认操作吗？",
    type: "warning",
    onConfirm: () => emitted.confirm.push([]),
    onCancel: () => emitted.cancel.push([]),
    "onUpdate:modelValue": (v: boolean) =>
      emitted["update:modelValue"].push([v]),
    ...props,
  });

  app.component("el-dialog", ElDialogStub);
  app.component("font-awesome-icon", FontAwesomeIconStub);
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
  const result = mountConfirmDialog(props);
  cleanups.push(result.unmount);
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ConfirmDialog.vue", () => {
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

    it("默认 cancelText 为 '取消'", () => {
      const { el } = mount({ modelValue: true });
      const btn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      expect(btn?.textContent?.trim()).toBe("取消");
    });

    it("自定义 cancelText 生效", () => {
      const { el } = mount({ modelValue: true, cancelText: "No" });
      const btn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      expect(btn?.textContent?.trim()).toBe("No");
    });

    it("message 文本出现在 DOM 中", () => {
      const { el } = mount({ modelValue: true, message: "删除后不可恢复" });
      expect(el.textContent).toContain("删除后不可恢复");
    });

    it("description 存在时渲染到 DOM", () => {
      const { el } = mount({
        modelValue: true,
        description: "详细描述内容",
      });
      expect(el.textContent).toContain("详细描述内容");
    });

    it("图标 stub 存在于 DOM", () => {
      const { el } = mount({ modelValue: true });
      expect(el.querySelector(".fa-icon-stub")).not.toBeNull();
    });
  });

  // ── confirmBtnClass computed ────────────────────────────────────────────────

  describe("confirmBtnClass computed", () => {
    it("type='danger' → 确认按钮有 btn-danger 类", () => {
      const { el } = mount({ modelValue: true, type: "danger" });
      const buttons = el.querySelectorAll("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      expect(confirmBtn?.classList.contains("btn-danger")).toBe(true);
    });

    it("type='warning' → 确认按钮有 btn-primary 类", () => {
      const { el } = mount({ modelValue: true, type: "warning" });
      const buttons = el.querySelectorAll("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      expect(confirmBtn?.classList.contains("btn-primary")).toBe(true);
    });

    it("type='info' → 确认按钮有 btn-primary 类", () => {
      const { el } = mount({ modelValue: true, type: "info" });
      const buttons = el.querySelectorAll("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      expect(confirmBtn?.classList.contains("btn-primary")).toBe(true);
    });

    it("type='success' → 确认按钮有 btn-primary 类", () => {
      const { el } = mount({ modelValue: true, type: "success" });
      const buttons = el.querySelectorAll("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      expect(confirmBtn?.classList.contains("btn-primary")).toBe(true);
    });
  });

  // ── iconName computed ───────────────────────────────────────────────────────

  describe("iconName computed — 各 type 渲染图标", () => {
    const types = ["warning", "danger", "info", "success"] as const;
    types.forEach((type) => {
      it(`type='${type}' 时图标 stub 存在`, () => {
        const { el } = mount({ modelValue: true, type });
        expect(el.querySelector(".fa-icon-stub")).not.toBeNull();
      });
    });
  });

  // ── handleConfirm ───────────────────────────────────────────────────────────

  describe("handleConfirm", () => {
    it("点击确认按钮 → emit confirm", async () => {
      const { el, emitted } = mount({ modelValue: true });
      const buttons = el.querySelectorAll<HTMLButtonElement>("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      confirmBtn?.click();
      await nextTick();
      expect(emitted.confirm.length).toBeGreaterThan(0);
    });

    it("自定义 confirmText 渲染到按钮", () => {
      const { el } = mount({ modelValue: true, confirmText: "Yes" });
      const buttons = el.querySelectorAll<HTMLButtonElement>("button");
      const confirmBtn = Array.from(buttons).find(
        (b) => !b.classList.contains("btn-secondary")
      );
      expect(confirmBtn?.textContent?.trim()).toBe("Yes");
    });
  });

  // ── handleCancel ────────────────────────────────────────────────────────────

  describe("handleCancel", () => {
    it("点击取消按钮 → emit cancel", async () => {
      const { el, emitted } = mount({ modelValue: true });
      const cancelBtn = el.querySelector<HTMLButtonElement>(".btn-secondary");
      cancelBtn?.click();
      await nextTick();
      expect(emitted.cancel.length).toBeGreaterThan(0);
    });

    it("点击取消按钮 → emit update:modelValue 为 false", async () => {
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
    it("modelValue 由 true → false 时 dialog 消失", async () => {
      const visible = ref(true);

      const Parent = defineComponent({
        components: { ConfirmDialog },
        setup() {
          return { visible };
        },
        template: `<ConfirmDialog :modelValue="visible" message="test" />`,
      });

      const el = document.createElement("div");
      document.body.appendChild(el);
      const app = createApp(Parent);
      app.component("el-dialog", ElDialogStub);
      app.component("font-awesome-icon", FontAwesomeIconStub);
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

    it("modelValue 由 false → true 时 dialog 重新出现", async () => {
      const visible = ref(false);

      const Parent = defineComponent({
        components: { ConfirmDialog },
        setup() {
          return { visible };
        },
        template: `<ConfirmDialog :modelValue="visible" message="test" />`,
      });

      const el = document.createElement("div");
      document.body.appendChild(el);
      const app = createApp(Parent);
      app.component("el-dialog", ElDialogStub);
      app.component("font-awesome-icon", FontAwesomeIconStub);
      app.mount(el);
      cleanups.push(() => {
        app.unmount();
        if (document.body.contains(el)) document.body.removeChild(el);
      });

      expect(el.querySelector(".el-dialog-stub")).toBeNull();

      visible.value = true;
      await nextTick();

      expect(el.querySelector(".el-dialog-stub")).not.toBeNull();
    });
  });
});
