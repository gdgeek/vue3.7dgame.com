/**
 * Unit tests for src/components/Hamburger/index.vue
 * 使用 Vue createApp 方式挂载（项目未安装 @vue/test-utils）
 * 通过 onToggleClick prop 捕获 emit，通过 DOM 事件触发 click
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createApp,
  reactive,
  nextTick,
  defineComponent,
  type App,
} from "vue";
import Hamburger from "@/components/Hamburger/index.vue";

// ── font-awesome-icon stub ────────────────────────────────────────────────────

/**
 * 将 icon prop[1]（图标名称）暴露为 data-icon 属性以便断言
 */
const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: { icon: { type: Array, default: () => [] } },
  template: '<span class="fa-stub" :data-icon="icon && icon[1] ? icon[1] : \'\'"></span>',
});

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

interface MountResult {
  el: HTMLElement;
  app: App;
  onToggleClick: ReturnType<typeof vi.fn>;
  unmount: () => void;
}

function mountHamburger(props: { isActive: boolean }): MountResult {
  const el = document.createElement("div");
  const onToggleClick = vi.fn();
  const app = createApp(Hamburger, {
    ...props,
    onToggleClick, // Vue 3 通过 onXxx prop 接收 emit 事件
  });
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);
  return { el, app, onToggleClick, unmount: () => app.unmount() };
}

/** 创建支持响应式 isActive 的包装组件 */
function mountReactive(initialIsActive: boolean) {
  const state = reactive({ isActive: initialIsActive });
  const onToggleClick = vi.fn();
  const Wrapper = defineComponent({
    components: { Hamburger, FontAwesomeIcon: FontAwesomeIconStub },
    setup: () => ({ state, onToggleClick }),
    template: `<Hamburger :is-active="state.isActive" @toggle-click="onToggleClick" />`,
  });
  const el = document.createElement("div");
  const app = createApp(Wrapper);
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);
  return { el, state, onToggleClick, app, unmount: () => app.unmount() };
}

// 清理注册
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: { isActive: boolean }): MountResult {
  const result = mountHamburger(props);
  cleanups.push(result.unmount);
  return result;
}

describe("Hamburger", () => {
  // ── DOM 结构 ──────────────────────────────────────────────────────────────

  it("渲染外层 div 容器", () => {
    const { el } = mount({ isActive: false });
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("渲染 fa-stub（font-awesome-icon 替身）", () => {
    const { el } = mount({ isActive: false });
    expect(el.querySelector(".fa-stub")).not.toBeNull();
  });

  // ── isActive prop → 图标名称 ──────────────────────────────────────────────

  it("isActive=false 时显示 'indent' 图标", () => {
    const { el } = mount({ isActive: false });
    const icon = el.querySelector(".fa-stub")!.getAttribute("data-icon");
    expect(icon).toBe("indent");
  });

  it("isActive=true 时显示 'outdent' 图标", () => {
    const { el } = mount({ isActive: true });
    const icon = el.querySelector(".fa-stub")!.getAttribute("data-icon");
    expect(icon).toBe("outdent");
  });

  it("isActive 从 false 切换为 true 时图标响应式更新", async () => {
    const { el, state, unmount } = mountReactive(false);
    cleanups.push(unmount);

    expect(el.querySelector(".fa-stub")!.getAttribute("data-icon")).toBe(
      "indent"
    );

    state.isActive = true;
    await nextTick();

    expect(el.querySelector(".fa-stub")!.getAttribute("data-icon")).toBe(
      "outdent"
    );
  });

  it("isActive 从 true 切换为 false 时图标还原", async () => {
    const { el, state, unmount } = mountReactive(true);
    cleanups.push(unmount);

    expect(el.querySelector(".fa-stub")!.getAttribute("data-icon")).toBe(
      "outdent"
    );

    state.isActive = false;
    await nextTick();

    expect(el.querySelector(".fa-stub")!.getAttribute("data-icon")).toBe(
      "indent"
    );
  });

  // ── 点击事件 → emit ───────────────────────────────────────────────────────

  it("点击容器时 onToggleClick 被调用", async () => {
    const { el, onToggleClick } = mount({ isActive: false });
    el.querySelector("div")!.click();
    await nextTick();
    expect(onToggleClick).toHaveBeenCalled();
  });

  it("单次点击后 onToggleClick 仅调用一次", async () => {
    const { el, onToggleClick } = mount({ isActive: false });
    el.querySelector("div")!.click();
    await nextTick();
    expect(onToggleClick).toHaveBeenCalledTimes(1);
  });

  it("多次点击时 onToggleClick 调用对应次数", async () => {
    const { el, onToggleClick } = mount({ isActive: false });
    el.querySelector("div")!.click();
    el.querySelector("div")!.click();
    el.querySelector("div")!.click();
    await nextTick();
    expect(onToggleClick).toHaveBeenCalledTimes(3);
  });

  it("isActive=true 时点击同样触发 onToggleClick", async () => {
    const { el, onToggleClick } = mount({ isActive: true });
    el.querySelector("div")!.click();
    await nextTick();
    expect(onToggleClick).toHaveBeenCalled();
  });

  it("通过响应式包装组件也能正常接收 emit", async () => {
    const { el, onToggleClick, unmount } = mountReactive(false);
    cleanups.push(unmount);

    el.querySelector("div")!.click();
    await nextTick();
    expect(onToggleClick).toHaveBeenCalled();
  });

  // ── 外层容器 class 验证 ───────────────────────────────────────────────────

  it("外层 div 包含 flex 布局相关 class", () => {
    const { el } = mount({ isActive: false });
    const cls = el.querySelector("div")!.className;
    expect(cls).toMatch(/flex|px|items|justify/);
  });
});
