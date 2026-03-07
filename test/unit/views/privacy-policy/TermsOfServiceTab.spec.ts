import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountComponent, textContents, type MountResult } from "./_helpers";

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

describe("TermsOfServiceTab", () => {
  let result: MountResult;

  beforeEach(async () => {
    const { default: TermsOfServiceTab } = await import(
      "@/views/privacy-policy/components/TermsOfServiceTab.vue"
    );
    result = await mountComponent(TermsOfServiceTab);
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

  it("renders h1 with title '服务条款'", () => {
    const h1 = result.el.querySelector("h1");
    expect(h1?.textContent?.trim()).toBe("服务条款");
  });

  it("renders version '1.2.0'", () => {
    const version = result.el.querySelector(".version");
    expect(version?.textContent).toContain("1.2.0");
  });

  it("renders effective date '2024年8月15日'", () => {
    const date = result.el.querySelector(".update-time");
    expect(date?.textContent).toContain("2024年8月15日");
  });

  // -------------------------------------------------------------------------
  // Section headings (8 sections)
  // -------------------------------------------------------------------------

  it("renders all 8 section h2 headings", () => {
    const headings = textContents(result.el, "h2");
    expect(headings).toContain("引言");
    expect(headings).toContain("1. 服务说明");
    expect(headings).toContain("2. 账户管理");
    expect(headings).toContain("3. 内容规范");
    expect(headings).toContain("4. 免责声明");
    expect(headings).toContain("5. 争议解决");
    expect(headings).toContain("6. 其他条款");
    expect(headings).toContain("7. 联系我们");
  });

  // -------------------------------------------------------------------------
  // Collapse items per section
  // -------------------------------------------------------------------------

  it("section 服务说明 has 2 collapse items (1.1–1.2)", () => {
    const section = result.el.querySelector("section.terms-service");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(2);
  });

  it("section 账户管理 has 2 collapse items (2.1–2.2)", () => {
    const section = result.el.querySelector("section.terms-account");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(2);
  });

  it("section 内容规范 has 2 collapse items (3.1–3.2)", () => {
    const section = result.el.querySelector("section.terms-content");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(2);
  });

  it("section 免责声明 has 2 collapse items (4.1–4.2)", () => {
    const section = result.el.querySelector("section.terms-liability");
    expect(section).not.toBeNull();
    const items = section!.querySelectorAll('[data-stub="ElCollapseItem"]');
    expect(items.length).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Non-collapse sections
  // -------------------------------------------------------------------------

  it("section 争议解决 renders its right-content block", () => {
    const section = result.el.querySelector("section.terms-disputes");
    expect(section).not.toBeNull();
    expect(section!.querySelector(".right-content")).not.toBeNull();
  });

  it("section 其他条款 renders its right-content block", () => {
    const section = result.el.querySelector("section.terms-other");
    expect(section).not.toBeNull();
    expect(section!.querySelector(".right-content")).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Contact section
  // -------------------------------------------------------------------------

  it("renders the contact section with descriptions", () => {
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
  // Content spot-checks
  // -------------------------------------------------------------------------

  it("section 服务说明 mentions AR/VR and Rokid", () => {
    const section = result.el.querySelector("section.terms-service");
    expect(section?.textContent).toContain("AR/VR");
    expect(section?.textContent).toContain("Rokid");
  });

  it("section 账户管理 mentions '未成年人'", () => {
    const section = result.el.querySelector("section.terms-account");
    expect(section?.textContent).toContain("未成年人");
  });

  it("section 内容规范 mentions '知识产权'", () => {
    const section = result.el.querySelector("section.terms-content");
    expect(section?.textContent).toContain("知识产权");
  });

  it("section 免责声明 mentions '12个月'", () => {
    const section = result.el.querySelector("section.terms-liability");
    expect(section?.textContent).toContain("12个月");
  });

  it("section 争议解决 mentions '上海市徐汇区人民法院'", () => {
    const section = result.el.querySelector("section.terms-disputes");
    expect(section?.textContent).toContain("上海市徐汇区人民法院");
  });
});
