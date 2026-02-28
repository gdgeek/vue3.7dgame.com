/**
 * Unit tests for src/utils/index.ts
 * Covers: hasClass, addClass, removeClass, isExternal
 */
import { describe, it, expect, beforeEach } from "vitest";
import { hasClass, addClass, removeClass, isExternal } from "@/utils/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEl(className = ""): HTMLElement {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

// ---------------------------------------------------------------------------
// hasClass
// ---------------------------------------------------------------------------
describe("hasClass()", () => {
  it("returns true when element has the class", () => {
    const el = makeEl("foo bar");
    expect(hasClass(el, "foo")).toBe(true);
  });

  it("returns true for a trailing class", () => {
    const el = makeEl("foo bar");
    expect(hasClass(el, "bar")).toBe(true);
  });

  it("returns false when element does not have the class", () => {
    const el = makeEl("foo bar");
    expect(hasClass(el, "baz")).toBe(false);
  });

  it("returns false for empty className", () => {
    const el = makeEl("");
    expect(hasClass(el, "foo")).toBe(false);
  });

  it("does not match partial class names", () => {
    const el = makeEl("foobar");
    expect(hasClass(el, "foo")).toBe(false);
  });

  it("returns true when element has only that class", () => {
    const el = makeEl("only");
    expect(hasClass(el, "only")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addClass
// ---------------------------------------------------------------------------
describe("addClass()", () => {
  it("adds a class to an element with no classes", () => {
    const el = makeEl("");
    addClass(el, "new-class");
    expect(el.className).toContain("new-class");
  });

  it("adds a class to an element that already has classes", () => {
    const el = makeEl("existing");
    addClass(el, "added");
    expect(el.className).toContain("existing");
    expect(el.className).toContain("added");
  });

  it("does not add a duplicate class", () => {
    const el = makeEl("already");
    addClass(el, "already");
    // Should not duplicate: count occurrences of 'already'
    const occurrences = el.className.split(" ").filter((c) => c === "already").length;
    expect(occurrences).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeClass
// ---------------------------------------------------------------------------
describe("removeClass()", () => {
  it("removes the specified class from the element", () => {
    const el = makeEl("foo bar");
    removeClass(el, "foo");
    expect(hasClass(el, "foo")).toBe(false);
  });

  it("keeps other classes after removal", () => {
    const el = makeEl("foo bar baz");
    removeClass(el, "bar");
    expect(hasClass(el, "foo")).toBe(true);
    expect(hasClass(el, "baz")).toBe(true);
  });

  it("does nothing when class is not present", () => {
    const el = makeEl("foo");
    const originalClass = el.className;
    removeClass(el, "nonexistent");
    expect(el.className).toBe(originalClass);
  });

  it("round-trip: add then remove restores absence", () => {
    const el = makeEl("base");
    addClass(el, "temp");
    expect(hasClass(el, "temp")).toBe(true);
    removeClass(el, "temp");
    expect(hasClass(el, "temp")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isExternal
// ---------------------------------------------------------------------------
describe("isExternal()", () => {
  it("returns true for https:// URLs", () => {
    expect(isExternal("https://example.com/page")).toBe(true);
  });

  it("returns true for http:// URLs", () => {
    expect(isExternal("http://example.com/page")).toBe(true);
  });

  it("returns true for mailto: links", () => {
    expect(isExternal("mailto:user@example.com")).toBe(true);
  });

  it("returns true for tel: links", () => {
    expect(isExternal("tel:+1234567890")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isExternal("/about")).toBe(false);
  });

  it("returns false for bare paths", () => {
    expect(isExternal("about")).toBe(false);
  });

  it("returns false for hash-only links", () => {
    expect(isExternal("#section")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isExternal("")).toBe(false);
  });
});
