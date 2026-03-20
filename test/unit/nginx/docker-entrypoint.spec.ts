/**
 * Unit tests for docker-entrypoint.sh
 * Validates that old sed-based placeholder replacements are removed
 * and envsubst is used for Nginx config generation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

let entrypointScript: string;

beforeAll(() => {
  entrypointScript = readFileSync(
    resolve(__dirname, "../../../docker-entrypoint.sh"),
    "utf-8"
  );
});

describe("docker-entrypoint.sh — no legacy sed replacements", () => {
  it("does not contain {scheme} sed replacement", () => {
    expect(entrypointScript).not.toContain("{scheme}");
  });

  it("does not contain {domain} sed replacement", () => {
    expect(entrypointScript).not.toContain("{domain}");
  });
});

describe("docker-entrypoint.sh — envsubst usage", () => {
  it("contains envsubst command", () => {
    expect(entrypointScript).toContain("envsubst");
  });
});
