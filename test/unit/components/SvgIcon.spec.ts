/**
 * Unit tests for src/components/SvgIcon/index.vue
 * 使用 Vue createApp 方式挂载（项目未安装 @vue/test-utils）
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, reactive, nextTick, defineComponent, type App } from "vue";
import SvgIcon from "@/components/SvgIcon/index.vue";

// ── 辅助函数 ─────────────────────────────────────────────────────────────────

interface MountResult {
  el: HTMLElement;
  app: App;
  unmount: () => void;
}

/** 挂载 SvgIcon 并返回容器 DOM 与 unmount 方法 */
function mountIcon(props: Record<string, unknown> = {}): MountResult {
  const el = document.createElement("div");
  const app = createApp(SvgIcon, props);
  app.mount(el);
  return { el, app, unmount: () => app.unmount() };
}

/** 创建响应式 props 包装组件，用于测试 prop 变化后的响应式更新 */
function mountReactive(initialProps: {
  prefix?: string;
  iconClass?: string;
  color?: string;
  size?: string;
}) {
  const state = reactive({ ...initialProps });
  const Wrapper = defineComponent({
    components: { SvgIcon },
    setup: () => ({ state }),
    template: `<SvgIcon
      :prefix="state.prefix"
      :iconClass="state.iconClass"
      :color="state.color"
      :size="state.size"
    />`,
  });
  const el = document.createElement("div");
  const app = createApp(Wrapper);
  app.mount(el);
  return { el, state, app, unmount: () => app.unmount() };
}

// 存储每个测试的 unmount 回调
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

// 快捷工具：挂载并记录清理
function mount(props: Record<string, unknown> = {}): MountResult {
  const result = mountIcon(props);
  cleanups.push(result.unmount);
  return result;
}

// ── xlink:href 获取工具 ───────────────────────────────────────────────────────
const getHref = (el: HTMLElement) =>
  el
    .querySelector("use")!
    .getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? "";

describe("SvgIcon", () => {
  // ── DOM 结构 ──────────────────────────────────────────────────────────────

  it("渲染 svg 元素", () => {
    const { el } = mount({ iconClass: "home" });
    expect(el.querySelector("svg")).not.toBeNull();
  });

  it("svg 元素有 aria-hidden='true'", () => {
    const { el } = mount({ iconClass: "home" });
    expect(el.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("svg 元素有 class 'svg-icon'", () => {
    const { el } = mount({ iconClass: "home" });
    expect(el.querySelector("svg")!.classList.contains("svg-icon")).toBe(true);
  });

  it("包含 use 子元素", () => {
    const { el } = mount({ iconClass: "home" });
    expect(el.querySelector("use")).not.toBeNull();
  });

  // ── symbolId 计算属性 ─────────────────────────────────────────────────────

  it("默认 prefix='icon' 时 xlink:href 为 #icon-home", () => {
    const { el } = mount({ iconClass: "home" });
    expect(getHref(el)).toBe("#icon-home");
  });

  it("自定义 prefix 时 xlink:href 为 #my-prefix-star", () => {
    const { el } = mount({ prefix: "my-prefix", iconClass: "star" });
    expect(getHref(el)).toBe("#my-prefix-star");
  });

  it("iconClass 为空时 xlink:href 以 '-' 结尾", () => {
    const { el } = mount({ prefix: "icon", iconClass: "" });
    expect(getHref(el)).toBe("#icon-");
  });

  it("iconClass 包含连字符时正确拼接", () => {
    const { el } = mount({ iconClass: "arrow-right" });
    expect(getHref(el)).toBe("#icon-arrow-right");
  });

  // ── size prop ─────────────────────────────────────────────────────────────

  it("默认 size='1em'：style 包含 width:1em 和 height:1em", () => {
    const { el } = mount({ iconClass: "home" });
    const style = el.querySelector("svg")!.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*1em/);
    expect(style).toMatch(/height:\s*1em/);
  });

  it("自定义 size='2rem'：style 包含 width:2rem 和 height:2rem", () => {
    const { el } = mount({ iconClass: "home", size: "2rem" });
    const style = el.querySelector("svg")!.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*2rem/);
    expect(style).toMatch(/height:\s*2rem/);
  });

  it("size='24px'：style 包含 width:24px 和 height:24px", () => {
    const { el } = mount({ iconClass: "home", size: "24px" });
    const style = el.querySelector("svg")!.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*24px/);
    expect(style).toMatch(/height:\s*24px/);
  });

  // ── color prop ────────────────────────────────────────────────────────────

  it("默认 color 为空时 fill 属性为空字符串", () => {
    const { el } = mount({ iconClass: "home" });
    const fill = el.querySelector("use")!.getAttribute("fill") ?? "";
    expect(fill).toBe("");
  });

  it("color='#ff0000' 时 fill 属性为 #ff0000", () => {
    const { el } = mount({ iconClass: "home", color: "#ff0000" });
    expect(el.querySelector("use")!.getAttribute("fill")).toBe("#ff0000");
  });

  it("color='blue' 时 fill 属性为 blue", () => {
    const { el } = mount({ iconClass: "home", color: "blue" });
    expect(el.querySelector("use")!.getAttribute("fill")).toBe("blue");
  });

  // ── 响应式更新 ────────────────────────────────────────────────────────────

  it("iconClass 变化时 xlink:href 响应式更新", async () => {
    const { el, state, unmount } = mountReactive({
      prefix: "icon",
      iconClass: "home",
    });
    cleanups.push(unmount);

    expect(getHref(el)).toBe("#icon-home");
    state.iconClass = "setting";
    await nextTick();
    expect(getHref(el)).toBe("#icon-setting");
  });

  it("prefix 变化时 xlink:href 响应式更新", async () => {
    const { el, state, unmount } = mountReactive({
      prefix: "icon",
      iconClass: "home",
    });
    cleanups.push(unmount);

    state.prefix = "new";
    await nextTick();
    expect(getHref(el)).toBe("#new-home");
  });

  it("size 变化时 style 响应式更新", async () => {
    const { el, state, unmount } = mountReactive({
      iconClass: "home",
      size: "1em",
    });
    cleanups.push(unmount);

    state.size = "3em";
    await nextTick();
    const style = el.querySelector("svg")!.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*3em/);
    expect(style).toMatch(/height:\s*3em/);
  });

  it("color 变化时 fill 响应式更新", async () => {
    const { el, state, unmount } = mountReactive({
      iconClass: "home",
      color: "red",
    });
    cleanups.push(unmount);

    state.color = "green";
    await nextTick();
    expect(el.querySelector("use")!.getAttribute("fill")).toBe("green");
  });

  // ── 综合场景 ──────────────────────────────────────────────────────────────

  it("所有 props 同时指定时渲染正确", () => {
    const { el } = mount({
      prefix: "custom",
      iconClass: "user",
      color: "#333",
      size: "24px",
    });

    const use = el.querySelector("use")!;
    const style = el.querySelector("svg")!.getAttribute("style") ?? "";

    expect(getHref(el)).toBe("#custom-user");
    expect(use.getAttribute("fill")).toBe("#333");
    expect(style).toMatch(/width:\s*24px/);
    expect(style).toMatch(/height:\s*24px/);
  });
});
