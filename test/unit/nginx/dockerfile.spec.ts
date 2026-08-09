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

const NODE_24_ALPINE_PATTERN =
  /^FROM (node:24-alpine@sha256:[a-f0-9]{64}) AS build$/m;
const NGINX_ALPINE_PATTERN = /^FROM (nginx:alpine@sha256:[a-f0-9]{64})$/m;

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
  it("pins every base image to a digest", () => {
    expect(get()).toMatch(NODE_24_ALPINE_PATTERN);
    expect(get()).toMatch(NGINX_ALPINE_PATTERN);

    const fromLines = get().match(/^FROM .+$/gm) ?? [];
    expect(fromLines.length).toBeGreaterThan(0);
    for (const fromLine of fromLines) {
      expect(fromLine).toMatch(/@sha256:[a-f0-9]{64}(?:\s|$)/);
    }
  });

  it("copies nginx.conf.template to official templates directory", () => {
    expect(get()).toContain("nginx.conf.template");
    expect(get()).toContain("/etc/nginx/templates/");
  });

  it("includes docker-entrypoint.sh for dynamic API failover config", () => {
    expect(get()).toContain("docker-entrypoint.sh");
    expect(get()).toContain("ENTRYPOINT");
  });

  it("uses the shared generated Nginx configuration chain", () => {
    expect(get()).toContain(
      "COPY nginx.conf.template /etc/nginx/templates/default.conf.template"
    );
    expect(get()).toContain("COPY docker-entrypoint.sh /docker-entrypoint.sh");
    expect(get()).toContain('ENTRYPOINT ["/docker-entrypoint.sh"]');
  });

  it("does not set NGINX_ENVSUBST_FILTER (handled by entrypoint)", () => {
    expect(get()).not.toContain("NGINX_ENVSUBST_FILTER");
  });

  it("does not set NGINX_ENVSUBST_OUTPUT_DIR", () => {
    expect(get()).not.toContain("NGINX_ENVSUBST_OUTPUT_DIR");
  });

  it("does not reference env-config.js.template", () => {
    expect(get()).not.toContain("env-config.js.template");
  });

  it("does not reference docker-envsubst.sh", () => {
    expect(get()).not.toContain("docker-envsubst.sh");
  });
});

describe("Docker production dependency install", () => {
  const buildDockerfiles = [
    { name: "Dockerfile (root)", get: () => rootDockerfile },
    { name: "docker/production/Dockerfile", get: () => productionDockerfile },
    { name: "docker/staging/Dockerfile", get: () => stagingDockerfile },
  ];

  describe.each(buildDockerfiles)("$name", ({ get }) => {
    it("uses pnpm-lock.yaml for reproducible image builds", () => {
      expect(get()).toContain("COPY package.json pnpm-lock.yaml ./");
      expect(get()).toContain("corepack prepare pnpm@9.15.0 --activate");
      expect(get()).toContain("pnpm install --frozen-lockfile");
    });

    it("uses the Node 24 build baseline", () => {
      expect(get()).toMatch(NODE_24_ALPINE_PATTERN);
    });
  });
});

describe("Docker development image", () => {
  it("pins the root development stage to the Node 24 image index", () => {
    const buildImage = rootDockerfile.match(NODE_24_ALPINE_PATTERN)?.[1];
    expect(buildImage).toBeDefined();
    expect(rootDockerfile).toContain(`FROM ${buildImage} AS dev`);
  });
});

describe("Docker base image consistency", () => {
  it("uses one Node image index across every build entrypoint", () => {
    const nodeImages = dockerfiles.map(
      ({ get }) => get().match(NODE_24_ALPINE_PATTERN)?.[1]
    );
    expect(nodeImages.every(Boolean)).toBe(true);
    expect(new Set(nodeImages).size).toBe(1);
  });

  it("uses one nginx image index across every runtime entrypoint", () => {
    const nginxImages = dockerfiles.map(
      ({ get }) => get().match(NGINX_ALPINE_PATTERN)?.[1]
    );
    expect(nginxImages.every(Boolean)).toBe(true);
    expect(new Set(nginxImages).size).toBe(1);
  });
});
