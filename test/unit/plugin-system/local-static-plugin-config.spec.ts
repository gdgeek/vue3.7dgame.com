import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type PluginConfig = {
  version: string;
  menuGroups: Array<{
    id: string;
    name: string;
    icon: string;
    order: number;
  }>;
  plugins: Array<{
    id: string;
    group: string;
    url: string;
    allowedOrigin?: string;
  }>;
};

function readJson(relativePath: string): PluginConfig {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), relativePath), "utf-8")
  ) as PluginConfig;
}

function readText(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf-8");
}

describe("local static plugin config", () => {
  it("keeps only the builtins menu group in public/config/plugins.json", () => {
    const config = readJson("public/config/plugins.json");

    expect(config.menuGroups.map((group) => group.id)).toEqual(["builtins"]);
    expect(config.menuGroups[0]).toEqual(
      expect.objectContaining({
        id: "builtins",
        name: "基础工具",
      })
    );
  });

  it("registers only built-in iframe plugins in public/config/plugins.json", () => {
    const config = readJson("public/config/plugins.json");

    expect(config.plugins.map((plugin) => plugin.id)).toEqual([
      "user-management",
      "system-admin",
    ]);
    expect(config.plugins[0].group).toBe("builtins");
    expect(config.plugins[1].group).toBe("builtins");
  });

  it("keeps only the builtins menu group in public/config/plugins.json.template", () => {
    const config = readJson("public/config/plugins.json.template");

    expect(config.menuGroups.map((group) => group.id)).toEqual(["builtins"]);
  });

  it("registers only built-in iframe plugins in public/config/plugins.json.template", () => {
    const config = readJson("public/config/plugins.json.template");

    expect(config.plugins.map((plugin) => plugin.id)).toEqual([
      "user-management",
      "system-admin",
    ]);
  });
});

describe("local static plugin docker env scope", () => {
  it("declares local iframe plugin env vars in Dockerfile", () => {
    const dockerfile = readText("Dockerfile");

    expect(dockerfile).toContain(
      "ENV PLUGIN_USER_MANAGEMENT_URL=http://localhost:3003"
    );
    expect(dockerfile).toContain(
      "ENV PLUGIN_SYSTEM_ADMIN_URL=http://localhost:3005"
    );
    expect(dockerfile).not.toContain("PLUGIN_AR_SLAM_LOCALIZATION_URL");
    expect(dockerfile).not.toContain("PLUGIN_AI_3D_GENERATOR_V3_URL");
  });

  it("declares local iframe plugin env vars in docker-compose.dev.yml", () => {
    const compose = readText("docker-compose.dev.yml");

    expect(compose).toContain(
      "- PLUGIN_USER_MANAGEMENT_URL=http://localhost:3003"
    );
    expect(compose).toContain(
      "- PLUGIN_SYSTEM_ADMIN_URL=http://localhost:3005"
    );
    expect(compose).not.toContain("PLUGIN_AR_SLAM_LOCALIZATION_URL");
    expect(compose).not.toContain("PLUGIN_AI_3D_GENERATOR_V3_URL");
  });

  it("declares local iframe plugin env vars in docker-compose.prod.yml", () => {
    const compose = readText("docker-compose.prod.yml");

    expect(compose).toContain(
      "- PLUGIN_USER_MANAGEMENT_URL=http://localhost:3003"
    );
    expect(compose).toContain(
      "- PLUGIN_SYSTEM_ADMIN_URL=http://localhost:3005"
    );
    expect(compose).not.toContain("PLUGIN_AR_SLAM_LOCALIZATION_URL");
    expect(compose).not.toContain("PLUGIN_AI_3D_GENERATOR_V3_URL");
  });

  it("substitutes local iframe plugin urls in docker-entrypoint.sh", () => {
    const entrypoint = readText("docker-entrypoint.sh");

    expect(entrypoint).toContain("PLUGIN_USER_MANAGEMENT_URL");
    expect(entrypoint).toContain("PLUGIN_SYSTEM_ADMIN_URL");
    expect(entrypoint).not.toContain("PLUGIN_AR_SLAM_LOCALIZATION_URL");
    expect(entrypoint).not.toContain("PLUGIN_AI_3D_GENERATOR_V3_URL");
  });
});
