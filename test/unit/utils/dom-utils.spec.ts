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
  it("returns true when class exists alone", () => {
    expect(hasClass(makeEl("foo"), "foo")).toBe(true);
  });

  it("returns true when class is among multiple classes", () => {
    expect(hasClass(makeEl("foo bar baz"), "bar")).toBe(true);
  });

  it("returns false when class is absent", () => {
    expect(hasClass(makeEl("foo bar"), "qux")).toBe(false);
  });

  it("returns false for empty className", () => {
    expect(hasClass(makeEl(""), "foo")).toBe(false);
  });

  it("does not match partial class names", () => {
    expect(hasClass(makeEl("foobar"), "foo")).toBe(false);
  });

  it("matches class at the beginning", () => {
    expect(hasClass(makeEl("active disabled"), "active")).toBe(true);
  });

  it("matches class at the end", () => {
    expect(hasClass(makeEl("active disabled"), "disabled")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addClass
// ---------------------------------------------------------------------------
describe("addClass()", () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = makeEl();
  });

  it("adds a class to an element with no classes", () => {
    addClass(el, "foo");
    expect(el.className).toContain("foo");
  });

  it("does not add a duplicate class", () => {
    el.className = "foo";
    addClass(el, "foo");
    const count = el.className.split(" ").filter((c) => c === "foo").length;
    expect(count).toBe(1);
  });

  it("adds class alongside existing classes", () => {
    el.className = "existing";
    addClass(el, "new");
    expect(el.className).toContain("existing");
    expect(el.className).toContain("new");
  });

  it("result passes hasClass check", () => {
    addClass(el, "active");
    expect(hasClass(el, "active")).toBe(true);
  });

  it("adding multiple different classes results in all present", () => {
    addClass(el, "a");
    addClass(el, "b");
    expect(hasClass(el, "a")).toBe(true);
    expect(hasClass(el, "b")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeClass
// ---------------------------------------------------------------------------
describe("removeClass()", () => {
  it("removes a class from an element", () => {
    const el = makeEl("foo");
    removeClass(el, "foo");
    expect(hasClass(el, "foo")).toBe(false);
  });

  it("removes a class while preserving others", () => {
    const el = makeEl("foo bar baz");
    removeClass(el, "bar");
    expect(hasClass(el, "foo")).toBe(true);
    expect(hasClass(el, "bar")).toBe(false);
    expect(hasClass(el, "baz")).toBe(true);
  });

  it("does nothing if class is not present", () => {
    const el = makeEl("foo");
    expect(() => removeClass(el, "nonexistent")).not.toThrow();
    expect(hasClass(el, "foo")).toBe(true);
  });

  it("removes a class from the beginning of the list", () => {
    const el = makeEl("first second");
    removeClass(el, "first");
    expect(hasClass(el, "first")).toBe(false);
    expect(hasClass(el, "second")).toBe(true);
  });

  it("removes a class from the end of the list", () => {
    const el = makeEl("first second");
    removeClass(el, "second");
    expect(hasClass(el, "first")).toBe(true);
    expect(hasClass(el, "second")).toBe(false);
  });

  it("add → remove round-trip works correctly", () => {
    const el = makeEl();
    addClass(el, "toggle");
    expect(hasClass(el, "toggle")).toBe(true);
    removeClass(el, "toggle");
    expect(hasClass(el, "toggle")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isExternal
// ---------------------------------------------------------------------------
describe("isExternal()", () => {
  it("returns true for https:// URLs", () => {
    expect(isExternal("https://example.com")).toBe(true);
  });

  it("returns true for http:// URLs", () => {
    expect(isExternal("http://example.com")).toBe(true);
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

  it("returns false for router paths", () => {
    expect(isExternal("/home/dashboard")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isExternal("")).toBe(false);
  });

  it("returns false for paths without protocol", () => {
    expect(isExternal("example.com/path")).toBe(false);
  });

  it("handles mixed case protocols (regex is case-sensitive)", () => {
    // The regex uses lowercase http/https, so HTTPS:// won't match
    expect(isExternal("HTTPS://example.com")).toBe(false);
  });

  it("returns true for https:// with path and query", () => {
    expect(isExternal("https://api.example.com/v1/data?key=val")).toBe(true);
  });
});
