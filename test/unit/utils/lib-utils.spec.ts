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
});
