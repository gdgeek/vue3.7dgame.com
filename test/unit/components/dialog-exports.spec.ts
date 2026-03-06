/**
 * Unit tests for src/components/Dialog/index.ts
 * Verifies that all named exports are properly re-exported.
 */
import { describe, it, expect, vi } from "vitest";

// Mock the Vue components to avoid rendering issues in jsdom
vi.mock("@/components/Dialog/InputDialog.vue", () => ({
  default: { name: "InputDialog" },
}));
vi.mock("@/components/Dialog/ConfirmDialog.vue", () => ({
  default: { name: "ConfirmDialog" },
}));
vi.mock("@/components/Dialog/message", () => ({
  default: { show: vi.fn() },
}));
vi.mock("@/components/Dialog/messageBox", () => ({
  default: { confirm: vi.fn() },
}));

describe("src/components/Dialog/index.ts – re-exports", () => {
  it("exports InputDialog", async () => {
    const mod = await import("@/components/Dialog/index");
    expect(mod.InputDialog).toBeDefined();
  });

  it("InputDialog is an object (Vue component)", async () => {
    const { InputDialog } = await import("@/components/Dialog/index");
    expect(typeof InputDialog).toBe("object");
  });

  it("exports ConfirmDialog", async () => {
    const mod = await import("@/components/Dialog/index");
    expect(mod.ConfirmDialog).toBeDefined();
  });

  it("ConfirmDialog is an object (Vue component)", async () => {
    const { ConfirmDialog } = await import("@/components/Dialog/index");
    expect(typeof ConfirmDialog).toBe("object");
  });

  it("exports Message", async () => {
    const mod = await import("@/components/Dialog/index");
    expect(mod.Message).toBeDefined();
  });

  it("exports MessageBox", async () => {
    const mod = await import("@/components/Dialog/index");
    expect(mod.MessageBox).toBeDefined();
  });

  it("has exactly 4 named exports", async () => {
    const mod = await import("@/components/Dialog/index");
    const keys = Object.keys(mod);
    expect(keys).toEqual(
      expect.arrayContaining(["InputDialog", "ConfirmDialog", "Message", "MessageBox"])
    );
  });
});
