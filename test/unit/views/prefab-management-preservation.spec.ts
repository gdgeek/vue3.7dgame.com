import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Preservation Property Test (Property 2)
 *
 * Verifies that business logic and navigation behavior is preserved
 * after the StandardPage refactoring. These tests should PASS on both
 * unfixed and fixed code — any failure indicates a regression.
 */

const readSource = (relativePath: string): string =>
  readFileSync(`${process.cwd()}/src/${relativePath}`, "utf-8");

describe("Preservation: phototype/list.vue business logic", () => {
  const source = readSource("views/phototype/list.vue");

  it("should have addPrefab navigating to /phototype/edit", () => {
    expect(source).toContain('router.push("/phototype/edit")');
  });

  it("should have addPrefabFromPolygen navigating to /phototype/fromModel", () => {
    expect(source).toContain('router.push("/phototype/fromModel")');
  });

  it("should have edit(id) navigating to /phototype/edit with query id", () => {
    expect(source).toMatch(
      /router\.push\(\{.*path:\s*["']\/phototype\/edit["']/s
    );
    expect(source).toMatch(/query:\s*\{.*id/s);
  });

  it("should import and call deletePhototype for deletion", () => {
    expect(source).toContain("deletePhototype");
  });

  it("should import and call putPhototype for editing", () => {
    expect(source).toContain("putPhototype");
  });

  it("should have edit dialog with ImageSelector", () => {
    expect(source).toContain("ImageSelector");
    expect(source).toContain("editDialogVisible");
  });

  it("should have namedWindow function that populates editForm", () => {
    expect(source).toContain("namedWindow");
    expect(source).toContain("editForm");
  });

  it("should have saveEdit function that calls putPhototype", () => {
    expect(source).toContain("saveEdit");
    expect(source).toContain("putPhototype");
  });

  it("should have deletedWindow with confirm dialog", () => {
    expect(source).toContain("deletedWindow");
    expect(source).toMatch(/confirm/i);
  });

  it("should import getPhototypes API", () => {
    expect(source).toContain("getPhototypes");
  });
});

describe("Preservation: meta/prefabs.vue business logic", () => {
  const source = readSource("views/meta/prefabs.vue");

  it("should have addPrefab navigating to /meta-verse/prefab", () => {
    expect(source).toContain('router.push("/meta-verse/prefab")');
  });

  it("should have editor(id) navigating to /meta-verse/prefab with query id", () => {
    expect(source).toMatch(
      /router\.push\(\{.*path:\s*["']\/meta-verse\/prefab["']/s
    );
    expect(source).toMatch(/query:\s*\{.*id/s);
  });

  it("should have url(id) returning /meta-verse/prefab?id=", () => {
    expect(source).toContain("/meta-verse/prefab?id=");
  });

  it("should import and call deletePrefab for deletion", () => {
    expect(source).toContain("deletePrefab");
  });

  it("should have del function with confirm dialog", () => {
    expect(source).toContain("del");
    expect(source).toMatch(/confirm/i);
  });

  it("should have isRoot computed property for role-based access", () => {
    expect(source).toContain("isRoot");
    expect(source).toContain("useUserStore");
    expect(source).toMatch(/RoleEnum\.Root/);
  });

  it("should conditionally show actions based on isRoot", () => {
    expect(source).toMatch(/v-if=["']isRoot["']/);
  });

  it("should import getPrefabs API", () => {
    expect(source).toContain("getPrefabs");
  });
});
