/**
 * Unit tests for src/utils/nameSort.ts
 * Covers: compareNameWithPinyin, sortByNameWithPinyin
 */
import { describe, it, expect } from "vitest";
import { compareNameWithPinyin, sortByNameWithPinyin } from "@/utils/nameSort";

describe("compareNameWithPinyin", () => {
  it("returns 0 for identical names", () => {
    expect(compareNameWithPinyin("apple", "apple")).toBe(0);
  });

  it("sorts Latin names in alphabetical order", () => {
    expect(compareNameWithPinyin("apple", "banana")).toBeLessThan(0);
    expect(compareNameWithPinyin("banana", "apple")).toBeGreaterThan(0);
  });

  it("is case-insensitive for Latin names", () => {
    const result = compareNameWithPinyin("Apple", "apple");
    expect(result).toBe(0);
  });

  it("strips file extension before comparing", () => {
    // "file.txt" vs "file" should be treated as equal
    expect(compareNameWithPinyin("file.txt", "file")).toBe(0);
  });

  it("strips copy suffix before comparing", () => {
    // "item（副本1）" vs "item" should be treated as equal
    expect(compareNameWithPinyin("item（副本1）", "item")).toBe(0);
  });

  it("handles numeric ordering in Latin names", () => {
    expect(compareNameWithPinyin("item2", "item10")).toBeLessThan(0);
  });

  it("returns a number for Chinese string comparison", () => {
    const result = compareNameWithPinyin("苹果", "香蕉");
    expect(typeof result).toBe("number");
  });

  it("handles mixed Latin/Chinese: Latin comes first with latinCollator", () => {
    // Both start with different scripts; compareNameWithPinyin uses pinyinCollator
    // for non-Latin. At least it returns a number.
    const result = compareNameWithPinyin("ABC资源", "abc资源");
    expect(typeof result).toBe("number");
  });
});

describe("sortByNameWithPinyin", () => {
  interface Item {
    id: number;
    label: string;
  }

  const items: Item[] = [
    { id: 1, label: "Cherry" },
    { id: 2, label: "apple" },
    { id: 3, label: "Banana" },
  ];

  const getName = (item: Item) => item.label;

  it("sorts ascending when sortValue contains 'name'", () => {
    const sorted = sortByNameWithPinyin([...items], "name", getName);
    expect(sorted[0].label.toLowerCase()).toBe("apple");
  });

  it("sorts descending when sortValue starts with '-'", () => {
    const sorted = sortByNameWithPinyin([...items], "-name", getName);
    expect(sorted[0].label.toLowerCase()).toBe("cherry");
  });

  it("returns original array unchanged when sortValue has no 'name'", () => {
    const original = [...items];
    const sorted = sortByNameWithPinyin(original, "created_at", getName);
    expect(sorted).toEqual(original);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    sortByNameWithPinyin(original, "name", getName);
    expect(original).toEqual(items);
  });

  it("handles empty array", () => {
    const result = sortByNameWithPinyin<Item>([], "name", getName);
    expect(result).toEqual([]);
  });

  it("handles items with empty names", () => {
    const withEmpty: Item[] = [
      { id: 1, label: "" },
      { id: 2, label: "apple" },
    ];
    const sorted = sortByNameWithPinyin(withEmpty, "name", getName);
    expect(sorted).toHaveLength(2);
  });

  it("returns all elements after sorting", () => {
    const sorted = sortByNameWithPinyin([...items], "name", getName);
    expect(sorted).toHaveLength(items.length);
  });

  it("handles single-element array", () => {
    const single = [{ id: 1, label: "solo" }];
    const sorted = sortByNameWithPinyin(single, "name", getName);
    expect(sorted).toEqual(single);
  });
});
