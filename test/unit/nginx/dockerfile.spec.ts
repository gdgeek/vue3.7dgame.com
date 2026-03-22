/**
 * Unit tests for Dockerfiles
 * Validates that all three Dockerfiles use:
 * - Official nginx envsubst for nginx.conf.template
 * - NGINX_ENVSUBST_FILTER=APP_ to protect nginx built-in variables
 * - No legacy env-config.js or docker-envsubst.sh references
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
  it("copies nginx.conf.template to official templates directory", () => {
    expect(get()).toContain("nginx.conf.template");
    expect(get()).toContain("/etc/nginx/templates/");
  });

  it("sets NGINX_ENVSUBST_FILTER=APP_", () => {
    expect(get()).toContain("NGINX_ENVSUBST_FILTER=APP_");
  });

  it("does not set NGINX_ENVSUBST_OUTPUT_DIR", () => {
    expect(get()).not.toContain("NGINX_ENVSUBST_OUTPUT_DIR");
  });

  it("does not reference old docker-entrypoint.sh", () => {
    expect(get()).not.toContain("docker-entrypoint.sh ");
  });

  it("does not reference env-config.js.template", () => {
    expect(get()).not.toContain("env-config.js.template");
  });

  it("does not reference docker-envsubst.sh", () => {
    expect(get()).not.toContain("docker-envsubst.sh");
  });
});
