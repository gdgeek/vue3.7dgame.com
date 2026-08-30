import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDomainManifest,
  DOMAIN_MANIFEST_MAX_BYTES,
  DOMAIN_MANIFEST_MAX_DOMAINS,
  readDomainManifest,
  resolveWhiteLabelConfig,
  serializeDomainManifest,
  serializeWhiteLabelNginxMap,
  type DomainConfigSourceFile,
} from "../../../build/vite-plugin-domain-manifest";

const repositoryRoot = process.cwd();

function configSource(
  name: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    name,
    default_config: {},
    configs: {},
    ...overrides,
  });
}

function localizedConfig(
  domain: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    title: `${domain} title`,
    description: `${domain} localized description`,
    keywords: "AR, XR",
    author: "XRUGC",
    links: [],
    ...overrides,
  };
}

describe("domain manifest pure builder", () => {
  it("sorts entries and inlines the allowlisted config deterministically", () => {
    const manifest = createDomainManifest([
      {
        fileName: "z.example.json",
        source: configSource("z.example", {
          homepage: "https://z.example/",
        }),
      },
      {
        fileName: "a.example.json",
        source: configSource("a.example"),
      },
      {
        fileName: "manifest.json",
        source: JSON.stringify({ schemaVersion: 999 }),
      },
      { fileName: "notes.txt", source: "ignored" },
    ]);

    expect(manifest).toEqual({
      schemaVersion: 2,
      domains: [
        expect.objectContaining({
          configKey: "a.example",
        }),
        expect.objectContaining({
          configKey: "z.example",
          config: expect.objectContaining({
            homepage: "https://z.example/",
          }),
        }),
      ],
    });
    expect(manifest).not.toHaveProperty("generatedAt");
  });

  it.each([
    ["name", 1, 'field "name" must be a string'],
    ["homepage", 1, 'field "homepage" must be a string'],
    ["default_config", [], 'field "default_config" must be an object'],
    ["configs", [], 'field "configs" must be an object'],
  ])("rejects an invalid %s top-level field", (field, value, message) => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", { [field]: value }),
        },
      ])
    ).toThrow(message);
  });

  it("rejects localized configs that are not objects", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: { "zh-CN": "not-an-object" },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN" must be an object');
  });

  it("rejects fields outside the public manifest allowlist", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", { future_field: true }),
        },
      ])
    ).toThrow('field "$.future_field" is not public');

    for (const removedField of [
      "description",
      "is_active",
      "fallback_domain",
    ]) {
      expect(() =>
        createDomainManifest([
          {
            fileName: "example.com.json",
            source: configSource("example.com", { [removedField]: true }),
          },
        ])
      ).toThrow(`field "$.${removedField}" is not public`);
    }

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            default_config: { secret: "not-public" },
          }),
        },
      ])
    ).toThrow('field "default_config.secret" is not public');

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            default_config: { homepage: "https://example.com/" },
          }),
        },
      ])
    ).toThrow('field "default_config.homepage" is not public');

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: {
              "zh-CN": localizedConfig("example.com", { internal: true }),
            },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN.internal" is not public');

    for (const removedField of ["domain", "homepage"]) {
      expect(() =>
        createDomainManifest([
          {
            fileName: "example.com.json",
            source: configSource("example.com", {
              configs: {
                "zh-CN": localizedConfig("example.com", {
                  [removedField]: "https://example.com/",
                }),
              },
            }),
          },
        ])
      ).toThrow(`field "configs.zh-CN.${removedField}" is not public`);
    }

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: {
              "zh-CN": localizedConfig("example.com", {
                links: [{ name: "Example", url: "#", token: "hidden" }],
              }),
            },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN.links[0].token" is not public');
  });

  it("rejects unsupported locales, incomplete localized configs, and sensitive values", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: { "fr-FR": localizedConfig("example.com") },
          }),
        },
      ])
    ).toThrow('field "configs.fr-FR" uses an unsupported locale');

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: { "zh-CN": { title: "Incomplete" } },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN.author" must be a string');

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: {
              "zh-CN": localizedConfig("example.com", {
                description: "api_key=should-not-be-public",
              }),
            },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN.description" contains a sensitive value');

    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            homepage: "https://user:password@example.com/",
          }),
        },
      ])
    ).toThrow('field "homepage" must not contain URL credentials');
  });

  it("rejects filename/config-name drift, duplicate keys, malformed JSON, and empty input", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "file-key.json",
          source: configSource("different-key"),
        },
      ])
    ).toThrow("must exactly match config.name");

    const duplicate: DomainConfigSourceFile = {
      fileName: "same-key.json",
      source: configSource("same-key"),
    };
    expect(() => createDomainManifest([duplicate, duplicate])).toThrow(
      'duplicate config key "same-key"'
    );
    expect(() =>
      createDomainManifest([{ fileName: "broken.json", source: "{" }])
    ).toThrow("cannot parse JSON");
    expect(() =>
      createDomainManifest([{ fileName: "array.json", source: "[]" }])
    ).toThrow("top-level value must be an object");
    expect(() => createDomainManifest([])).toThrow(
      "no domain JSON files found"
    );
  });

  it("rejects invalid configuration keys and non-finite nested numbers", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "Bad_Name.json",
          source: configSource("Bad_Name"),
        },
      ])
    ).toThrow("lowercase domain configuration key");

    expect(() =>
      createDomainManifest([
        {
          fileName: "numbers.example.json",
          source: configSource("numbers.example", {
            default_config: { nested: { unsafe: "__NON_FINITE__" } },
          }).replace('"__NON_FINITE__"', "1e400"),
        },
      ])
    ).toThrow("finite JSON number");
  });

  it("enforces the shared manifest count and serialized byte limits", () => {
    const tooMany = Array.from(
      { length: DOMAIN_MANIFEST_MAX_DOMAINS + 1 },
      (_, index) => ({
        fileName: `domain-${index}.example.json`,
        source: configSource(`domain-${index}.example`),
      })
    );
    expect(() => createDomainManifest(tooMany)).toThrow(
      `at most ${DOMAIN_MANIFEST_MAX_DOMAINS}`
    );

    const oversized = createDomainManifest([
      {
        fileName: "large.example.json",
        source: configSource("large.example", {
          homepage: "x".repeat(DOMAIN_MANIFEST_MAX_BYTES),
        }),
      },
    ]);
    expect(() => serializeDomainManifest(oversized)).toThrow(
      `maximum is ${DOMAIN_MANIFEST_MAX_BYTES}`
    );
  });
});

