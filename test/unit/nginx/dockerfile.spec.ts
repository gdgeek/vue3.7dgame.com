/**
 * Unit tests for Dockerfiles
 * Validates that all three Dockerfiles contain nginx.conf.template
 * and entrypoint related directives.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

let rootDockerfile: string;
let productionDockerfile: string;
let stagingDockerfile: string;

beforeAll(() => {
  rootDockerfile = readFileSync(
    resolve(__dirname, "../../../Dockerfile"),
    "utf-8"
  );
  productionDockerfile = readFileSync(
    resolve(__dirname, "../../../docker/production/Dockerfile"),
    "utf-8"
  );
  stagingDockerfile = readFileSync(
    resolve(__dirname, "../../../docker/staging/Dockerfile"),
    "utf-8"
  );
});

const dockerfiles = [
  { name: "Dockerfile (root)", get: () => rootDockerfile },
  { name: "docker/production/Dockerfile", get: () => productionDockerfile },
  { name: "docker/staging/Dockerfile", get: () => stagingDockerfile },
];

describe.each(dockerfiles)("$name", ({ get }) => {
  it("contains nginx.conf.template COPY directive", () => {
    expect(get()).toContain("nginx.conf.template");
  });

  it("contains docker-entrypoint.sh COPY directive", () => {
    expect(get()).toContain("docker-entrypoint.sh");
  });

  it("contains chmod +x for the entrypoint", () => {
    expect(get()).toMatch(/chmod\s+\+x.*entrypoint/);
  });

  it("contains ENTRYPOINT directive", () => {
    expect(get()).toMatch(/ENTRYPOINT\s+\[/);
  });
});
