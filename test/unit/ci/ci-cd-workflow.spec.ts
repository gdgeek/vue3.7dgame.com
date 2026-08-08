import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let workflow: string;

beforeAll(() => {
  workflow = readFileSync(
    resolve(__dirname, "../../../.github/workflows/ci-cd.yml"),
    "utf-8"
  );
});

describe("CI/CD release workflow", () => {
  it("uses the same Node 24 baseline as local and Docker builds", () => {
    expect(workflow).toContain('NODE_VERSION: "24"');
    expect(workflow).toContain("node-version: ${{ env.NODE_VERSION }}");
  });

  it("serializes release branch runs without cancelling an active publish", () => {
    expect(workflow).toContain(
      "group: ci-cd-${{ github.repository }}-${{ github.ref }}"
    );
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("builds publish pull requests before branch mutation", () => {
    expect(workflow).toContain("branches: [main, master, develop, publish]");
  });

  it("emits immutable SHA tags and exposes the pushed digest", () => {
    expect(workflow).toContain("type=sha,format=long,prefix=sha-");
    expect(workflow).toContain("digest: ${{ steps.build.outputs.digest }}");
    expect(workflow).toContain("id: build");
  });
});
