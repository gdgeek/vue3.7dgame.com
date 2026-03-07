/**
 * Unit tests for src/components/Meta/useUnsavedChanges.ts
 *
 * Tests reactive unsaved-change tracking: the watch responds when content
 * diverges from the baseline, and markSaved() resets the flag.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { useUnsavedChanges } from "../../../src/components/Meta/useUnsavedChanges";

describe("useUnsavedChanges", () => {
  it("hasUnsavedChanges starts as false", () => {
    const content = ref("hello");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "hello");
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("sets hasUnsavedChanges to true when content differs from baseline", async () => {
    const content = ref("original");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "original");

    content.value = "modified";
    await nextTick();

    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("sets hasUnsavedChanges to false when content matches baseline", async () => {
    const content = ref("original");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "original");

    content.value = "modified";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);

    content.value = "original";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("markSaved() resets hasUnsavedChanges to false", async () => {
    const content = ref("original");
    const { hasUnsavedChanges, markSaved } = useUnsavedChanges(
      content,
      () => "original"
    );

    content.value = "changed";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);

    markSaved();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("markSaved() is idempotent when already false", () => {
    const content = ref("same");
    const { hasUnsavedChanges, markSaved } = useUnsavedChanges(
      content,
      () => "same"
    );
    expect(hasUnsavedChanges.value).toBe(false);
    markSaved();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("uses dynamic baseline — getBaseline() is called on each watch", async () => {
    const content = ref("v1");
    let baseline = "v1";
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => baseline);

    // No change yet
    content.value = "v1";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);

    // Baseline moves forward too
    baseline = "v2";
    content.value = "v2";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);

    // Now content differs from new baseline
    content.value = "v3";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("detects changes on empty string content", async () => {
    const content = ref("");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "");

    content.value = " ";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("watch triggers on multiple sequential changes", async () => {
    const content = ref("a");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "a");

    content.value = "b";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);

    content.value = "a";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);

    content.value = "c";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
  });

  it("hasUnsavedChanges.value is a boolean", () => {
    const content = ref("x");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "x");
    expect(typeof hasUnsavedChanges.value).toBe("boolean");
  });

  it("content identical to baseline never triggers unsaved flag", async () => {
    const content = ref("same");
    const { hasUnsavedChanges } = useUnsavedChanges(content, () => "same");
    content.value = "same"; // no-op change
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(false);
  });

  it("markSaved after multiple changes resets flag exactly once", async () => {
    const content = ref("a");
    const { hasUnsavedChanges, markSaved } = useUnsavedChanges(
      content,
      () => "a"
    );
    content.value = "b";
    await nextTick();
    content.value = "c";
    await nextTick();
    expect(hasUnsavedChanges.value).toBe(true);
    markSaved();
    expect(hasUnsavedChanges.value).toBe(false);
    markSaved(); // idempotent
    expect(hasUnsavedChanges.value).toBe(false);
  });
});
