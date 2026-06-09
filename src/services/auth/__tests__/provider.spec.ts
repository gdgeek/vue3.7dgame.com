import { describe, expect, it } from "vitest";

import { normalizeAuthProvider } from "../provider";

describe("auth provider", () => {
  it("defaults missing and unsupported values to legacy", () => {
    expect(normalizeAuthProvider()).toBe("legacy");
    expect(normalizeAuthProvider("")).toBe("legacy");
    expect(normalizeAuthProvider("unknown")).toBe("legacy");
  });

  it("accepts identity and trims case-insensitively", () => {
    expect(normalizeAuthProvider(" identity ")).toBe("identity");
    expect(normalizeAuthProvider("IDENTITY")).toBe("identity");
  });
});
