import { describe, expect, it } from "vitest";

import { normalizeDevProxyTarget } from "../../../build/dev-proxy-target";

describe("normalizeDevProxyTarget", () => {
  it("strips the path portion from absolute config API targets", () => {
    expect(normalizeDevProxyTarget("http://localhost:8088/api")).toBe(
      "http://localhost:8088"
    );
  });

  it("keeps plain origins unchanged", () => {
    expect(normalizeDevProxyTarget("http://localhost:8088")).toBe(
      "http://localhost:8088"
    );
  });

  it("keeps relative targets unchanged", () => {
    expect(normalizeDevProxyTarget("/api-config/api")).toBe("/api-config/api");
  });
});