describe("checked-in domain catalog contract", () => {
  it("contains every domain JSON exactly once and in key order", () => {
    const directory = resolve(repositoryRoot, "public/config/domains");
    const expectedKeys = readdirSync(directory)
      .filter(
        (fileName) =>
          fileName !== "manifest.json" && extname(fileName) === ".json"
      )
      .map((fileName) => basename(fileName, ".json"))
      .sort();
    const manifest = readDomainManifest(repositoryRoot);

    expect(manifest.domains.map((domain) => domain.configKey)).toEqual(
      expectedKeys
    );
    for (const entry of manifest.domains) {
      const raw = JSON.parse(
        readFileSync(resolve(directory, `${entry.configKey}.json`), "utf8")
      );
      expect(entry.config).toEqual(raw);
      expect(entry.config.name).toBe(entry.configKey);
    }
  });

  it("resolves the full host before progressively broader parent domains", () => {
    const manifest = createDomainManifest([
      { fileName: "default.json", source: configSource("default") },
      { fileName: "xrugc.com.json", source: configSource("xrugc.com") },
      {
        fileName: "dev.xrugc.com.json",
        source: configSource("dev.xrugc.com"),
      },
      {
        fileName: "d.dev.xrugc.com.json",
        source: configSource("d.dev.xrugc.com"),
      },
      {
        fileName: "bujiaban.com.json",
        source: configSource("bujiaban.com"),
      },
      {
        fileName: "ar-creator.cn.json",
        source: configSource("ar-creator.cn"),
      },
    ]);

    expect(resolveWhiteLabelConfig(manifest, "d.dev.xrugc.com")?.name).toBe(
      "d.dev.xrugc.com"
    );
    expect(
      resolveWhiteLabelConfig(manifest, "foo.dev.xrugc.com:3000")?.name
    ).toBe("dev.xrugc.com");
    expect(resolveWhiteLabelConfig(manifest, "www.bujiaban.com")?.name).toBe(
      "bujiaban.com"
    );
    expect(resolveWhiteLabelConfig(manifest, "D.AR-CREATOR.CN.")?.name).toBe(
      "ar-creator.cn"
    );
    expect(resolveWhiteLabelConfig(manifest, "unknown.example")?.name).toBe(
      "default"
    );
  });

  it("falls back from a missing full host to the nearest checked-in parent", () => {
    const withoutExactHost = createDomainManifest([
      { fileName: "default.json", source: configSource("default") },
      { fileName: "xrugc.com.json", source: configSource("xrugc.com") },
      {
        fileName: "dev.xrugc.com.json",
        source: configSource("dev.xrugc.com"),
      },
    ]);
    expect(
      resolveWhiteLabelConfig(withoutExactHost, "d.dev.xrugc.com")?.name
    ).toBe("dev.xrugc.com");

    const withoutTwoSpecificHosts = createDomainManifest([
      { fileName: "default.json", source: configSource("default") },
      { fileName: "xrugc.com.json", source: configSource("xrugc.com") },
    ]);
    expect(
      resolveWhiteLabelConfig(withoutTwoSpecificHosts, "d.dev.xrugc.com")?.name
    ).toBe("xrugc.com");
  });

  it("generates an Nginx longest-hostname map from every domain JSON", () => {
    const manifest = readDomainManifest(repositoryRoot);
    const nginxMap = serializeWhiteLabelNginxMap(manifest);

    expect(nginxMap).toContain("map $host $white_label_config_uri {");
    expect(nginxMap).toContain("    hostnames;");
    expect(nginxMap).toContain("    default /config/domains/default.json;");
    expect(nginxMap).toContain(
      "    .dev.xrugc.com /config/domains/dev.xrugc.com.json;"
    );
    expect(nginxMap).toContain(
      "    .xrugc.com /config/domains/xrugc.com.json;"
    );
    expect(nginxMap).not.toContain(".default ");
  });
});
