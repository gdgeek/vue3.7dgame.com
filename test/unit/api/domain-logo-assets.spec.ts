import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const domainConfigDirectory = path.resolve(
  process.cwd(),
  "public/config/domains"
);

const domainConfigFiles = readdirSync(domainConfigDirectory).filter((file) =>
  file.endsWith(".json")
);

describe("domain logo assets", () => {
  it.each(domainConfigFiles)(
    "%s keeps its logo beside the domain config",
    (configFile) => {
      const config = JSON.parse(
        readFileSync(path.join(domainConfigDirectory, configFile), "utf8")
      ) as { default_config?: { icon?: unknown } };
      const icon = config.default_config?.icon;

      if (typeof icon !== "string" || icon.length === 0) {
        return;
      }

      expect(icon).toMatch(/^\/config\/domains\/[^/]+$/);
      expect(
        existsSync(path.join(domainConfigDirectory, path.basename(icon)))
      ).toBe(true);
    }
  );
});
