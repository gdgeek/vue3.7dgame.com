/**
 * Unit tests for Dockerfiles
 * Validates that all three Dockerfiles use the official nginx envsubst
 * template mechanism with env-config.js.template for runtime config.
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

  it("copies env-config.js.template to official templates directory", () => {
    expect(get()).toContain("env-config.js.template");
    expect(get()).toContain("/etc/nginx/templates/env-config.js.template");
  });

  it("does not reference docker-entrypoint.sh", () => {
    expect(get()).not.toContain("docker-entrypoint.sh");
    expect(get()).not.toContain("/docker-entrypoint.d/");
  });

  it("sets NGINX_ENVSUBST_FILTER=APP_", () => {
    expect(get()).toContain("NGINX_ENVSUBST_FILTER=APP_");
  });

  it("sets NGINX_ENVSUBST_OUTPUT_DIR for env-config.js output", () => {
    expect(get()).toContain("NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html");
  });
});
