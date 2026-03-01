/**
 * Unit tests for src/lib/utils.ts
 * Tests the cn() class name merging utility.
 */
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn() class name utility", () => {
  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (falsy values are ignored)", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    // twMerge deduplicates, e.g. p-2 overrides p-4
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object inputs (clsx syntax)", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("ignores null and undefined inputs", () => {
    expect(cn("foo", null, undefined, "bar")).toBe("foo bar");
  });

  it("merges arrays with conditional values", () => {
    const active = true;
    const disabled = false;
    expect(cn("btn", active && "btn-active", disabled && "btn-disabled")).toBe(
      "btn btn-active"
    );
  });

  it("deduplicates conflicting Tailwind text colors (last wins)", () => {
    // twMerge ensures only the last text color wins
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles mixed object and string inputs", () => {
    const result = cn("base", { extra: true, hidden: false }, "final");
    expect(result).toBe("base extra final");
  });

  it("returns empty string when all values in an object are false", () => {
    expect(cn({ a: false, b: false, c: false })).toBe("");
  });

  it("returns empty string when only falsy values are passed", () => {
    expect(cn(false as any, null, undefined, 0 as any)).toBe("");
  });

  it("handles an empty array input", () => {
    expect(cn([])).toBe("");
  });

  it("deduplicates conflicting Tailwind margin classes (last wins)", () => {
    const result = cn("m-4", "m-2");
    expect(result).toBe("m-2");
  });

  it("preserves order of non-conflicting classes", () => {
    const result = cn("a", "b", "c");
    expect(result).toBe("a b c");
  });

  it("handles nested arrays", () => {
    const result = cn(["a", ["b", "c"]]);
    expect(result).toBe("a b c");
  });

  it("deduplicates conflicting Tailwind padding classes (last wins)", () => {
    const result = cn("px-4", "px-2");
    expect(result).toBe("px-2");
  });
});
