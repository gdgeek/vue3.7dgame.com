/**
 * Unit tests for Dockerfiles
 * Validates that all three Dockerfiles use:
 * - Official nginx envsubst for nginx.conf.template
 * - Custom entrypoint script (docker-envsubst.sh) for env-config.js.template
 *   (separated to avoid NGINX_ENVSUBST_OUTPUT_DIR conflict)
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

  it("copies env-config.js.template to /etc/nginx/ (not templates/)", () => {
    expect(get()).toContain("env-config.js.template");
    expect(get()).toContain("/etc/nginx/env-config.js.template");
  });

  it("uses custom entrypoint script numbered before nginx's 20-envsubst", () => {
    expect(get()).toContain("docker-envsubst.sh");
    expect(get()).toContain("/docker-entrypoint.d/15-envsubst-env-config.sh");
    expect(get()).toContain("chmod +x");
  });

  it("does not reference old docker-entrypoint.sh", () => {
    // The old custom entrypoint.sh is removed; only docker-envsubst.sh is used
    expect(get()).not.toContain("docker-entrypoint.sh ");
  });

  it("sets NGINX_ENVSUBST_FILTER=APP_", () => {
    expect(get()).toContain("NGINX_ENVSUBST_FILTER=APP_");
  });

  it("does not set NGINX_ENVSUBST_OUTPUT_DIR", () => {
    // Removed to let nginx envsubst output to default /etc/nginx/conf.d/
    expect(get()).not.toContain("NGINX_ENVSUBST_OUTPUT_DIR");
  });
});
