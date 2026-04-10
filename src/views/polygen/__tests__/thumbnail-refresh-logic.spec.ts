import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const polygenIndexSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/views/polygen/index.vue"),
  "utf-8"
);

describe("polygen thumbnail refresh logic", () => {
  it("only refreshes when a resource has no thumbnail url", () => {
    expect(polygenIndexSource).toContain("const needsThumbnailRefresh = (resource: ResourceInfo | null) => {");
    expect(polygenIndexSource).toContain("return !imageUrl;");
    expect(polygenIndexSource).not.toContain("hasLegacyThumbnail");
    expect(polygenIndexSource).not.toContain("/\\.(jpe?g)(\\?|$)/i");
  });
});
