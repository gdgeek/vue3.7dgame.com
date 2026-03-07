/**
 * Unit tests for src/components/Meta/useUnsavedChanges.ts
 * Covers: initial state, watch-based dirty detection, markSaved
 */
import { describe, it, expect } from "vitest";
import { ref, nextTick } from "vue";
import { useUnsavedChanges } from "@/components/Meta/useUnsavedChanges";

describe("useUnsavedChanges", () => {
  it("hasUnsavedChanges starts as false", () => {
    const content = ref("hello");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "hello");
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("becomes true when content changes away from baseline", async () => {
    const content = ref("original");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "original");
    content.value = "modified";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("stays true when content continues to differ from baseline", async () => {
    const content = ref("A");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "A");
    content.value = "B";
    await nextTick();
    content.value = "C";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("becomes false when content matches baseline again", async () => {
    const content = ref("A");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "A");
    content.value = "B";
    await nextTick();
    content.value = "A";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("markSaved() sets hasUnsavedChanges to false immediately", async () => {
    const content = ref("original");
    const { hasUnsavedChanges, markSaved } = useUnsavedChanges(content, () => "original");
    content.value = "changed";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
    markSaved();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("markSaved() can be called even when already clean (no-op)", () => {
    const content = ref("same");
    const { hasUnsavedChanges, markSaved } = useUnsavedChanges(content, () => "same");
    markSaved();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("baseline getter is called on each content change", async () => {
    const content = ref("v1");
    let callCount = 0;
    const getBaseline = () => { callCount++; return "baseline"; };
    useUnsavedChanges(content, getBaseline);
    content.value = "v2";
    await nextTick();
    content.value = "v3";
    await nextTick();
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it("handles empty string baseline correctly", async () => {
    const content = ref("");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "");
    content.value = "a";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("returns both hasUnsavedChanges and markSaved from the composable", () => {
    const content = ref("x");
    const result = useUnsavedChanges(content, () => "x");
    expect(result).toHaveProperty("hasUnsavedChanges");
    expect(result).toHaveProperty("markSaved");
    expect(typeof result.markSaved).toBe("function");
  });
});
