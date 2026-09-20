import { describe, it, expect } from "vitest";
import { resolveWebMcpDevEnabled } from "@/services/webmcp/dev-feature";
describe("deployment bridge switch", () => {
  it("is off by default and can be enabled per deployment", () => {
    expect(resolveWebMcpDevEnabled()).toBe(false);
    expect(resolveWebMcpDevEnabled("true", "false")).toBe(true);
    expect(resolveWebMcpDevEnabled("false", "true")).toBe(false);
    expect(resolveWebMcpDevEnabled(undefined, "true")).toBe(true);
    expect(resolveWebMcpDevEnabled("invalid", "true")).toBe(false);
  });
});
