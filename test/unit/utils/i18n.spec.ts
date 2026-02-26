/**
 * Unit tests for src/utils/i18n.ts — translateRouteTitle()
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lang/index", () => ({
  default: {
    global: {
      te: vi.fn(),
      t: vi.fn(),
      locale: { value: "zh-CN" },
    },
  },
}));

describe("translateRouteTitle()", () => {
  let i18n: { global: { te: ReturnType<typeof vi.fn>; t: ReturnType<typeof vi.fn> } };
  let translateRouteTitle: (title: string | undefined) => string;

  beforeEach(async () => {
    vi.clearAllMocks();
    i18n = (await import("@/lang/index")).default as never;
    ({ translateRouteTitle } = await import("@/utils/i18n"));
  });

  it("returns empty string when title is undefined", () => {
    expect(translateRouteTitle(undefined)).toBe("");
  });

  it("returns empty string when title is empty string", () => {
    expect(translateRouteTitle("")).toBe("");
  });

  it("returns translated title when i18n key exists", () => {
    i18n.global.te.mockReturnValue(true);
    i18n.global.t.mockReturnValue("首页");
    const result = translateRouteTitle("home");
    expect(result).toBe("首页");
  });

  it("returns original title when i18n key does not exist", () => {
    i18n.global.te.mockReturnValue(false);
    const result = translateRouteTitle("custom-page");
    expect(result).toBe("custom-page");
    expect(i18n.global.t).not.toHaveBeenCalled();
  });

  it("looks up key with 'route.' prefix", () => {
    i18n.global.te.mockReturnValue(false);
    translateRouteTitle("dashboard");
    expect(i18n.global.te).toHaveBeenCalledWith("route.dashboard");
  });

  it("translates with 'route.' prefix when key exists", () => {
    i18n.global.te.mockReturnValue(true);
    i18n.global.t.mockReturnValue("仪表盘");
    translateRouteTitle("dashboard");
    expect(i18n.global.t).toHaveBeenCalledWith("route.dashboard");
  });
});
