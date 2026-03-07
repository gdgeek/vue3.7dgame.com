import { describe, it, expect } from "vitest";
import { subject } from "@casl/ability";
import { ability } from "@/ability";

describe("src/ability.ts round15", () => {
  it("allows read on Article", () => {
    expect(ability.can("read", "Article")).toBe(true);
  });

  it("allows read on Article subject instance", () => {
    expect(ability.can("read", subject("Article", { authorId: 2 }))).toBe(true);
  });

  it("allows create when authorId is 1", () => {
    expect(ability.can("create", subject("Article", { authorId: 1 }))).toBe(true);
  });

  it("rejects create when authorId is 2", () => {
    expect(ability.can("create", subject("Article", { authorId: 2 }))).toBe(false);
  });

  it("rejects create when authorId missing", () => {
    expect(ability.can("create", subject("Article", {}))).toBe(false);
  });

  it("rejects delete on Article", () => {
    expect(ability.can("delete", "Article")).toBe(false);
  });

  it("rejects update on Article", () => {
    expect(ability.can("update", "Article")).toBe(false);
  });

  it("rejects read on unknown subject", () => {
    expect(ability.can("read", "Unknown")).toBe(false);
  });
});
