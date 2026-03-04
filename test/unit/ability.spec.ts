/**
 * Unit tests for src/ability.ts
 *
 * 覆盖：
 *   - ability 允许对 Article 执行 read（无条件）
 *   - ability 允许 authorId === 1 的用户 create Article
 *   - ability 拒绝 authorId !== 1 的用户 create Article
 *   - ability 拒绝未声明的动作（delete、update 等）
 */
import { describe, it, expect } from "vitest";
import { subject } from "@casl/ability";
import { ability } from "@/ability";

describe("ability (src/ability.ts)", () => {
  // ── read ──────────────────────────────────────────────────────────────────

  describe("read Article", () => {
    it("允许对 Article 执行 read（无条件）", () => {
      expect(ability.can("read", "Article")).toBe(true);
    });

    it("允许对带属性的 Article 实例执行 read", () => {
      const article = subject("Article", { authorId: 99 });
      expect(ability.can("read", article)).toBe(true);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe("create Article", () => {
    it("当 authorId === 1 时允许 create Article", () => {
      const article = subject("Article", { authorId: 1 });
      expect(ability.can("create", article)).toBe(true);
    });

    it("当 authorId !== 1 时拒绝 create Article", () => {
      const article = subject("Article", { authorId: 2 });
      expect(ability.can("create", article)).toBe(false);
    });

    it("authorId 为 0 时拒绝 create Article", () => {
      const article = subject("Article", { authorId: 0 });
      expect(ability.can("create", article)).toBe(false);
    });

    it("未提供 authorId 时拒绝 create Article", () => {
      const article = subject("Article", {});
      expect(ability.can("create", article)).toBe(false);
    });
  });

  // ── 未声明动作 ────────────────────────────────────────────────────────────

  describe("未声明的动作", () => {
    it("拒绝对 Article 执行 delete", () => {
      expect(ability.can("delete", "Article")).toBe(false);
    });

    it("拒绝对 Article 执行 update", () => {
      expect(ability.can("update", "Article")).toBe(false);
    });

    it("拒绝对未知资源执行 read", () => {
      expect(ability.can("read", "Unknown")).toBe(false);
    });
  });
});
