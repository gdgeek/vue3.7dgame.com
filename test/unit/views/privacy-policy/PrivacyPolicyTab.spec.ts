import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountComponent, textContents, type MountResult } from "./_helpers";

// vue-router is not used inside PrivacyPolicyTab, but imported transitively; stub it anyway
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

describe("PrivacyPolicyTab", () => {
  let result: MountResult;

  beforeEach(async () => {
    const { default: PrivacyPolicyTab } = await import(
      "@/views/privacy-policy/components/PrivacyPolicyTab.vue"
    );
    result = await mountComponent(PrivacyPolicyTab);
  });

  afterEach(() => {
    result.unmount();
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Render integrity
  // -------------------------------------------------------------------------

  it("mounts without errors and produces non-empty HTML", () => {
    expect(result.el.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders h1 with title '隐私政策'", () => {
    const h1 = result.el.querySelector("h1");
    expect(h1?.textContent?.trim()).toBe("隐私政策");
  });

  it("renders version '1.2.0'", () => {
    const version = result.el.querySelector(".version");
    expect(version?.textContent).toContain("1.2.0");
  });

  it("renders effective date '2025年4月16日'", () => {
    const date = result.el.querySelector(".update-time");
    expect(date?.textContent).toContain("2025年4月16日");
  });

  // -------------------------------------------------------------------------
  // Section headings (8 sections)
  // -------------------------------------------------------------------------

  it("renders all 8 section h2 headings", () => {
    const headings = textContents(result.el, "h2");
    expect(headings).toContain("引言");
    expect(headings).toContain("1. 信息收集");
    expect(headings).toContain("2. 信息使用");
    expect(headings).toContain("3. 信息保护");
    expect(headings).toContain("4. 您的权利");
    expect(headings).toContain("5. Cookie的使用");
    expect(headings).toContain("6. 联系我们");
    expect(headings).toContain("7. 政策更新");
  });

  // -------------------------------------------------------------------------
  // Collapse items per section
  // -------------------------------------------------------------------------

  it("section 信息收集 has 7 collapse items (1.1–1.7)", () => {
    const section = result.el.querySelector("section.info-collection");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(7);
  });

  it("section 信息使用 has 4 collapse items (2.1–2.4)", () => {
    const section = result.el.querySelector("section.info-usage");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(4);
  });

  it("section 信息保护 has 4 collapse items (3.1–3.4)", () => {
    const section = result.el.querySelector("section.info-protection");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(4);
  });

  it("section 您的权利 has 5 collapse items (4.1–4.5)", () => {
    const section = result.el.querySelector("section.user-rights");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Cookie table
  // -------------------------------------------------------------------------

  it("renders the Cookie section with a table element", () => {
    const section = result.el.querySelector("section.cookies");
    expect(section).not.toBeNull();
    const table = section!.querySelector('[data-stub="ElTable"]');
    expect(table).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Policy updates timeline
  // -------------------------------------------------------------------------

  it("renders the updates section with a timeline element", () => {
    const section = result.el.querySelector("section.updates");
    expect(section).not.toBeNull();
    const timeline = section!.querySelector('[data-stub="ElTimeline"]');
    expect(timeline).not.toBeNull();
  });

  it("renders 3 timeline items (one per policy version)", () => {
    const section = result.el.querySelector("section.updates");
    const items = section!.querySelectorAll('[data-stub="ElTimelineItem"]');
    expect(items.length).toBe(3);
  });

  it("timeline items carry the correct timestamps", () => {
    const items = result.el.querySelectorAll('[data-stub="ElTimelineItem"]');
    const timestamps = Array.from(items).map(
      (n) => (n as HTMLElement).dataset.ts
    );
    expect(timestamps).toContain("2025-04-16");
    expect(timestamps).toContain("2025-01-10");
    expect(timestamps).toContain("2024-11-05");
  });

  // -------------------------------------------------------------------------
  // Contact section
  // -------------------------------------------------------------------------

  it("renders the contact section", () => {
    const section = result.el.querySelector("section.contact");
    expect(section).not.toBeNull();
    expect(
      section!.querySelector('[data-stub="ElDescriptions"]')
    ).not.toBeNull();
  });

  it("contact section contains correct email address", () => {
    const section = result.el.querySelector("section.contact");
    expect(section?.textContent).toContain("contact@bujiaban.com");
  });

  // -------------------------------------------------------------------------
  // 信息收集 section content spot-checks
  // -------------------------------------------------------------------------

  it("section 信息收集 mentions '账户信息' and '传感器数据'", () => {
    const section = result.el.querySelector("section.info-collection");
    expect(section?.textContent).toContain("账户信息");
    expect(section?.textContent).toContain("传感器数据");
  });

  it("section 信息使用 mentions '混合现实功能支持'", () => {
    const section = result.el.querySelector("section.info-usage");
    expect(section?.textContent).toContain("混合现实功能支持");
  });

  it("section 信息保护 mentions '人脸数据保护'", () => {
    const section = result.el.querySelector("section.info-protection");
    expect(section?.textContent).toContain("人脸数据保护");
  });
});
