import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { mountComponent, flushAll, type MountResult } from "./_helpers";

// ---------------------------------------------------------------------------
// Mock vue-router
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
let mockQueryTab: string | undefined = undefined;

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockQueryTab ? { tab: mockQueryTab } : {} })),
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));

// ---------------------------------------------------------------------------
// Mock async sub-components.
//
// defineAsyncComponent resolves the loader's Promise to a module object.
// Vue checks `module.__esModule || module[Symbol.toStringTag] === 'Module'`
// to decide whether to unwrap `module.default`. Without __esModule, Vue
// passes the raw Vitest proxy to createVNode, which then accesses
// __v_isVNode on the proxy → Vitest's strict proxy throws.
//
// Fix: always include __esModule: true so Vue unwraps .default correctly.
// ---------------------------------------------------------------------------

vi.mock(
  "@/views/privacy-policy/components/PrivacyPolicyTab.vue",
  async () => {
    const { defineComponent } = await import("vue");
    return {
      __esModule: true,
      default: defineComponent({
        name: "PrivacyPolicyTab",
        template: '<div data-testid="privacy-tab">隐私政策内容</div>',
      }),
    };
  },
);

vi.mock(
  "@/views/privacy-policy/components/TermsOfServiceTab.vue",
  async () => {
    const { defineComponent } = await import("vue");
    return {
      __esModule: true,
      default: defineComponent({
        name: "TermsOfServiceTab",
        template: '<div data-testid="terms-tab">服务条款内容</div>',
      }),
    };
  },
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function mountIndex(tab?: string): Promise<MountResult> {
  mockQueryTab = tab;
  const { default: IndexVue } = await import(
    "@/views/privacy-policy/index.vue"
  );
  const result = await mountComponent(IndexVue);
  // Let defineAsyncComponent resolve + keep-alive settle
  await flushAll();
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PrivacyPolicy index.vue", () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Render integrity
  // -------------------------------------------------------------------------

  it("mounts without errors and produces non-empty HTML", async () => {
    const r = await mountIndex();
    expect(r.el.innerHTML.length).toBeGreaterThan(0);
    r.unmount();
  });

  it("renders the tab navigation with two panes", async () => {
    const r = await mountIndex();
    const panes = r.el.querySelectorAll('[data-stub="ElTabPane"]');
    expect(panes.length).toBe(2);

    const labels = Array.from(panes).map(
      (n) => (n as HTMLElement).dataset.label,
    );
    expect(labels).toContain("隐私政策");
    expect(labels).toContain("服务条款");
    r.unmount();
  });

  // -------------------------------------------------------------------------
  // activeTab initial state — checked via ElTabs v-model (data-value)
  // -------------------------------------------------------------------------

  it("activeTab defaults to 'privacy' when no query param", async () => {
    const r = await mountIndex();
    const tabs = r.el.querySelector('[data-stub="ElTabs"]') as HTMLElement;
    // The stub exposes modelValue via data-label attribute
    // We inspect the rendered component instead: privacy-tab must be present
    await flushAll();
    expect(r.el.querySelector('[data-testid="privacy-tab"]')).not.toBeNull();
    r.unmount();
  });

  it("activeTab is 'terms' when route.query.tab === 'terms'", async () => {
    const r = await mountIndex("terms");
    await flushAll();
    expect(r.el.querySelector('[data-testid="terms-tab"]')).not.toBeNull();
    r.unmount();
  });

  // -------------------------------------------------------------------------
  // Tab visibility mutual exclusion
  // -------------------------------------------------------------------------

  it("does NOT show terms tab when no query param", async () => {
    const r = await mountIndex();
    await flushAll();
    expect(r.el.querySelector('[data-testid="terms-tab"]')).toBeNull();
    r.unmount();
  });

  it("does NOT show privacy tab when route.query.tab === 'terms'", async () => {
    const r = await mountIndex("terms");
    await flushAll();
    expect(r.el.querySelector('[data-testid="privacy-tab"]')).toBeNull();
    r.unmount();
  });

  it("shows privacy tab when route.query.tab === 'privacy'", async () => {
    const r = await mountIndex("privacy");
    await flushAll();
    expect(r.el.querySelector('[data-testid="privacy-tab"]')).not.toBeNull();
    r.unmount();
  });

  // -------------------------------------------------------------------------
  // handleTabClick → router.replace
  // -------------------------------------------------------------------------

  it("handleTabClick calls router.replace with 'privacy' query by default", async () => {
    const r = await mountIndex();
    const tabs = r.el.querySelector('[data-stub="ElTabs"]') as HTMLElement;

    tabs.dispatchEvent(new CustomEvent("tab-click", { bubbles: true }));
    await nextTick();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ tab: "privacy" }),
      }),
    );
    r.unmount();
  });

  it("handleTabClick calls router.replace with 'terms' when terms is active", async () => {
    const r = await mountIndex("terms");
    const tabs = r.el.querySelector('[data-stub="ElTabs"]') as HTMLElement;

    tabs.dispatchEvent(new CustomEvent("tab-click", { bubbles: true }));
    await nextTick();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ tab: "terms" }),
      }),
    );
    r.unmount();
  });

  it("router.replace is called exactly once per tab-click", async () => {
    const r = await mountIndex();
    const tabs = r.el.querySelector('[data-stub="ElTabs"]') as HTMLElement;

    tabs.dispatchEvent(new CustomEvent("tab-click", { bubbles: true }));
    await nextTick();

    expect(mockReplace).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it("has exactly one ElTabs component in the DOM", async () => {
    const r = await mountIndex();
    const tabsCount = r.el.querySelectorAll('[data-stub="ElTabs"]').length;
    expect(tabsCount).toBe(1);
    r.unmount();
  });

  it("unknown query tab falls back to showing privacy tab", async () => {
    const r = await mountIndex("unknown-tab");
    await flushAll();
    // activeTab defaults to 'privacy' for unknown values
    expect(r.el.querySelector('[data-testid="privacy-tab"]')).not.toBeNull();
    r.unmount();
  });

  it("router.replace is not called on initial mount without tab-click", async () => {
    const r = await mountIndex();
    await flushAll();
    expect(mockReplace).not.toHaveBeenCalled();
    r.unmount();
  });
});
