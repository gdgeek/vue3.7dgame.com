/**
 * Unit tests for docker-compose.prod.yml
 * Validates environment variables, port mapping, healthcheck, and restart policy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

let composeConfig: string;

beforeAll(() => {
  composeConfig = readFileSync(
    resolve(__dirname, "../../../docker-compose.prod.yml"),
    "utf-8"
  );
});

describe("docker-compose.prod.yml — environment variables", () => {
  it("contains APP_API_URL", () => {
    expect(composeConfig).toContain("APP_API_URL=");
  });

  it("contains APP_BACKUP_API_URL", () => {
    expect(composeConfig).toContain("APP_BACKUP_API_URL=");
  });

  it("contains APP_DOMAIN_INFO_API_URL", () => {
    expect(composeConfig).toContain("APP_DOMAIN_INFO_API_URL=");
  });

  it("contains APP_BACKUP_DOMAIN_INFO_API_URL", () => {
    expect(composeConfig).toContain("APP_BACKUP_DOMAIN_INFO_API_URL=");
  });
});

describe("docker-compose.prod.yml — port mapping", () => {
  it('contains port mapping "80:80"', () => {
    expect(composeConfig).toContain('"80:80"');
  });
});

describe("docker-compose.prod.yml — healthcheck", () => {
  it("contains healthcheck configuration", () => {
    expect(composeConfig).toContain("healthcheck:");
  });

  it("healthcheck uses curl", () => {
    expect(composeConfig).toContain("curl");
  });

  it("healthcheck has interval", () => {
    expect(composeConfig).toContain("interval:");
  });

  it("healthcheck has timeout", () => {
    expect(composeConfig).toContain("timeout:");
  });

  it("healthcheck has retries", () => {
    expect(composeConfig).toContain("retries:");
  });
});

describe("docker-compose.prod.yml — restart policy", () => {
  it("contains restart: unless-stopped", () => {
    expect(composeConfig).toContain("restart: unless-stopped");
  });
});
