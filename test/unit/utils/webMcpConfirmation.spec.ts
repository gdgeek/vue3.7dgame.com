import { describe, expect, it } from "vitest";
import {
  formatBlockOperationResults,
  formatScriptWarnings,
  hasGeneratedScriptErrors,
} from "@/utils/webMcpConfirmation";
describe("WebMCP confirmations", () => {
  it("shows the target, operation and before/after field values", () => {
    const lines = formatBlockOperationResults([
      {
        op: "set_fields",
        blockId: "speed-block",
        blockType: "number",
        previousFields: { NUM: 1 },
        fields: { NUM: 60 },
      },
      { op: "delete", blockId: "old-flow", blockType: "event" },
    ]);
    expect(lines[0]).toContain("speed-block");
    expect(lines[0]).toContain("NUM: 1 → 60");
    expect(lines[1]).toContain("删除 event / old-flow");
  });
  it("preserves generated-code warnings and distinguishes runtime blockers", () => {
    const warnings = [
      { code: "invalid-generated-lua", message: "syntax error", blockId: "b1" },
    ];
    expect(formatScriptWarnings(warnings).join("\n")).toContain(
      "invalid-generated-lua b1：syntax error"
    );
    expect(hasGeneratedScriptErrors(warnings)).toBe(true);
    expect(
      hasGeneratedScriptErrors([
        { code: "disabled-block", message: "disabled" },
      ])
    ).toBe(false);
  });
});
