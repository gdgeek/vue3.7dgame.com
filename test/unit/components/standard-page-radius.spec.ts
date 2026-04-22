import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string): string =>
  readFileSync(`${process.cwd()}/src/${relativePath}`, "utf-8");

const expectUsesCompactRadiusToken = (source: string) => {
  expect(source).toMatch(/var\(\s*--standard-page-max-radius/);
};

describe("StandardPage compact radius tokens", () => {
  it("defines a compact max radius token derived from radius-lg", () => {
    const source = readSource("styles/themes/parts/_global.scss");

    expect(source).toContain("--standard-page-max-radius");
    expect(source).toContain("calc(var(--radius-lg, 24px) / 3)");
  });

  it("PageActionBar uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/PageActionBar.vue");

    expectUsesCompactRadiusToken(source);
  });

  it("ResourceScopeFilter uses the compact max radius token", () => {
    const source = readSource(
      "components/StandardPage/ResourceScopeFilter.vue"
    );

    expectUsesCompactRadiusToken(source);
  });

  it("StandardCard uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/StandardCard.vue");

    expectUsesCompactRadiusToken(source);
  });

  it("DetailPanel uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/DetailPanel.vue");

    expectUsesCompactRadiusToken(source);
  });

  it("PageFilter uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/PageFilter.vue");

    expectUsesCompactRadiusToken(source);
  });

  it("PagePagination uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/PagePagination.vue");

    expectUsesCompactRadiusToken(source);
  });

  it("EmptyState uses the compact max radius token", () => {
    const source = readSource("components/StandardPage/EmptyState.vue");

    expectUsesCompactRadiusToken(source);
  });
});
