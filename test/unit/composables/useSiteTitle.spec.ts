import { describe, expect, it } from "vitest";
import { getSiteTitle, LOADING_SITE_TITLE } from "@/composables/useSiteTitle";

describe("useSiteTitle", () => {
  it("shows a loading title until domain information is available", () => {
    expect(getSiteTitle()).toBe(LOADING_SITE_TITLE);
    expect(getSiteTitle(null)).toBe(LOADING_SITE_TITLE);
    expect(getSiteTitle("")).toBe(LOADING_SITE_TITLE);
    expect(getSiteTitle("   ")).toBe(LOADING_SITE_TITLE);
  });

  it("uses the loaded domain title once it is available", () => {
    expect(getSiteTitle("  不加班AR创作平台  ")).toBe("不加班AR创作平台");
  });
});
